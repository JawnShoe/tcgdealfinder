import test from "node:test";
import assert from "node:assert/strict";

import {
  getSoftExclusionReason,
  shouldExcludeListingFromCardSurfaces,
  shouldExcludeListingFromCardSurfacesSync,
  shouldExcludeListingsBatch,
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

// =============================================================================
// BATCH FUNCTION PARITY TESTS
// =============================================================================

test("shouldExcludeListingsBatch returns same results as individual calls", async () => {
  const testListings = [
    {
      title: "Umbreon VMAX 215/203 Alternate Art Evolving Skies NM",
      listingId: "1",
    },
    { title: "Pokemon Pikachu Plush Stuffed Animal", listingId: "2" },
    { title: "Custom Acrylic Pokemon Card", listingId: "3" },
    { title: "Charizard V Full Art 154/172 Pokemon TCG", listingId: "4" },
    { title: "Pokemon Mousepad Gaming Large Extended", listingId: "5" },
  ];

  // Get results via batch function
  const batchResults = await shouldExcludeListingsBatch(testListings);

  // Get results via individual calls
  const individualResults = await Promise.all(
    testListings.map((listing) => shouldExcludeListingFromCardSurfaces(listing))
  );

  // Verify parity
  assert.equal(batchResults.length, individualResults.length);

  for (let i = 0; i < testListings.length; i++) {
    const batch = batchResults[i].result;
    const individual = individualResults[i];

    assert.equal(
      batch.excluded,
      individual.excluded,
      `Mismatch for "${testListings[i].title}": batch.excluded=${batch.excluded}, individual.excluded=${individual.excluded}`
    );
    assert.equal(
      batch.hardBlocked,
      individual.hardBlocked,
      `Mismatch for "${testListings[i].title}": batch.hardBlocked=${batch.hardBlocked}, individual.hardBlocked=${individual.hardBlocked}`
    );
    assert.equal(
      batch.softExcluded,
      individual.softExcluded,
      `Mismatch for "${testListings[i].title}": batch.softExcluded=${batch.softExcluded}, individual.softExcluded=${individual.softExcluded}`
    );
    assert.equal(
      batch.category,
      individual.category,
      `Mismatch for "${testListings[i].title}": batch.category=${batch.category}, individual.category=${individual.category}`
    );
    assert.equal(
      batch.hit,
      individual.hit,
      `Mismatch for "${testListings[i].title}": batch.hit=${batch.hit}, individual.hit=${individual.hit}`
    );
  }
});

test("shouldExcludeListingsBatch handles empty array", async () => {
  const batchResults = await shouldExcludeListingsBatch([]);
  assert.equal(batchResults.length, 0);
});

test("shouldExcludeListingsBatch preserves listing order", async () => {
  const testListings = [
    { title: "First Listing", listingId: "a" },
    { title: "Second Listing", listingId: "b" },
    { title: "Third Listing", listingId: "c" },
  ];

  const batchResults = await shouldExcludeListingsBatch(testListings);

  assert.equal(batchResults[0].listing.title, "First Listing");
  assert.equal(batchResults[1].listing.title, "Second Listing");
  assert.equal(batchResults[2].listing.title, "Third Listing");
});

test("shouldExcludeListingFromCardSurfacesSync matches async version for non-override cases", async () => {
  const testCases = [
    { title: "Umbreon VMAX 215/203 Alternate Art" },
    { title: "Pokemon Pikachu Plush Toy" },
    { title: "Custom Acrylic Card" },
  ];

  for (const listing of testCases) {
    const asyncResult = await shouldExcludeListingFromCardSurfaces(listing);
    const syncResult = shouldExcludeListingFromCardSurfacesSync(
      listing,
      undefined
    );

    assert.equal(
      asyncResult.excluded,
      syncResult.excluded,
      `Mismatch for "${listing.title}"`
    );
    assert.equal(
      asyncResult.hardBlocked,
      syncResult.hardBlocked,
      `Mismatch for "${listing.title}"`
    );
    assert.equal(
      asyncResult.softExcluded,
      syncResult.softExcluded,
      `Mismatch for "${listing.title}"`
    );
  }
});

test("shouldExcludeListingsBatch passes card context correctly", async () => {
  const testListings = [
    {
      title: "Umbreon VMAX Rainbow 215/203 Pokemon",
      listingId: "1",
      card: {
        name: "Umbreon VMAX",
        setName: "Evolving Skies",
        number: "215/203",
        rarity: "Alternate Art Rare", // Not rainbow - should block
      },
    },
  ];

  const batchResults = await shouldExcludeListingsBatch(testListings);

  assert.equal(batchResults[0].result.excluded, true);
  assert.equal(batchResults[0].result.hardBlocked, true);
});
