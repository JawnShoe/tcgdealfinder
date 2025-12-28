import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeMarketCode,
  getExpectedCurrency,
  DEFAULT_MARKET,
  MARKET_CURRENCIES,
  SUPPORTED_CURRENCIES,
  SUPPORTED_MARKETS,
} from "../../markets";

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

test("MARKET_CURRENCIES covers all SUPPORTED_MARKETS", () => {
  assert.deepEqual(
    Object.keys(MARKET_CURRENCIES).sort(),
    Array.from(SUPPORTED_MARKETS).sort()
  );

  for (const market of SUPPORTED_MARKETS) {
    const currency = MARKET_CURRENCIES[market];
    assert.ok(currency, `Missing currency mapping for ${market}`);
    assert.equal(getExpectedCurrency(market), currency);
  }
});

test("SUPPORTED_CURRENCIES includes all market currencies", () => {
  const marketCurrencies = new Set(
    SUPPORTED_MARKETS.map((market) => getExpectedCurrency(market))
  );

  for (const currency of marketCurrencies) {
    assert.ok(
      SUPPORTED_CURRENCIES.includes(currency),
      `SUPPORTED_CURRENCIES missing ${currency}`
    );
  }
});
