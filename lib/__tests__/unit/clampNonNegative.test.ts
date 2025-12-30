import test from "node:test";
import assert from "node:assert/strict";

import { clampNonNegative } from "@/lib/priceGuard";

test("clampNonNegative returns null for null input", () => {
  assert.equal(clampNonNegative(null), null);
});

test("clampNonNegative returns 0 for negative values", () => {
  assert.equal(clampNonNegative(-1), 0);
  assert.equal(clampNonNegative(-0.01), 0);
  assert.equal(clampNonNegative(-100), 0);
});

test("clampNonNegative passes through zero unchanged", () => {
  assert.equal(clampNonNegative(0), 0);
});

test("clampNonNegative passes through positive values unchanged", () => {
  assert.equal(clampNonNegative(1), 1);
  assert.equal(clampNonNegative(0.01), 0.01);
  assert.equal(clampNonNegative(999.99), 999.99);
});
