import test from "node:test";
import assert from "node:assert/strict";

import { compareStrictBestDiscountValues } from "../dealSort";

test("strict best discount sorts true discounts ahead of markups", () => {
  const result = compareStrictBestDiscountValues(-10, 50);
  assert.ok(result < 0);
});

test("strict best discount places markups before unscored", () => {
  const result = compareStrictBestDiscountValues(5, null);
  assert.ok(result < 0);
});

test("strict best discount sorts discounts by severity", () => {
  const result = compareStrictBestDiscountValues(-20, -5);
  assert.ok(result < 0);
});
