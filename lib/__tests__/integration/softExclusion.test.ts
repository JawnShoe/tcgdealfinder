import test from "node:test";
import assert from "node:assert/strict";

import {
  getSoftExclusionReason,
  shouldExcludeListingFromCardSurfaces,
} from "../../blacklist";

// =============================================================================
// SOFT EXCLUSION TESTS
// =============================================================================

test("should soft-exclude blanket merchandise", () => {
  const result = getSoftExclusionReason({
    title: "Umbreon Pokemon Throw Blanket 50x60",
  });

  assert.equal(result.excluded, true);
  assert.equal(result.reason, "non_card_merch");
  assert.equal(result.hit, "blanket");
});

test("should soft-exclude plush toys", () => {
  const result = getSoftExclusionReason({
    title: "Pokemon Pikachu Plush Toy 12 inch",
  });

  assert.equal(result.excluded, true);
  assert.equal(result.reason, "non_card_merch");
  assert.equal(result.hit, "plush");
});

test("should soft-exclude wall art canvas", () => {
  const result = getSoftExclusionReason({
    title: "Umbreon VMAX Wall Art Canvas Print Framed",
  });

  assert.equal(result.excluded, true);
  assert.equal(result.reason, "non_card_merch");
  // Could match "wall art" or "canvas"
  assert.ok(result.hit === "wall art" || result.hit === "canvas");
});

test("should soft-exclude playmats", () => {
  const result = getSoftExclusionReason({
    title: "Pokemon TCG Official Playmat Charizard",
  });

  assert.equal(result.excluded, true);
  assert.equal(result.reason, "non_card_merch");
  assert.equal(result.hit, "playmat");
});

test("should soft-exclude hoodies/clothing", () => {
  const result = getSoftExclusionReason({
    title: "Pokemon Pikachu Hoodie Large",
  });

  assert.equal(result.excluded, true);
  assert.equal(result.reason, "non_card_merch");
  assert.equal(result.hit, "hoodie");
});

test("should soft-exclude figures/statues", () => {
  const result = getSoftExclusionReason({
    title: "Pokemon Charizard Figure Statue 8 inch",
  });

  assert.equal(result.excluded, true);
  assert.equal(result.reason, "non_card_merch");
  // Could match "figure" or "statue"
  assert.ok(result.hit === "figure" || result.hit === "statue");
});

test("should soft-exclude keychains", () => {
  const result = getSoftExclusionReason({
    title: "Umbreon Eeveelution Keychain Metal",
  });

  assert.equal(result.excluded, true);
  assert.equal(result.reason, "non_card_merch");
  assert.equal(result.hit, "keychain");
});

test("should soft-exclude mousepads", () => {
  const result = getSoftExclusionReason({
    title: "Pokemon Mousepad Gaming Large Extended",
  });

  assert.equal(result.excluded, true);
  assert.equal(result.reason, "non_card_merch");
  assert.equal(result.hit, "mousepad");
});

// =============================================================================
// FALSE POSITIVE PROTECTION
// =============================================================================

test("should NOT exclude 'Alt Art' cards (legitimate card term)", () => {
  const result = getSoftExclusionReason({
    title: "Umbreon VMAX 215/203 Alt Art Pokemon Card",
  });

  assert.equal(result.excluded, false);
});

test("should NOT exclude 'Full Art' cards (legitimate card term)", () => {
  const result = getSoftExclusionReason({
    title: "Charizard V Full Art 154/172 Pokemon TCG",
  });

  assert.equal(result.excluded, false);
});

test("should NOT exclude cards with set numbers", () => {
  const result = getSoftExclusionReason({
    title: "Pikachu VMAX 044/185 Rainbow Rare Pokemon Card NM",
  });

  assert.equal(result.excluded, false);
});

test("should NOT exclude graded cards", () => {
  const result = getSoftExclusionReason({
    title: "Umbreon VMAX PSA 10 Gem Mint 215/203 Evolving Skies",
  });

  assert.equal(result.excluded, false);
});

// =============================================================================
// HARD BLOCK VS SOFT EXCLUSION ORDERING
// =============================================================================

