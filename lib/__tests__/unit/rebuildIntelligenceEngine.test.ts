import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateIntelligence,
  type ListingLike,
  type IntelligenceResult,
} from "../../rebuild/intelligence";
import { stockImageRule } from "../../rebuild/intelligence/rules/stockImageRule";
import { sellerMismatchRule } from "../../rebuild/intelligence/rules/sellerMismatchRule";
import { descriptionHeuristicsRule } from "../../rebuild/intelligence/rules/descriptionHeuristicsRule";
import { missingKeyFieldsRule } from "../../rebuild/intelligence/rules/missingKeyFieldsRule";
import { priceOutlierRule } from "../../rebuild/intelligence/rules/priceOutlierRule";

const CLEAN_LISTING: ListingLike = {
  title: "Pokemon Charizard VMAX Rainbow Rare 074/073 NM",
  price: {
    amount: 150.0,
    discountPercent: -12.5,
  },
  seller: {
    name: "CardShop",
    username: "cardshop",
  },
  condition: "NM",
};

function buildListing(overrides: Partial<ListingLike>): ListingLike {
  return {
    ...CLEAN_LISTING,
    ...overrides,
    price: { ...CLEAN_LISTING.price, ...overrides.price },
    seller: { ...CLEAN_LISTING.seller, ...overrides.seller },
  };
}

// =============================================================================
// DETERMINISM TESTS
// =============================================================================

test("evaluateIntelligence is deterministic: same input yields same output", () => {
  const listing = buildListing({});

  const result1 = evaluateIntelligence(listing);
  const result2 = evaluateIntelligence(listing);

  assert.deepEqual(
    result1,
    result2,
    "Results should be identical for same input"
  );
});

test("evaluateIntelligence output is stable across multiple runs", () => {
  const listing = buildListing({
    title: "Short",
    price: { amount: null, discountPercent: null },
    seller: { name: null, username: null },
    condition: null,
  });

  const results: IntelligenceResult[] = [];
  for (let i = 0; i < 10; i++) {
    results.push(evaluateIntelligence(listing));
  }

  const first = results[0];
  for (const result of results) {
    assert.deepEqual(
      result,
      first,
      "All runs should produce identical results"
    );
  }
});

test("evaluateIntelligence does not depend on wall-clock time", () => {
  const listing = buildListing({});

  const result1 = evaluateIntelligence(listing);

  // Simulate time passing (no actual time dependency to test, but verify structure)
  const result2 = evaluateIntelligence(listing);

  assert.deepEqual(result1, result2);
  assert.ok(!("computedAt" in result1), "Result should not contain computedAt");
});

// =============================================================================
// ENGINE VERSION
// =============================================================================

test("evaluateIntelligence returns stable engine version", () => {
  const result = evaluateIntelligence(CLEAN_LISTING);

  assert.equal(result.engineVersion, "intelligence-v1");
});

// =============================================================================
// CLEAN LISTING (NO FALSE POSITIVES)
// =============================================================================

test("clean listing produces no risk flags", () => {
  const result = evaluateIntelligence(CLEAN_LISTING);

  assert.deepEqual(result.riskFlags, []);
});

// =============================================================================
// FLAG ORDERING (ALPHABETICAL, STABLE)
// =============================================================================

test("riskFlags are sorted alphabetically for stable ordering", () => {
  const listing = buildListing({
    title: "x", // too short -> SUSPICIOUS_DESCRIPTION
    price: { amount: null, discountPercent: -90 }, // extreme discount -> PRICE_OUTLIER_SIMPLE
    seller: { name: null, username: null },
    condition: null, // missing fields -> MISSING_KEY_FIELDS
  });

  const result = evaluateIntelligence(listing);

  // Should be alphabetically sorted
  const sorted = [...result.riskFlags].sort();
  assert.deepEqual(
    result.riskFlags,
    sorted,
    "Flags should be alphabetically sorted"
  );
});

// =============================================================================
// INDIVIDUAL RULE TESTS
// =============================================================================

test("stockImageRule triggers on stock photo patterns", () => {
  const patterns = [
    "Card stock photo placeholder",
    "Pokemon No Image Available",
    "Generic image - actual card may vary",
  ];

  for (const title of patterns) {
    const result = stockImageRule(buildListing({ title }));
    assert.equal(result, "STOCK_IMAGE_ONLY", `Should flag: ${title}`);
  }
});

test("stockImageRule does not trigger on normal titles", () => {
  const titles = [
    "Pokemon Charizard VMAX Rainbow Rare",
    "MTG Black Lotus BGS 9.5",
    "Pikachu Illustrator PSA 10",
  ];

  for (const title of titles) {
    const result = stockImageRule(buildListing({ title }));
    assert.equal(result, null, `Should not flag: ${title}`);
  }
});

