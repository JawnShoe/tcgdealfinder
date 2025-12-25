import test from "node:test";
import assert from "node:assert/strict";

import { detectMarketCurrencyMismatch } from "../update-listings";

test("currency guard allows matching currency", () => {
  const detail = detectMarketCurrencyMismatch("usd", "EBAY_US");
  assert.equal(detail, null);
});

test("currency guard rejects mismatched currency", () => {
  const detail = detectMarketCurrencyMismatch("usd", "EBAY_CA");
  assert(detail);
  assert.ok(detail.includes("market=EBAY_CA"));
});
