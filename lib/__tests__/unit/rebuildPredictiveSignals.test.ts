import test from "node:test";
import assert from "node:assert/strict";

import type { ListingDomain } from "../../rebuild/data/listingMapper";
import { computePredictiveSignals } from "../../rebuild/signals/predictiveSignals";
import { deriveTrustAssessment } from "../../rebuild/trust/trustAssessment";

const BASE_TRUST: ListingDomain["trust"] = {
  confidence: { weight: 0.8, label: "high", display: "80 / 100" },
  source: "EBAY",
  fetchedAtISO: "2026-01-01T00:00:00Z",
  dataAgeLabel: "5m",
};
const BASE_FRESHNESS: ListingDomain["freshness"] = {
  fetchedAtISO: "2026-01-01T00:00:00Z",
  dataAgeLabel: "5m",
  dataAgeSeconds: 300,
};
const BASE_RELIABILITY: ListingDomain["reliability"] = {
  integrityStatus: "OK",
  integrityReason: null,
  shippingKnown: true,
};
const BASE_RISK_FLAGS: ListingDomain["riskFlags"] = [];
const BASE_TRUST_ASSESSMENT = deriveTrustAssessment({
  trust: BASE_TRUST,
  freshness: BASE_FRESHNESS,
  reliability: BASE_RELIABILITY,
  riskFlags: BASE_RISK_FLAGS,
});

const BASE_LISTING: ListingDomain = {
  listingId: "listing-1",
  title: "Sample Listing",
  url: "https://example.com/item/1",
  price: {
    amount: 100,
    currency: "USD",
    totalCad: 130,
    totalUsd: 100,
    totalNative: 100,
    discountPercent: -20,
    display: "100.00 USD",
    deltaDisplay: "-20%",
  },
  seller: {
    name: "Sample Seller",
    username: "sample-seller",
    feedbackCount: 42,
    positivePercent: 99,
  },
  language: "EN",
  condition: "NM",
  setName: "Evolving Skies",
  availability: "In stock",
  provenance: {
    source: "EBAY",
    listingId: "listing-1",
    market: "EBAY_US",
    fetchedAtISO: "2026-01-01T00:00:00Z",
    snapshotAtISO: "2026-01-01T00:00:00Z",
    ingestedAtISO: "2026-01-01T00:00:00Z",
    updatedAtISO: "2026-01-01T00:00:00Z",
  },
  trust: BASE_TRUST,
  trustAssessment: BASE_TRUST_ASSESSMENT,
  freshness: BASE_FRESHNESS,
  reliability: BASE_RELIABILITY,
  transparency: {
    sources: ["EBAY"],
    computedAtISO: "2026-01-01T00:00:00Z",
    inputs: ["Listings totals + currency from listings."],
    pipelineVersion: "rebuild-db-v1",
  },
  riskFlags: BASE_RISK_FLAGS,
};

type ListingOverrides = Omit<
  Partial<ListingDomain>,
  | "price"
  | "seller"
  | "provenance"
  | "trust"
  | "freshness"
  | "reliability"
  | "transparency"
  | "riskFlags"
> & {
  price?: Partial<ListingDomain["price"]>;
  seller?: Partial<ListingDomain["seller"]>;
  provenance?: Partial<ListingDomain["provenance"]>;
  trust?: Omit<Partial<ListingDomain["trust"]>, "confidence"> & {
    confidence?: Partial<ListingDomain["trust"]["confidence"]>;
  };
  freshness?: Partial<ListingDomain["freshness"]>;
  reliability?: Partial<ListingDomain["reliability"]>;
  transparency?: Partial<ListingDomain["transparency"]>;
  riskFlags?: ListingDomain["riskFlags"];
};

function buildListing(overrides: ListingOverrides = {}): ListingDomain {
  const listingId = overrides.listingId ?? BASE_LISTING.listingId;
  const provenanceOverride = overrides.provenance ?? {};
  const provenance = {
    ...BASE_LISTING.provenance,
    ...provenanceOverride,
    listingId: provenanceOverride.listingId ?? listingId,
  };
  const trust = {
    ...BASE_LISTING.trust,
    ...(overrides.trust ?? {}),
    confidence: {
      ...BASE_LISTING.trust.confidence,
      ...(overrides.trust?.confidence ?? {}),
    },
  };
  const freshness = {
    ...BASE_LISTING.freshness,
    ...(overrides.freshness ?? {}),
  };
  const reliability = {
    ...BASE_LISTING.reliability,
    ...(overrides.reliability ?? {}),
  };
  const riskFlags = overrides.riskFlags ?? BASE_LISTING.riskFlags;
  const trustAssessment = deriveTrustAssessment({
    trust,
    freshness,
    reliability,
    riskFlags,
  });

  return {
    ...BASE_LISTING,
    ...overrides,
    listingId,
    price: { ...BASE_LISTING.price, ...(overrides.price ?? {}) },
    seller: { ...BASE_LISTING.seller, ...(overrides.seller ?? {}) },
    provenance,
    trust,
    trustAssessment,
    freshness,
    reliability,
    transparency: {
      ...BASE_LISTING.transparency,
      ...(overrides.transparency ?? {}),
    },
    riskFlags,
  };
}

test("computePredictiveSignals returns stable score and label", () => {
  const result = computePredictiveSignals(BASE_LISTING);

  assert.equal(result.score, 84);
  assert.equal(result.label, "High likelihood undervalued");
});

test("computePredictiveSignals falls back when required inputs are missing", () => {
  const listing = buildListing({
    price: { discountPercent: null },
    trust: { confidence: { weight: null } },
    freshness: { dataAgeSeconds: null, dataAgeLabel: "unknown" },
  });

  const result = computePredictiveSignals(listing);

  assert.equal(result.label, "Insufficient data");
  assert.equal(result.score, 0);
  assert.ok(result.reasons.length > 0);
});

test("computePredictiveSignals returns deterministic reasons", () => {
  const listing = buildListing({
    price: { discountPercent: -5 },
    trust: { confidence: { weight: 0.55 } },
    freshness: { dataAgeSeconds: 1800, dataAgeLabel: "30m" },
  });

  const result = computePredictiveSignals(listing);

  assert.ok(result.reasons.length >= 2);
  assert.ok(result.reasons.join(" ").includes("Confidence"));
});
