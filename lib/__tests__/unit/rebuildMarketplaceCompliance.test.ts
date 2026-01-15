import test from "node:test";
import assert from "node:assert/strict";

import {
  MARKETPLACE_COMPLIANCE,
  MARKETPLACE_COMPLIANCE_VERSION,
  SUPPORTED_MARKETPLACES,
  getMarketplaceCompliance,
} from "@/lib/rebuild/compliance/marketplaceCompliance";
import { REBUILD_COMPLIANCE_DISCLOSURE_COPY } from "@/lib/rebuild/compliance/disclosure";
import {
  isObviousAutomationUserAgent,
  normalizeOutboundUrlForStorage,
  shouldSuppressDuplicateClick,
  validateOutboundClickTarget,
} from "@/lib/rebuild/compliance/outboundClickIntegrity";

test("marketplace compliance config is complete and versioned", () => {
  assert.ok(MARKETPLACE_COMPLIANCE_VERSION >= 1);

  for (const marketplace of SUPPORTED_MARKETPLACES) {
    const config = MARKETPLACE_COMPLIANCE[marketplace];
    assert.equal(config.version, MARKETPLACE_COMPLIANCE_VERSION);
    assert.equal(config.marketplace, marketplace);
    assert.equal(
      config.displayRules.disclosureText,
      REBUILD_COMPLIANCE_DISCLOSURE_COPY
    );
    assert.equal(config.displayRules.disclosureRequired, true);
    assert.equal(config.displayRules.placement, "near_outbound_link");
    assert.equal(config.displayRules.notHoverOnly, true);
    assert.equal(config.displayRules.clsSafe, true);

    assert.equal(config.attributionWindows.modeledBySystem, false);
    assert.ok(config.attributionWindows.notes.length > 0);

    assert.equal(
      config.cachingStorageConstraints.outboundClickStorage.urlStoredAs,
      "origin+pathname"
    );
    assert.ok(
      config.cachingStorageConstraints.outboundClickStorage.stores.length
    );
    assert.ok(
      config.cachingStorageConstraints.outboundClickStorage.neverStores.length
    );
  }
});

test("getMarketplaceCompliance returns null for unknown marketplace", () => {
  assert.equal(getMarketplaceCompliance(null), null);
  assert.equal(getMarketplaceCompliance("NOT_A_MARKET"), null);
});

test("outbound url normalization strips query and hash", () => {
  const normalized = normalizeOutboundUrlForStorage(
    "https://example.com/path?campid=123#frag"
  );
  assert.equal(normalized.ok, true);
  if (normalized.ok) {
    assert.equal(normalized.value, "https://example.com/path");
  }
});

test("obvious automation user agents are blocked conservatively", () => {
  assert.equal(isObviousAutomationUserAgent(null), false);
  assert.equal(isObviousAutomationUserAgent("Mozilla/5.0"), false);
  assert.equal(isObviousAutomationUserAgent("curl/8.4.0"), true);
  assert.equal(isObviousAutomationUserAgent("python-requests/2.31.0"), true);
  assert.equal(isObviousAutomationUserAgent("Playwright"), false);
});

test("duplicate click suppression triggers within ttl", () => {
  assert.equal(
    shouldSuppressDuplicateClick({ nowMs: 1000, previousClickAtMs: null }),
    false
  );
  assert.equal(
    shouldSuppressDuplicateClick({ nowMs: 1000, previousClickAtMs: 900 }),
    true
  );
  assert.equal(
    shouldSuppressDuplicateClick({ nowMs: 1000, previousClickAtMs: 100 }),
    false
  );
});

test("outbound click target validation enforces marketplace + url match", () => {
  const ok = validateOutboundClickTarget({
    rawUrl: "https://example.com/rebuild-e2e-1?campid=123",
    expectedListingUrl: "https://example.com/rebuild-e2e-1",
    listingMarket: "EBAY_US",
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.normalizedUrl, "https://example.com/rebuild-e2e-1");
    assert.equal(ok.marketplace, "EBAY_US");
  }

  const mismatched = validateOutboundClickTarget({
    rawUrl: "https://example.com/rebuild-e2e-1/evil",
    expectedListingUrl: "https://example.com/rebuild-e2e-1",
    listingMarket: "EBAY_US",
  });
  assert.deepEqual(mismatched, { ok: false, error: "url_mismatch" });

  const unsupported = validateOutboundClickTarget({
    rawUrl: "https://example.com/rebuild-e2e-1",
    expectedListingUrl: "https://example.com/rebuild-e2e-1",
    listingMarket: "NOT_A_MARKET",
  });
  assert.deepEqual(unsupported, { ok: false, error: "unsupported_market" });
});
