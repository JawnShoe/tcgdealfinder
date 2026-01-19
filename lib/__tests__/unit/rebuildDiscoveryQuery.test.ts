import test from "node:test";
import assert from "node:assert/strict";

import type { ListingDomain } from "@/lib/rebuild/data/listingMapper";
import {
  filterDealsByDiscoveryQuery,
  parseDiscoveryQuery,
  type DiscoveryQuery,
} from "@/lib/rebuild/discovery/discoveryQuery";

function makeDeal(overrides?: Partial<ListingDomain>): ListingDomain {
  return {
    listingId: "rebuild-e2e-1",
    title: "Test listing",
    url: "https://example.com/x",
    price: {
      amount: 100,
      currency: "CAD",
      totalCad: 100,
      totalUsd: null,
      totalNative: 100,
      discountPercent: 10,
      display: "100.00 CAD",
      deltaDisplay: "10%",
    },
    seller: {
      name: "Seller",
      username: "seller_user",
      feedbackCount: 100,
      positivePercent: 99.9,
    },
    condition: "NM",
    language: "EN",
    availability: "In stock",
    provenance: {
      source: "EBAY",
      listingId: "rebuild-e2e-1",
      market: "EBAY_CA",
      fetchedAtISO: "2026-01-01T00:00:00Z",
      snapshotAtISO: "2026-01-01T00:00:00Z",
      ingestedAtISO: "2026-01-01T00:00:00Z",
      updatedAtISO: "2026-01-01T00:00:00Z",
    },
    trust: {
      confidence: { weight: 0.9, label: "high", display: "90 / 100" },
      source: "EBAY",
      fetchedAtISO: "2026-01-01T00:00:00Z",
      dataAgeLabel: "0m",
    },
    trustAssessment: {
      state: "VERIFIED",
      freshness: "fresh",
      disclosures: [],
      reasons: [],
    },
    freshness: {
      fetchedAtISO: "2026-01-01T00:00:00Z",
      dataAgeLabel: "0m",
      dataAgeSeconds: 0,
    },
    reliability: {
      integrityStatus: "OK",
      integrityReason: null,
      shippingKnown: true,
    },
    transparency: {
      sources: ["EBAY", "EBAY_CA"],
      computedAtISO: "2026-01-01T00:00:00Z",
      inputs: ["deal_confidence_weight from listings."],
      pipelineVersion: "rebuild-db-v1",
    },
    riskFlags: [],
    ...overrides,
  };
}

function makeQuery(overrides?: Partial<DiscoveryQuery>): DiscoveryQuery {
  return {
    preset: "newest",
    filters: {
      priceMinCad: null,
      priceMaxCad: null,
      condition: null,
      language: null,
      minConfidence: "any",
      seller: null,
    },
    ...overrides,
  };
}

test("parseDiscoveryQuery defaults preset when missing", () => {
  const result = parseDiscoveryQuery({});
  assert.equal(result.kind, "ok");
  if (result.kind !== "ok") return;
  assert.equal(result.query.preset, "newest");
});

test("parseDiscoveryQuery rejects invalid preset", () => {
  const result = parseDiscoveryQuery({ sort: "not-a-preset" });
  assert.equal(result.kind, "invalid_preset");
});

test("parseDiscoveryQuery rejects invalid numeric filters", () => {
  const result = parseDiscoveryQuery({ minPriceCad: "10.5" });
  assert.equal(result.kind, "invalid_filters");
});

test("parseDiscoveryQuery rejects inverted price range", () => {
  const result = parseDiscoveryQuery({ minPriceCad: "200", maxPriceCad: "10" });
  assert.equal(result.kind, "invalid_filters");
});

test("filterDealsByDiscoveryQuery filters by min confidence threshold", () => {
  const deals = [
    makeDeal({
      listingId: "a",
      trust: {
        ...makeDeal().trust,
        confidence: { weight: 0.9, label: "high", display: "90 / 100" },
      },
    }),
    makeDeal({
      listingId: "b",
      trust: {
        ...makeDeal().trust,
        confidence: { weight: 0.6, label: "medium", display: "60 / 100" },
      },
    }),
    makeDeal({
      listingId: "c",
      trust: {
        ...makeDeal().trust,
        confidence: { weight: 0.4, label: "low", display: "40 / 100" },
      },
    }),
  ];

  const filtered = filterDealsByDiscoveryQuery(
    deals,
    makeQuery({ filters: { ...makeQuery().filters, minConfidence: "high" } })
  );
  assert.deepEqual(
    filtered.map((d) => d.listingId),
    ["a"]
  );
});

test("filterDealsByDiscoveryQuery filters by seller substring match", () => {
  const deals = [
    makeDeal({
      listingId: "a",
      seller: { ...makeDeal().seller, username: "alpha" },
    }),
    makeDeal({
      listingId: "b",
      seller: { ...makeDeal().seller, username: "beta" },
    }),
  ];

  const filtered = filterDealsByDiscoveryQuery(
    deals,
    makeQuery({ filters: { ...makeQuery().filters, seller: "alp" } })
  );
  assert.deepEqual(
    filtered.map((d) => d.listingId),
    ["a"]
  );
});