test("sellerMismatchRule triggers when name and username differ significantly", () => {
  const listing = buildListing({
    seller: { name: "John's Card Shop", username: "totallyDifferentUser123" },
  });

  const result = sellerMismatchRule(listing);
  assert.equal(result, "SELLER_MISMATCH");
});

test("sellerMismatchRule does not trigger when name contains username", () => {
  const listing = buildListing({
    seller: { name: "CardShop Official", username: "cardshop" },
  });

  const result = sellerMismatchRule(listing);
  assert.equal(result, null);
});

test("sellerMismatchRule does not trigger when either is missing", () => {
  const noName = buildListing({ seller: { name: null, username: "user" } });
  const noUsername = buildListing({ seller: { name: "Shop", username: null } });
  const neither = buildListing({ seller: { name: null, username: null } });

  assert.equal(sellerMismatchRule(noName), null);
  assert.equal(sellerMismatchRule(noUsername), null);
  assert.equal(sellerMismatchRule(neither), null);
});

test("descriptionHeuristicsRule triggers on short titles", () => {
  const result = descriptionHeuristicsRule(buildListing({ title: "Card" }));
  assert.equal(result, "SUSPICIOUS_DESCRIPTION");
});

test("descriptionHeuristicsRule triggers on spam patterns", () => {
  const spamTitles = [
    "BUY NOW before it's gone!!!",
    "ACT FAST limited time offer",
    "Click here for amazing deal",
  ];

  for (const title of spamTitles) {
    const result = descriptionHeuristicsRule(buildListing({ title }));
    assert.equal(result, "SUSPICIOUS_DESCRIPTION", `Should flag: ${title}`);
  }
});

test("descriptionHeuristicsRule triggers on excessive punctuation", () => {
  const result = descriptionHeuristicsRule(
    buildListing({ title: "Pokemon Card!!!!!" })
  );
  assert.equal(result, "SUSPICIOUS_DESCRIPTION");
});

test("descriptionHeuristicsRule does not trigger on normal titles", () => {
  const result = descriptionHeuristicsRule(
    buildListing({ title: "Pokemon Charizard VMAX - Near Mint!" })
  );
  assert.equal(result, null);
});

test("missingKeyFieldsRule triggers when 2+ fields missing", () => {
  const listing = buildListing({
    price: { amount: null, discountPercent: null },
    condition: null,
  });

  const result = missingKeyFieldsRule(listing);
  assert.equal(result, "MISSING_KEY_FIELDS");
});

test("missingKeyFieldsRule does not trigger when only 1 field missing", () => {
  const listing = buildListing({
    condition: null, // only condition missing
  });

  const result = missingKeyFieldsRule(listing);
  assert.equal(result, null);
});

test("priceOutlierRule triggers on extreme discount (too good)", () => {
  const listing = buildListing({
    price: { amount: 10, discountPercent: -85 },
  });

  const result = priceOutlierRule(listing);
  assert.equal(result, "PRICE_OUTLIER_SIMPLE");
});

test("priceOutlierRule triggers on extreme premium", () => {
  const listing = buildListing({
    price: { amount: 500, discountPercent: 60 },
  });

  const result = priceOutlierRule(listing);
  assert.equal(result, "PRICE_OUTLIER_SIMPLE");
});

test("priceOutlierRule does not trigger on normal discount", () => {
  const listing = buildListing({
    price: { amount: 100, discountPercent: -25 },
  });

  const result = priceOutlierRule(listing);
  assert.equal(result, null);
});

test("priceOutlierRule does not trigger when discount is null", () => {
  const listing = buildListing({
    price: { amount: 100, discountPercent: null },
  });

  const result = priceOutlierRule(listing);
  assert.equal(result, null);
});

// =============================================================================
// COMBINED EVALUATION
// =============================================================================

test("evaluateIntelligence returns multiple flags when multiple rules trigger", () => {
  const listing = buildListing({
    title: "x", // SUSPICIOUS_DESCRIPTION (too short)
    price: { amount: null, discountPercent: null },
    seller: { name: null, username: null },
    condition: null, // MISSING_KEY_FIELDS (price + condition + seller)
  });

  const result = evaluateIntelligence(listing);

  assert.ok(result.riskFlags.includes("SUSPICIOUS_DESCRIPTION"));
  assert.ok(result.riskFlags.includes("MISSING_KEY_FIELDS"));
  assert.ok(result.riskFlags.length >= 2);
});

test("evaluateIntelligence deduplicates flags", () => {
  // Even if somehow a flag could trigger twice, result should be unique
  const listing = buildListing({
    title: "BUY NOW!!! ACT FAST!!!", // Multiple spam patterns
  });

  const result = evaluateIntelligence(listing);

  const uniqueFlags = [...new Set(result.riskFlags)];
  assert.deepEqual(result.riskFlags, uniqueFlags, "Flags should be unique");
});
