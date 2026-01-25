import test from "node:test";
import assert from "node:assert/strict";

import type { ListingDomain } from "../../rebuild/data/listingMapper";
import {
  dedupeDeals,
  normalizeListingKey,
} from "../../rebuild/dedupe/crossMarketDedupe";
import { deriveTrustAssessment } from "../../rebuild/trust/trustAssessment";

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
  trust?: Partial<ListingDomain["trust"]> & {
    confidence?: Partial<ListingDomain["trust"]["confidence"]>;
  };
  freshness?: Partial<ListingDomain["freshness"]>;
  reliability?: Partial<ListingDomain["reliability"]>;
  transparency?: Partial<ListingDomain["transparency"]>;
  riskFlags?: ListingDomain["riskFlags"];
};

const BASE_TRUST: ListingDomain["trust"] = {
  confidence: { weight: 0.8, label: "high", display: "80 / 100" },
  source: "EBAY",
  fetchedAtISO: "2026-01-01T00:00:00Z",
  dataAgeLabel: "0m",
};
const BASE_FRESHNESS: ListingDomain["freshness"] = {
  fetchedAtISO: "2026-01-01T00:00:00Z",
  dataAgeLabel: "0m",
  dataAgeSeconds: 0,
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
    discountPercent: -10,
    display: "100.00 USD",
    deltaDisplay: "-10%",
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

test("normalizeListingKey prefers listingId", () => {
  const listing = buildListing({
    listingId: "ebay-123",
    url: "https://Example.com/item/123?utm=1",
  });

  assert.equal(normalizeListingKey(listing), "listing:ebay-123");
});

test("normalizeListingKey falls back to normalized URL", () => {
  const listing = buildListing({
    listingId: " ",
    url: "https://Example.com/item/123/?utm=1#frag",
    provenance: { listingId: " " },
  });

  assert.equal(
    normalizeListingKey(listing),
    "url:https://example.com/item/123"
  );
});

test("normalizeListingKey falls back to composite key when needed", () => {
  const listing = buildListing({
    listingId: "",
    url: null,
    provenance: { listingId: "" },
    seller: { name: "Seller Alpha", username: null },
    title: "Base Set Charizard",
    price: { amount: 50, currency: "USD" },
  });

  const key = normalizeListingKey(listing);
  assert.ok(key.startsWith("fallback:"));
  assert.ok(key.includes("seller alpha"));
});

test("dedupeDeals collapses duplicate listings by key", () => {
  const first = buildListing({
    listingId: "dupe-1",
    provenance: { listingId: "dupe-1", market: "EBAY_US" },
  });
  const second = buildListing({
    listingId: "dupe-1",
    provenance: { listingId: "dupe-1", market: "EBAY_CA" },
    url: "https://example.com/item/1?loc=ca",
  });

  const { deduped, duplicates } = dedupeDeals([first, second]);
  const key = normalizeListingKey(first);

  assert.equal(deduped.length, 1);
  assert.equal(duplicates.get(key)?.length, 2);
});
