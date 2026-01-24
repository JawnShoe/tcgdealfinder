import test from "node:test";
import assert from "node:assert/strict";

import type { ListingDomain } from "@/lib/rebuild/data/listingMapper";
import {
  computeDiscoveryFacets,
  filterDealsByDiscoveryQuery,
  orderDealsForDiscovery,
  parseDiscoveryQuery,
  paginateDiscoveryResults,
  type DiscoveryQuery,
} from "@/lib/rebuild/discovery/discoveryQuery";
import { toUsdCentsFromCadDollars } from "@/lib/rebuild/currency/cad";
import { toUsdCentsFromUsdDollars } from "@/lib/rebuild/currency/canonical";

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
    setName: "Evolving Skies",
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
    pagination: { page: 1, pageSize: 25 },
    ...overrides,
  };
}

test("parseDiscoveryQuery defaults preset when missing", () => {
  const result = parseDiscoveryQuery({});
  assert.equal(result.kind, "ok");
  if (result.kind !== "ok") return;
  assert.equal(result.query.preset, "newest");
  assert.equal(result.query.pagination.page, 1);
  assert.equal(result.query.pagination.pageSize, 25);
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

test("parseDiscoveryQuery normalizes invalid page and pageSize", () => {
  const result = parseDiscoveryQuery({ page: "0", pageSize: "0" });
  assert.equal(result.kind, "ok");
  if (result.kind !== "ok") return;
  assert.equal(result.query.pagination.page, 1);
  assert.equal(result.query.pagination.pageSize, 25);
});

test("parseDiscoveryQuery caps pageSize to max", () => {
  const result = parseDiscoveryQuery({ page: "2", pageSize: "999" });
  assert.equal(result.kind, "ok");
  if (result.kind !== "ok") return;
  assert.equal(result.query.pagination.page, 2);
  assert.equal(result.query.pagination.pageSize, 100);
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

test("filterDealsByDiscoveryQuery normalizes CAD price filters to USD internally", () => {
  const base = makeDeal();
  const deals = [
    {
      ...base,
      listingId: "a",
      price: {
        ...base.price,
        amount: 73,
        currency: "USD",
        totalUsd: 73,
        display: "73.00 USD",
      },
    },
    {
      ...base,
      listingId: "b",
      price: {
        ...base.price,
        amount: 75,
        currency: "USD",
        totalUsd: 75,
        display: "75.00 USD",
      },
    },
  ];

  const minCad = 100;
  const filtered = filterDealsByDiscoveryQuery(
    deals,
    makeQuery({
      filters: {
        ...makeQuery().filters,
        priceMinCad: minCad,
      },
    })
  );

  assert.equal(toUsdCentsFromCadDollars(minCad), 7400);
  assert.equal(toUsdCentsFromUsdDollars(73), 7300);
  assert.deepEqual(
    filtered.map((deal) => deal.listingId),
    ["b"]
  );
});

test("orderDealsForDiscovery adds deterministic tie-breakers for biggest-discount", () => {
  const base = makeDeal();
  const deals = [
    makeDeal({
      listingId: "b",
      price: { ...base.price, discountPercent: 10 },
      provenance: { ...base.provenance, updatedAtISO: "2026-01-01T00:00:00Z" },
    }),
    makeDeal({
      listingId: "a",
      price: { ...base.price, discountPercent: 10 },
      provenance: { ...base.provenance, updatedAtISO: "2026-01-02T00:00:00Z" },
    }),
    makeDeal({
      listingId: "c",
      price: { ...base.price, discountPercent: 20 },
      provenance: { ...base.provenance, updatedAtISO: "2026-01-01T00:00:00Z" },
    }),
  ];

  const ordered = orderDealsForDiscovery(deals, "biggest-discount");
  assert.deepEqual(
    ordered.map((deal) => deal.listingId),
    ["c", "a", "b"]
  );
});

test("computeDiscoveryFacets returns deterministic numeric counts", () => {
  const base = makeDeal();
  const deals = [
    makeDeal({ listingId: "a", condition: "NM", language: "EN" }),
    makeDeal({ listingId: "b", condition: "LP", language: "JP" }),
    makeDeal({ listingId: "c", condition: null, language: "UNKNOWN" }),
    makeDeal({
      listingId: "d",
      trust: {
        ...base.trust,
        confidence: { weight: 0.4, label: "low", display: "40 / 100" },
      },
    }),
  ];

  const facets = computeDiscoveryFacets(deals);
  assert.equal(facets.condition.NM, 2);
  assert.equal(facets.condition.LP, 1);
  assert.equal(facets.condition.unknown, 1);
  assert.equal(facets.language.EN, 2);
  assert.equal(facets.language.JP, 1);
  assert.equal(facets.language.UNKNOWN, 1);
  assert.deepEqual(facets.confidence, { high: 3, medium: 0, low: 1 });
});

test("paginateDiscoveryResults computes facets without altering items list", () => {
  const deals = [
    makeDeal({ listingId: "a", condition: "NM" }),
    makeDeal({ listingId: "b", condition: "LP" }),
  ];

  const result = paginateDiscoveryResults(deals, { page: 1, pageSize: 1 });
  assert.deepEqual(
    result.items.map((deal) => deal.listingId),
    ["a"]
  );
  assert.equal(result.totalCount, 2);
  assert.equal(result.facets.condition.NM, 1);
  assert.equal(result.facets.condition.LP, 1);
});
