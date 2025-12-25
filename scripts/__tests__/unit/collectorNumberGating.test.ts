import test from "node:test";
import assert from "node:assert/strict";

import { decideCollectorNumberRejection } from "../update-listings";
import type { CollectorNumberResult } from "../../lib/collectorNumber";

const highCard: CollectorNumberResult = {
  raw: "215/203",
  norm: "215/203",
  confidence: "HIGH",
  signals: [],
};

test("collector number mismatch rejects with high confidence", () => {
  const listing: CollectorNumberResult = {
    raw: "999/999",
    norm: "999/999",
    confidence: "HIGH",
    signals: [],
  };
  const result = decideCollectorNumberRejection(highCard, listing);
  assert.equal(result.matchEligible, false);
  assert.equal(result.rejectReason, "collector_number_mismatch");
  assert.equal(result.rejectSource, "collector_number_check");
  assert.ok(result.rejectDetail?.includes("cardCN=215/203"));
});

test("low-confidence mismatch stays eligible", () => {
  const listing: CollectorNumberResult = {
    raw: "217",
    norm: "217",
    confidence: "LOW",
    signals: [],
  };
  const result = decideCollectorNumberRejection(highCard, listing);
  assert.equal(result.matchEligible, true);
  assert.equal(result.rejectReason, null);
});
