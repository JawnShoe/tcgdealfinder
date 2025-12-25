import test from "node:test";
import assert from "node:assert/strict";

import {
  extractCollectorNumber,
  shouldRejectCollectorNumber,
  type CollectorNumberResult,
} from "../collectorNumber";

test("extractCollectorNumber handles fraction formats", () => {
  const result = extractCollectorNumber({
    title: "Umbreon VMAX 215/203 Secret Rare",
  });
  assert.equal(result.norm, "215/203");
  assert.equal(result.confidence, "HIGH");
});

test("extractCollectorNumber handles promo prefixes", () => {
  const result = extractCollectorNumber({
    title: "Pikachu SWSH050 Black Star Promo",
  });
  assert.equal(result.norm, "SWSH050");
  assert.equal(result.confidence, "HIGH");
});

test("extractCollectorNumber handles double-letter fractions", () => {
  const result = extractCollectorNumber({
    title: "Charizard GG41/GG70 Trainer Gallery",
  });
  assert.equal(result.norm, "GG41/GG70");
});

test("extractCollectorNumber handles suffix formats", () => {
  const result = extractCollectorNumber({
    title: "Eevee 123A Alt Art",
  });
  assert.equal(result.norm, "123A");
  assert.equal(result.confidence, "MED");
});

test("extractCollectorNumber ignores grading/years/quantities", () => {
  const none = extractCollectorNumber({
    title: "PSA 10 Charizard 1999 Base x4 Lot",
  });
  assert.equal(none.norm, null);
  assert.equal(none.confidence, "NONE");
});

test("collector number gating respects confidence thresholds", () => {
  const card: CollectorNumberResult = {
    raw: "215/203",
    norm: "215/203",
    confidence: "HIGH",
    signals: [],
  };
  const listingHigh: CollectorNumberResult = {
    raw: "999/999",
    norm: "999/999",
    confidence: "HIGH",
    signals: [],
  };
  const listingMed: CollectorNumberResult = {
    raw: "217/203",
    norm: "217/203",
    confidence: "MED",
    signals: [],
  };
  const listingLow: CollectorNumberResult = {
    raw: "217",
    norm: "217",
    confidence: "LOW",
    signals: [],
  };

  const rejectHigh = shouldRejectCollectorNumber(card, listingHigh);
  assert.equal(rejectHigh.reject, true);

  const rejectMed = shouldRejectCollectorNumber(card, listingMed);
  assert.equal(rejectMed.reject, true);

  const acceptLow = shouldRejectCollectorNumber(card, listingLow);
  assert.equal(acceptLow.reject, false);

  const match = shouldRejectCollectorNumber(card, card);
  assert.equal(match.reject, false);
});
