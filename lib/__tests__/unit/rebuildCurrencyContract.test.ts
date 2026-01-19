import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { FX_CAD_TO_USD } from "@/lib/money";
import { toUsdCentsFromCadDollars } from "@/lib/rebuild/currency/cad";
import { toUsdCentsFromUsdDollars } from "@/lib/rebuild/currency/canonical";
import {
  mapDbRowToListingDomain,
  type DbListingRow,
} from "@/lib/rebuild/data/listingMapper";

test("toUsdCentsFromUsdDollars rounds deterministically", () => {
  assert.equal(toUsdCentsFromUsdDollars(1.004), 100);
  assert.equal(toUsdCentsFromUsdDollars(1.005), 101);
  assert.equal(toUsdCentsFromUsdDollars(12.345), 1235);
});

test("toUsdCentsFromCadDollars normalizes CAD input to canonical USD cents", () => {
  assert.equal(
    toUsdCentsFromCadDollars(100),
    Math.round(100 * FX_CAD_TO_USD * 100)
  );
});

test("mapDbRowToListingDomain derives USD totals from legacy CAD column", () => {
  const row: DbListingRow = {
    card_id: 1,
    card_language: "EN",
    listing_id: "listing-1",
    title: "Example listing",
    url: "https://example.com/listing",
    total_price_cad: "100.00",
    total_usd: null,
    total_native: null,
    currency: null,
    price_native: null,
    discount_percent: "-10",
    condition_raw: "NM",
    shipping_known: true,
    seller: "Example Seller",
    seller_username: "example-seller",
    seller_feedback_count: 42,
    seller_positive_percent: "99.5",
    source: "EBAY",
    market: "EBAY_CA",
    deal_confidence_weight: "0.85",
    integrity_status: "OK",
    integrity_reason: null,
    snapshot_at: new Date("2026-01-01T00:00:00Z"),
    ingested_at: new Date("2026-01-01T00:00:00Z"),
    updated_at: new Date("2026-01-01T00:00:00Z"),
    created_at: new Date("2026-01-01T00:00:00Z"),
  };

  const now = new Date("2026-01-01T00:05:00Z");
  const mapped = mapDbRowToListingDomain(row, now);

  assert.equal(mapped.price.totalCad, 100);
  assert.equal(
    mapped.price.totalUsd,
    Number(toUsdCentsFromCadDollars(100)) / 100
  );
  assert.equal(mapped.price.canonicalUsdCents, toUsdCentsFromCadDollars(100));
  assert.equal(mapped.price.deltaDisplay, "-10%");
});

test("tripwire: lib/rebuild/** must not contain CAD literals outside boundary modules", () => {
  const rebuildRoot = resolve(process.cwd(), "lib", "rebuild");
  const allowed = new Set([resolve(rebuildRoot, "currency", "cad.ts")]);

  const violations: string[] = [];

  const scanDir = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        scanDir(full);
        continue;
      }
      if (!full.endsWith(".ts")) continue;

      const resolved = resolve(full);
      if (allowed.has(resolved)) continue;

      const body = readFileSync(full, "utf8");
      if (body.includes("CAD")) {
        violations.push(resolved);
      }
    }
  };

  scanDir(rebuildRoot);

  assert.deepEqual(
    violations,
    [],
    `Found disallowed CAD literal usage in rebuild core:\n${violations.join("\n")}`
  );
});
