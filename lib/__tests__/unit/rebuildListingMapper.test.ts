import test from "node:test";
import assert from "node:assert/strict";

import {
  DbListingRow,
  mapDbRowToListingDomain,
} from "../../rebuild/data/listingMapper";

test("mapDbRowToListingDomain maps DB row into rebuild domain model", () => {
  const row: DbListingRow = {
    card_id: 1,
    card_language: "EN",
    listing_id: "v1|1234567890|0",
    title: "Example listing",
    url: "https://example.com/listing",
    ends_at: new Date("2026-01-01T10:00:00Z"),
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

  const now = new Date("2026-01-01T00:05:00Z");
  const mapped = mapDbRowToListingDomain(row, now);

  assert.equal(mapped.listingId, row.listing_id);
  assert.equal(mapped.title, row.title);
  assert.equal(mapped.price.display, "110.00 USD");
  assert.equal(mapped.price.deltaDisplay, "-12.5%");
  assert.equal(mapped.endsAtISO, "2026-01-01T10:00:00.000Z");
  assert.equal(mapped.trust.source, "EBAY");
  assert.equal(mapped.trust.confidence.label, "high");
  assert.equal(mapped.trust.dataAgeLabel, "5m");
  assert.equal(mapped.trustAssessment.state, "VERIFIED");
  assert.equal(mapped.trustAssessment.disclosures.length, 0);
  assert.equal(mapped.transparency.pipelineVersion, "rebuild-db-v1");
  assert.ok(mapped.transparency.inputs.length >= 2);
  assert.equal(mapped.riskFlags.includes("MISSING_CONFIDENCE_WEIGHT"), false);
});
