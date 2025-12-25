import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeMarketCode,
  getExpectedCurrency,
  DEFAULT_MARKET,
} from "../markets";

test("normalizeMarketCode handles lowercase shortcuts", () => {
  assert.equal(normalizeMarketCode("us"), "EBAY_US");
  assert.equal(normalizeMarketCode("ca"), "EBAY_CA");
  assert.equal(normalizeMarketCode("EBAY_CA"), "EBAY_CA");
});

test("normalizeMarketCode falls back to default", () => {
  assert.equal(normalizeMarketCode("unknown"), DEFAULT_MARKET);
  assert.equal(normalizeMarketCode(null), DEFAULT_MARKET);
});

test("getExpectedCurrency returns mapping", () => {
  assert.equal(getExpectedCurrency("EBAY_US"), "USD");
  assert.equal(getExpectedCurrency("EBAY_CA"), "CAD");
});