test("display case should be HARD blocked (not soft excluded)", async () => {
  const result = await shouldExcludeListingFromCardSurfaces({
    title: "Pokemon Display Case Acrylic Holder",
  });

  assert.equal(result.excluded, true);
  assert.equal(result.hardBlocked, true);
  assert.equal(result.softExcluded, false);
});

test("acrylic should be HARD blocked (not soft excluded)", async () => {
  const result = await shouldExcludeListingFromCardSurfaces({
    title: "Custom Acrylic Pokemon Card",
  });

  assert.equal(result.excluded, true);
  assert.equal(result.hardBlocked, true);
  assert.equal(result.softExcluded, false);
});

test("metal card should be HARD blocked (not soft excluded)", async () => {
  const result = await shouldExcludeListingFromCardSurfaces({
    title: "Charizard Metal Gold Card Custom",
  });

  assert.equal(result.excluded, true);
  assert.equal(result.hardBlocked, true);
  assert.equal(result.softExcluded, false);
});

test("proxy should be HARD blocked (not soft excluded)", async () => {
  const result = await shouldExcludeListingFromCardSurfaces({
    title: "Pokemon Proxy Cards Set",
  });

  assert.equal(result.excluded, true);
  assert.equal(result.hardBlocked, true);
  assert.equal(result.softExcluded, false);
});

// =============================================================================
// COMBINED HELPER TESTS
// =============================================================================

test("combined helper should return soft exclusion for merchandise", async () => {
  const result = await shouldExcludeListingFromCardSurfaces({
    title: "Pokemon Pikachu Plush Stuffed Animal",
  });

  assert.equal(result.excluded, true);
  assert.equal(result.hardBlocked, false);
  assert.equal(result.softExcluded, true);
  assert.equal(result.category, "non_card_merch");
});

test("combined helper should allow legitimate cards", async () => {
  const result = await shouldExcludeListingFromCardSurfaces({
    title: "Umbreon VMAX 215/203 Alternate Art Evolving Skies NM",
  });

  assert.equal(result.excluded, false);
  assert.equal(result.hardBlocked, false);
  assert.equal(result.softExcluded, false);
});

test("combined helper should pass card context to hard block check", async () => {
  // Rainbow claim on non-rainbow card should be hard blocked
  const result = await shouldExcludeListingFromCardSurfaces(
    { title: "Umbreon VMAX Rainbow 215/203 Pokemon" },
    {
      name: "Umbreon VMAX",
      setName: "Evolving Skies",
      number: "215/203",
      rarity: "Alternate Art Rare", // Not rainbow
    }
  );

  assert.equal(result.excluded, true);
  assert.equal(result.hardBlocked, true);
});

// =============================================================================
// EDGE CASES
// =============================================================================

test("should handle empty title gracefully", () => {
  const result = getSoftExclusionReason({
    title: "",
  });

  assert.equal(result.excluded, false);
});

test("should check category name if provided", () => {
  const result = getSoftExclusionReason({
    title: "Pokemon Item",
    categoryName: "Action Figures & Statues",
  });

  assert.equal(result.excluded, true);
  // Should match "figure" or "statue" from category
});

test("pillow should be soft-excluded", () => {
  const result = getSoftExclusionReason({
    title: "Pokemon Snorlax Pillow Cushion",
  });

  assert.equal(result.excluded, true);
  assert.ok(result.hit === "pillow" || result.hit === "cushion");
});

test("t-shirt variations should be soft-excluded", () => {
  const titles = [
    "Pokemon Pikachu Tshirt Large",
    "Pokemon T-Shirt Medium",
    "Pokemon T Shirt Small",
  ];

  for (const title of titles) {
    const result = getSoftExclusionReason({ title });
    assert.equal(result.excluded, true, `Expected "${title}" to be excluded`);
  }
});

test("funko should be soft-excluded", () => {
  const result = getSoftExclusionReason({
    title: "Pokemon Pikachu Funko Pop 353",
  });

  assert.equal(result.excluded, true);
  assert.equal(result.hit, "funko");
});

test("backpack should be soft-excluded", () => {
  const result = getSoftExclusionReason({
    title: "Pokemon School Backpack Kids",
  });

  assert.equal(result.excluded, true);
  assert.equal(result.hit, "backpack");
});
