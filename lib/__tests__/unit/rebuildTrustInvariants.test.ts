import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  TRUST_FRESHNESS_SLO_SECONDS,
  deriveTrustAssessment,
  evaluateTrustInvariants,
} from "../../rebuild/trust/trustAssessment";
import {
  DbListingRow,
  mapDbRowToListingDomain,
} from "../../rebuild/data/listingMapper";

const BASE_ROW: DbListingRow = {
  card_id: 1,
  card_language: "EN",
  set_name: "Evolving Skies",
  listing_id: "v1|1234567890|0",
  title: "Example listing",
  url: "https://example.com/listing",
  total_price_cad: "150.00",
  total_usd: "110.00",
  total_native: "110.00",
  currency: "USD",
  price_native: "99.00",
  discount_percent: "-12.5",
  condition_raw: "NM",
  shipping_known: true,
  seller: "Example Seller",
  seller_username: "example-seller",
  seller_feedback_count: 42,
  seller_positive_percent: "99.5",
  source: "EBAY",
  market: "EBAY_US",
  deal_confidence_weight: "0.85",
  integrity_status: "OK",
  integrity_reason: null,
  snapshot_at: new Date("2026-01-01T00:00:00Z"),
  ingested_at: new Date("2026-01-01T00:00:00Z"),
  updated_at: new Date("2026-01-01T00:00:00Z"),
  created_at: new Date("2026-01-01T00:00:00Z"),
};

function buildListing(rowOverrides: Partial<DbListingRow>, now: Date) {
  const row: DbListingRow = { ...BASE_ROW, ...rowOverrides };
  return mapDbRowToListingDomain(row, now);
}

test("deriveTrustAssessment returns VERIFIED when data is fresh", () => {
  const now = new Date("2026-01-01T00:05:00Z");
  const listing = buildListing({}, now);
  const assessment = deriveTrustAssessment(listing);

  assert.equal(assessment.state, "VERIFIED");
  assert.equal(assessment.freshness, "fresh");
  assert.equal(assessment.disclosures.length, 0);
});

test("deriveTrustAssessment marks missing confidence as INSUFFICIENT", () => {
  const now = new Date("2026-01-01T00:05:00Z");
  const listing = buildListing({ deal_confidence_weight: null }, now);
  const assessment = deriveTrustAssessment(listing);

  assert.equal(assessment.state, "INSUFFICIENT");
  assert.ok(assessment.disclosures.includes("MISSING_CONFIDENCE_WEIGHT"));
});

test("deriveTrustAssessment marks stale data as DEGRADED", () => {
  const now = new Date("2026-01-01T02:00:00Z");
  const listing = buildListing({}, now);
  const assessment = deriveTrustAssessment(listing);

  assert.equal(assessment.freshness, "stale");
  assert.equal(assessment.state, "DEGRADED");
  assert.ok(assessment.disclosures.includes("STALE_DATA"));
  assert.ok(listing.freshness.dataAgeSeconds != null);
  assert.ok(listing.freshness.dataAgeSeconds > TRUST_FRESHNESS_SLO_SECONDS);
});

test("evaluateTrustInvariants flags confidence label drift", () => {
  const now = new Date("2026-01-01T00:05:00Z");
  const listing = buildListing({ deal_confidence_weight: null }, now);
  const assessment = deriveTrustAssessment(listing);

  const invalidListing: typeof listing = {
    ...listing,
    trust: {
      ...listing.trust,
      confidence: {
        ...listing.trust.confidence,
        label: "high",
      },
    },
  };

  const violations = evaluateTrustInvariants(invalidListing, assessment);
  assert.ok(violations.length > 0);
});

test("rebuild sources do not import legacy paths", () => {
  const root = process.cwd();
  const roots = [
    join(root, "app", "rebuild"),
    join(root, "components", "rebuild"),
    join(root, "lib", "rebuild"),
  ];
  const files = roots.flatMap((dir) => collectFiles(dir));
  const legacyImport = /from\s+["']@\/legacy\//;
  const legacyRelative = /from\s+["']\.\.\/.*legacy\//;

  const offenders = files.filter((file) => {
    const contents = readFileSync(file, "utf8");
    return legacyImport.test(contents) || legacyRelative.test(contents);
  });

  assert.deepEqual(offenders, []);
});

function collectFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\\.(ts|tsx)$/.test(entry.name)) continue;
    if (statSync(fullPath).size === 0) continue;
    files.push(fullPath);
  }

  return files;
}
