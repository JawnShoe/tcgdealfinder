import test from "node:test";
import assert from "node:assert/strict";

import {
  computeDealScore,
  isDealTrusted,
  getDealConfidence,
  TRUST_FEEDBACK_THRESHOLD,
  TRUST_POSITIVE_PERCENT,
} from "../../dealScore";

// ============================================================
// isDealTrusted() tests
// ============================================================

test("isDealTrusted: returns true when feedback >= 20 AND positive >= 98%", () => {
  assert.equal(isDealTrusted(20, 98), true);
  assert.equal(isDealTrusted(100, 99.5), true);
});

test("isDealTrusted: returns false when feedback < 20", () => {
  assert.equal(isDealTrusted(19, 99), false);
  assert.equal(isDealTrusted(0, 100), false);
});

test("isDealTrusted: returns false when positive < 98%", () => {
  assert.equal(isDealTrusted(50, 97.9), false);
  assert.equal(isDealTrusted(100, 95), false);
});

test("isDealTrusted: returns false for null inputs", () => {
  assert.equal(isDealTrusted(null, 99), false);
  assert.equal(isDealTrusted(50, null), false);
  assert.equal(isDealTrusted(null, null), false);
});

test("isDealTrusted: threshold constants match expected values", () => {
  assert.equal(TRUST_FEEDBACK_THRESHOLD, 20);
  assert.equal(TRUST_POSITIVE_PERCENT, 98);
});

// ============================================================
// getDealConfidence() tests (legacy sample-based confidence)
// ============================================================

test("getDealConfidence: returns 'high' for sampleSize >= 50", () => {
  assert.equal(getDealConfidence(50), "high");
  assert.equal(getDealConfidence(100), "high");
});

test("getDealConfidence: returns 'medium' for sampleSize >= 20 and < 50", () => {
  assert.equal(getDealConfidence(20), "medium");
  assert.equal(getDealConfidence(49), "medium");
});

test("getDealConfidence: returns 'low' for sampleSize >= 5 and < 20", () => {
  assert.equal(getDealConfidence(5), "low");
  assert.equal(getDealConfidence(19), "low");
});

test("getDealConfidence: returns null for sampleSize < 5", () => {
  assert.equal(getDealConfidence(4), null);
  assert.equal(getDealConfidence(0), null);
});

test("getDealConfidence: returns null for null/undefined input", () => {
  assert.equal(getDealConfidence(null), null);
  assert.equal(getDealConfidence(undefined), null);
});

// ============================================================
// computeDealScore() tests
// ============================================================

test("computeDealScore: discount multiplier applies correctly (2 points per 1% off)", () => {
  // 15% off = 30 points base
  const score = computeDealScore({
    discountPercent: -15,
    isTrustedSeller: false,
    endsAt: null,
    confidence: null,
  });
  assert.equal(score, 30);
});

test("computeDealScore: discount base score caps at 60 points (30% off)", () => {
  // 30% off = 60 points (capped)
  const score30 = computeDealScore({
    discountPercent: -30,
    isTrustedSeller: false,
    endsAt: null,
    confidence: null,
  });
  assert.equal(score30, 60);

  // 50% off still = 60 points (capped at 60)
  const score50 = computeDealScore({
    discountPercent: -50,
    isTrustedSeller: false,
    endsAt: null,
    confidence: null,
  });
  assert.equal(score50, 60);
});

test("computeDealScore: positive discount (markup) yields 0 base points", () => {
  const score = computeDealScore({
    discountPercent: 10, // markup
    isTrustedSeller: false,
    endsAt: null,
    confidence: null,
  });
  assert.equal(score, 0);
});

test("computeDealScore: null discount yields 0 score", () => {
  const score = computeDealScore({
    discountPercent: null,
    isTrustedSeller: false,
    endsAt: null,
    confidence: null,
  });
  assert.equal(score, 0);
});

test("computeDealScore: trusted seller adds +15 points", () => {
  const untrusted = computeDealScore({
    discountPercent: -20,
    isTrustedSeller: false,
    endsAt: null,
    confidence: null,
  });
  const trusted = computeDealScore({
    discountPercent: -20,
    isTrustedSeller: true,
    endsAt: null,
    confidence: null,
  });
  assert.equal(trusted - untrusted, 15);
});

test("computeDealScore: urgency bonus for ends <= 6 hours adds +15", () => {
  const referenceTime = Date.now();
  const endsIn5Hours = new Date(referenceTime + 5 * 60 * 60 * 1000);

  const score = computeDealScore(
    {
      discountPercent: -10,
      isTrustedSeller: false,
      endsAt: endsIn5Hours,
      confidence: null,
    },
    referenceTime
  );
  // 10% off = 20 base + 15 urgency = 35
  assert.equal(score, 35);
});

