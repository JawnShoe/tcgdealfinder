import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyFXDriftStatus,
  computeFXDriftPercent,
  validateFXRateDirection,
} from "../../fxRates";

test("validateFXRateDirection: accepts rates within bounds", () => {
  assert.equal(validateFXRateDirection("GBP", 1.35), null);
  assert.equal(validateFXRateDirection("GBP", 0.788), null);
  assert.equal(validateFXRateDirection("CAD", 0.72), null);
  assert.equal(validateFXRateDirection("CAD", 1.35), null);
  assert.equal(validateFXRateDirection("USD", 1.0), null);
});

test("validateFXRateDirection: rejects non-finite or non-positive rates", () => {
  assert.ok(validateFXRateDirection("GBP", 0)?.includes("> 0"));
  assert.ok(validateFXRateDirection("GBP", -1)?.includes("> 0"));
  assert.ok(validateFXRateDirection("GBP", NaN)?.includes("> 0"));
  assert.ok(validateFXRateDirection("GBP", Infinity)?.includes("> 0"));
});

test("validateFXRateDirection: rejects rates outside broad bounds", () => {
  assert.ok(validateFXRateDirection("GBP", 0.00001)?.includes("within"));
  assert.ok(validateFXRateDirection("GBP", 100000)?.includes("within"));
});

test("computeFXDriftPercent: uses previous as denominator", () => {
  assert.equal(computeFXDriftPercent(1, 1), 0);
  assert.ok(Math.abs(computeFXDriftPercent(1, 1.04) - 4) < 1e-9);
});

test("classifyFXDriftStatus: applies locked 5%/15% thresholds", () => {
  assert.equal(classifyFXDriftStatus(0), "SUCCESS");
  assert.equal(classifyFXDriftStatus(5), "SUCCESS");
  assert.equal(classifyFXDriftStatus(5.0001), "DRIFT_SUSPECT");
  assert.equal(classifyFXDriftStatus(15), "DRIFT_SUSPECT");
  assert.equal(classifyFXDriftStatus(15.0001), "FAILED");
});

test("bug example: inverted GBP rate triggers FAILED drift classification", () => {
  const correctRate = 1.35;
  const invertedRate = 0.788;

  const driftPercent = computeFXDriftPercent(correctRate, invertedRate);
  assert.ok(driftPercent > 15);
  assert.equal(classifyFXDriftStatus(driftPercent), "FAILED");
});
