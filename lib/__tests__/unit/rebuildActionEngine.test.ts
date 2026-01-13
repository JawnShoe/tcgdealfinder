import test from "node:test";
import assert from "node:assert/strict";

import type { ListingDomain } from "@/lib/rebuild/data/listingMapper";
import {
  evaluatePriceThresholdAlert,
  evaluateSavedSearchAlert,
  evaluateTrustThresholdAlert,
} from "@/lib/rebuild/alerts/alerts";
import {
  parseRebuildActionPrefs,
  serializeRebuildActionPrefs,
} from "@/lib/rebuild/prefs/actionPrefs";

function buildListingDomain(): ListingDomain {
  return {
    listingId: "listing-1",
    title: "Charizard V",
    url: "https://example.com/listing/1",
    price: {
      amount: 100,
      currency: "USD",
      totalCad: 120,
      totalUsd: 100,
      totalNative: 100,
      discountPercent: 10,
      display: "100.00 USD",
      deltaDisplay: "10%",
    },
    seller: {
      name: "Card Shop",
      username: "cardshop",
      feedbackCount: 120,
      positivePercent: 99,
    },
    condition: "near-mint",
    availability: "In stock",
    provenance: {
      source: "rebuild",
      listingId: "listing-1",
      market: "ebay",
      fetchedAtISO: "2026-01-13T00:00:00.000Z",
      snapshotAtISO: null,
      ingestedAtISO: null,
      updatedAtISO: null,
    },
    trust: {
      confidence: {
        weight: 0.85,
        label: "high",
        display: "85 / 100",
      },
      source: "rebuild",
      fetchedAtISO: "2026-01-13T00:00:00.000Z",
      dataAgeLabel: "1m",
    },
    freshness: {
      fetchedAtISO: "2026-01-13T00:00:00.000Z",
      dataAgeLabel: "1m",
      dataAgeSeconds: 60,
    },
    reliability: {
      integrityStatus: "OK",
      integrityReason: null,
      shippingKnown: true,
    },
    transparency: {
      sources: ["rebuild"],
      computedAtISO: "2026-01-13T00:00:00.000Z",
      inputs: ["deal_confidence_weight from listings."],
      pipelineVersion: "rebuild-db-v1",
    },
    riskFlags: [],
  };
}

test("trust threshold alert enforces minimum confidence weight", () => {
  const listing = buildListingDomain();
  const blocked = evaluateTrustThresholdAlert(
    {
      type: "trust_threshold",
      listingId: listing.listingId,
      minConfidenceWeight: 0.9,
    },
    listing
  );

  assert.equal(blocked.shouldFire, false);
  assert.deepEqual(blocked.reasons, ["below_trust_threshold"]);

  const allowed = evaluateTrustThresholdAlert(
    {
      type: "trust_threshold",
      listingId: listing.listingId,
      minConfidenceWeight: 0.5,
    },
    listing
  );
  assert.equal(allowed.shouldFire, true);
});

test("price threshold alert blocks when listing data is stale", () => {
  const listing = buildListingDomain();
  listing.freshness.dataAgeSeconds = 60 * 60;

  const decision = evaluatePriceThresholdAlert(
    {
      type: "price_threshold",
      listingId: listing.listingId,
      maxPrice: 150,
      currency: "USD",
    },
    listing
  );

  assert.equal(decision.shouldFire, false);
  assert.ok(decision.reasons.includes("stale_data"));
});

test("saved search alert matches title and respects trust gate", () => {
  const listing = buildListingDomain();
  const matched = evaluateSavedSearchAlert(
    { type: "saved_search", query: "charizard" },
    [listing]
  );

  assert.equal(matched.shouldFire, true);

  listing.trust.confidence.weight = null;
  listing.trust.confidence.label = "unknown";
  const blocked = evaluateSavedSearchAlert(
    { type: "saved_search", query: "charizard" },
    [listing]
  );

  assert.equal(blocked.shouldFire, false);
  assert.ok(blocked.reasons.includes("missing_confidence"));
});

test("parseRebuildActionPrefs accepts URL param preferences", () => {
  const prefs = parseRebuildActionPrefs({
    budgetMax: "250",
    budgetCurrency: "usd",
    condition: "sealed",
    trustMinConfidence: "0.7",
  });

  assert.equal(prefs.budget.max, 250);
  assert.equal(prefs.budget.currency, "USD");
  assert.equal(prefs.condition, "sealed");
  assert.equal(prefs.trustMinConfidence, 0.7);

  const params = serializeRebuildActionPrefs(prefs);
  assert.equal(params.get("budgetMax"), "250");
  assert.equal(params.get("budgetCurrency"), "USD");
  assert.equal(params.get("condition"), "sealed");
  assert.equal(params.get("trustMinConfidence"), "0.7");
});