test("computeDealScore: urgency bonus for ends <= 24 hours adds +10", () => {
  const referenceTime = Date.now();
  const endsIn12Hours = new Date(referenceTime + 12 * 60 * 60 * 1000);

  const score = computeDealScore(
    {
      discountPercent: -10,
      isTrustedSeller: false,
      endsAt: endsIn12Hours,
      confidence: null,
    },
    referenceTime
  );
  // 10% off = 20 base + 10 urgency = 30
  assert.equal(score, 30);
});

test("computeDealScore: urgency bonus for ends <= 72 hours adds +5", () => {
  const referenceTime = Date.now();
  const endsIn48Hours = new Date(referenceTime + 48 * 60 * 60 * 1000);

  const score = computeDealScore(
    {
      discountPercent: -10,
      isTrustedSeller: false,
      endsAt: endsIn48Hours,
      confidence: null,
    },
    referenceTime
  );
  // 10% off = 20 base + 5 urgency = 25
  assert.equal(score, 25);
});

test("computeDealScore: no urgency bonus for ends > 72 hours", () => {
  const referenceTime = Date.now();
  const endsIn100Hours = new Date(referenceTime + 100 * 60 * 60 * 1000);

  const score = computeDealScore(
    {
      discountPercent: -10,
      isTrustedSeller: false,
      endsAt: endsIn100Hours,
      confidence: null,
    },
    referenceTime
  );
  // 10% off = 20 base + 0 urgency = 20
  assert.equal(score, 20);
});

test("computeDealScore: no urgency bonus for already ended auctions", () => {
  const referenceTime = Date.now();
  const endedYesterday = new Date(referenceTime - 24 * 60 * 60 * 1000);

  const score = computeDealScore(
    {
      discountPercent: -10,
      isTrustedSeller: false,
      endsAt: endedYesterday,
      confidence: null,
    },
    referenceTime
  );
  // 10% off = 20 base + 0 urgency = 20
  assert.equal(score, 20);
});

test("computeDealScore: confidence 'high' adds +10 points", () => {
  const noConf = computeDealScore({
    discountPercent: -10,
    isTrustedSeller: false,
    endsAt: null,
    confidence: null,
  });
  const highConf = computeDealScore({
    discountPercent: -10,
    isTrustedSeller: false,
    endsAt: null,
    confidence: "high",
  });
  assert.equal(highConf - noConf, 10);
});

test("computeDealScore: confidence 'medium' adds +5 points", () => {
  const noConf = computeDealScore({
    discountPercent: -10,
    isTrustedSeller: false,
    endsAt: null,
    confidence: null,
  });
  const medConf = computeDealScore({
    discountPercent: -10,
    isTrustedSeller: false,
    endsAt: null,
    confidence: "medium",
  });
  assert.equal(medConf - noConf, 5);
});

test("computeDealScore: confidence 'low' adds +0 points", () => {
  const noConf = computeDealScore({
    discountPercent: -10,
    isTrustedSeller: false,
    endsAt: null,
    confidence: null,
  });
  const lowConf = computeDealScore({
    discountPercent: -10,
    isTrustedSeller: false,
    endsAt: null,
    confidence: "low",
  });
  assert.equal(lowConf - noConf, 0);
});

test("computeDealScore: maximum possible score is 100", () => {
  const referenceTime = Date.now();
  const endsIn1Hour = new Date(referenceTime + 1 * 60 * 60 * 1000);

  // Max: 60 (discount) + 15 (trusted) + 15 (urgency) + 10 (high confidence) = 100
  const score = computeDealScore(
    {
      discountPercent: -50, // capped at 60
      isTrustedSeller: true,
      endsAt: endsIn1Hour,
      confidence: "high",
    },
    referenceTime
  );
  assert.equal(score, 100);
});

test("computeDealScore: score never goes below 0", () => {
  const score = computeDealScore({
    discountPercent: 100, // big markup
    isTrustedSeller: false,
    endsAt: null,
    confidence: null,
  });
  assert.equal(score, 0);
});

test("computeDealScore: handles string endsAt date", () => {
  const referenceTime = Date.now();
  const endsIn5Hours = new Date(
    referenceTime + 5 * 60 * 60 * 1000
  ).toISOString();

  const score = computeDealScore(
    {
      discountPercent: -10,
      isTrustedSeller: false,
      endsAt: endsIn5Hours,
      confidence: null,
    },
    referenceTime
  );
  // 10% off = 20 base + 15 urgency = 35
  assert.equal(score, 35);
});
