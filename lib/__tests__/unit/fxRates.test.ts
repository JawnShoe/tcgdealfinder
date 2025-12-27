import test from "node:test";
import assert from "node:assert/strict";

import { validateFXRate, FX_RATE_BOUNDS } from "../../fxRates";

test("validateFXRate accepts valid GBP rate", () => {
  // GBP is stronger than USD, so rate should be > 1.0
  assert.equal(validateFXRate("GBP", 1.27), null);
  assert.equal(validateFXRate("GBP", 1.35), null);
  assert.equal(validateFXRate("gbp", 1.25), null);
});

test("validateFXRate rejects inverted GBP rate", () => {
  // 0.79 is USD→GBP (inverted), should be rejected
  const error = validateFXRate("GBP", 0.79);
  assert.ok(error !== null);
  assert.ok(error.includes("outside expected bounds"));
  assert.ok(error.includes("inverted rate"));
});

test("validateFXRate accepts valid CAD rate", () => {
  // CAD is weaker than USD, so rate should be < 1.0
  assert.equal(validateFXRate("CAD", 0.72), null);
  assert.equal(validateFXRate("CAD", 0.74), null);
});

test("validateFXRate rejects inverted CAD rate", () => {
  // 1.35 would be inverted (USD→CAD), should be rejected
  const error = validateFXRate("CAD", 1.35);
  assert.ok(error !== null);
  assert.ok(error.includes("outside expected bounds"));
});

test("validateFXRate accepts valid AUD rate", () => {
  assert.equal(validateFXRate("AUD", 0.64), null);
  assert.equal(validateFXRate("AUD", 0.7), null);
});

test("validateFXRate accepts USD = 1.0 only", () => {
  assert.equal(validateFXRate("USD", 1.0), null);

  const errorHigh = validateFXRate("USD", 1.01);
  assert.ok(errorHigh !== null);

  const errorLow = validateFXRate("USD", 0.99);
  assert.ok(errorLow !== null);
});

test("validateFXRate rejects non-positive rates", () => {
  const error0 = validateFXRate("GBP", 0);
  assert.ok(error0 !== null);
  assert.ok(error0.includes("must be positive"));

  const errorNeg = validateFXRate("GBP", -1.27);
  assert.ok(errorNeg !== null);

  const errorNaN = validateFXRate("GBP", NaN);
  assert.ok(errorNaN !== null);
});

test("validateFXRate allows unknown currencies", () => {
  // Unknown currencies should pass (return null) - we may add new ones
  assert.equal(validateFXRate("JPY", 0.0067), null);
  assert.equal(validateFXRate("CHF", 1.12), null);
});

test("FX_RATE_BOUNDS has expected currency directions", () => {
  // Currencies stronger than USD should have min > 1.0
  assert.ok(FX_RATE_BOUNDS.GBP.min > 1.0, "GBP min should be > 1.0");

  // Currencies weaker than USD should have max < 1.0
  assert.ok(FX_RATE_BOUNDS.CAD.max < 1.0, "CAD max should be < 1.0");
  assert.ok(FX_RATE_BOUNDS.AUD.max < 1.0, "AUD max should be < 1.0");
  assert.ok(FX_RATE_BOUNDS.MXN.max < 1.0, "MXN max should be < 1.0");

  // USD should be exactly 1.0
  assert.equal(FX_RATE_BOUNDS.USD.min, 1.0);
  assert.equal(FX_RATE_BOUNDS.USD.max, 1.0);
});

test("example: GBP 388.74 converts to ~USD 524.99", () => {
  // This is the specific example from the bug report:
  // eBay UK shows: US $524.99 (Approximately £388.74)
  // The correct GBP→USD rate is 524.99 / 388.74 ≈ 1.35

  const gbpAmount = 388.74;
  const expectedUsd = 524.99;
  const correctRate = expectedUsd / gbpAmount; // ≈ 1.35

  // The correct rate should pass validation
  assert.equal(validateFXRate("GBP", correctRate), null);

  // The inverted rate (0.79) should fail
  const invertedRate = gbpAmount / expectedUsd; // ≈ 0.74
  const error = validateFXRate("GBP", invertedRate);
  assert.ok(error !== null, "Inverted rate should be rejected");

  // Verify the conversion math
  const convertedUsd = gbpAmount * correctRate;
  assert.ok(
    Math.abs(convertedUsd - expectedUsd) < 0.01,
    `Conversion should match: ${convertedUsd} ≈ ${expectedUsd}`
  );
});
