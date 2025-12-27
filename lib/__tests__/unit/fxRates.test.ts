import test from "node:test";
import assert from "node:assert/strict";

import { validateFXRateDirection } from "../../fxRates";

test("validateFXRateDirection: GBP must be > 1.0", () => {
  // Valid: GBP is stronger than USD
  assert.equal(validateFXRateDirection("GBP", 1.27), null);
  assert.equal(validateFXRateDirection("GBP", 1.35), null);
  assert.equal(validateFXRateDirection("gbp", 1.5), null);

  // Invalid: inverted rate (USD→GBP instead of GBP→USD)
  const error = validateFXRateDirection("GBP", 0.79);
  assert.ok(error !== null);
  assert.ok(error.includes("stronger than USD"));
  assert.ok(error.includes("inverted"));
});

test("validateFXRateDirection: CAD must be < 1.0", () => {
  // Valid: CAD is weaker than USD
  assert.equal(validateFXRateDirection("CAD", 0.72), null);
  assert.equal(validateFXRateDirection("CAD", 0.74), null);

  // Invalid: inverted rate
  const error = validateFXRateDirection("CAD", 1.35);
  assert.ok(error !== null);
  assert.ok(error.includes("weaker than USD"));
  assert.ok(error.includes("inverted"));
});

test("validateFXRateDirection: AUD must be < 1.0", () => {
  assert.equal(validateFXRateDirection("AUD", 0.64), null);

  const error = validateFXRateDirection("AUD", 1.56);
  assert.ok(error !== null);
  assert.ok(error.includes("weaker than USD"));
});

test("validateFXRateDirection: EUR must be > 1.0", () => {
  assert.equal(validateFXRateDirection("EUR", 1.08), null);

  const error = validateFXRateDirection("EUR", 0.92);
  assert.ok(error !== null);
  assert.ok(error.includes("stronger than USD"));
});

test("validateFXRateDirection: USD must be exactly 1.0", () => {
  assert.equal(validateFXRateDirection("USD", 1.0), null);

  const errorHigh = validateFXRateDirection("USD", 1.01);
  assert.ok(errorHigh !== null);

  const errorLow = validateFXRateDirection("USD", 0.99);
  assert.ok(errorLow !== null);
});

test("validateFXRateDirection: rejects non-positive rates", () => {
  const error0 = validateFXRateDirection("GBP", 0);
  assert.ok(error0 !== null);
  assert.ok(error0.includes("must be positive"));

  const errorNeg = validateFXRateDirection("GBP", -1.27);
  assert.ok(errorNeg !== null);

  const errorNaN = validateFXRateDirection("GBP", NaN);
  assert.ok(errorNaN !== null);
});

test("validateFXRateDirection: allows unknown currencies", () => {
  // Unknown currencies pass validation (no direction constraint)
  assert.equal(validateFXRateDirection("XYZ", 0.5), null);
  assert.equal(validateFXRateDirection("XYZ", 2.0), null);
});

test("bug example: GBP 388.74 → USD 524.99 requires rate ~1.35", () => {
  // From bug report:
  // eBay UK shows: £388.74 (≈ US $524.99)
  // Our site showed: $306.34 (wrong!)
  //
  // The inverted rate that caused $306.34:
  // 306.34 / 388.74 = 0.788
  //
  // The correct rate:
  // 524.99 / 388.74 = 1.35

  const correctRate = 1.35;
  const invertedRate = 0.788; // What was in DB (USD→GBP instead of GBP→USD)

  // Correct rate should pass
  assert.equal(validateFXRateDirection("GBP", correctRate), null);

  // Inverted rate should fail
  const error = validateFXRateDirection("GBP", invertedRate);
  assert.ok(error !== null, "Inverted rate should be rejected");
  assert.ok(error.includes("inverted"));

  // Verify conversion math
  const gbpAmount = 388.74;
  const usdWithCorrectRate = gbpAmount * correctRate;
  const usdWithInvertedRate = gbpAmount * invertedRate;

  // With correct rate: £388.74 × 1.35 = $524.80
  assert.ok(
    Math.abs(usdWithCorrectRate - 524.8) < 1,
    `Correct: ${usdWithCorrectRate} ≈ 524.80`
  );
  // With inverted rate: £388.74 × 0.788 = $306.33
  assert.ok(
    Math.abs(usdWithInvertedRate - 306.33) < 1,
    `Inverted: ${usdWithInvertedRate} ≈ 306.33`
  );
});
