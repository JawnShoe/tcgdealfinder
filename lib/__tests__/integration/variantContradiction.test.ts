import test from "node:test";
import assert from "node:assert/strict";

import {
  getVariantContradictionReason,
  getBlacklistReason,
  type CardContext,
} from "../../blacklist";

// =============================================================================
// getVariantContradictionReason tests
// =============================================================================

test("should block hard contradiction keywords regardless of card context", () => {
  const hardKeywords = [
    "gold",
    "metal",
    "acrylic",
    "proxy",
    "replica",
    "custom",
    "fan art",
    "display case",
    "stainless steel",
  ];

  for (const keyword of hardKeywords) {
    const result = getVariantContradictionReason({
      listingTitle: `Pokemon Charizard ${keyword} card rare`,
    });
    assert.equal(
      result.blocked,
      true,
      `Expected "${keyword}" to be blocked`
    );
    assert.equal(result.category, "variant_contradiction");
    assert.equal(result.reason, "hard_modifier_contradiction");
  }
});

test("should block rainbow in title for non-rainbow card with secret number", () => {
  // Umbreon VMAX 215/203 is NOT a rainbow rare - it's an alternate art
  const result = getVariantContradictionReason({
    listingTitle: "Umbreon VMAX 215/203 Rainbow Rare Pokemon Card",
    card: {
      name: "Umbreon VMAX",
      setName: "Evolving Skies",
      number: "215/203",
      rarity: null, // unknown rarity
    },
  });
  
  assert.equal(result.blocked, true);
  assert.equal(result.reason, "rainbow_modifier_contradiction");
  assert.equal(result.hit, "rainbow");
});

test("should block rainbow in title when rarity confirms non-rainbow", () => {
  const result = getVariantContradictionReason({
    listingTitle: "Charizard VMAX Rainbow Card",
    card: {
      name: "Charizard VMAX",
      setName: "Darkness Ablaze",
      number: "020/189",
      rarity: "Ultra Rare", // Not a rainbow rare
    },
  });
  
  assert.equal(result.blocked, true);
  assert.equal(result.reason, "rainbow_modifier_contradiction");
});

test("should allow rainbow in title for actual rainbow rare", () => {
  const result = getVariantContradictionReason({
    listingTitle: "Charizard VMAX Rainbow Rare 074/073",
    card: {
      name: "Charizard VMAX",
      setName: "Champions Path",
      number: "074/073",
      rarity: "Rainbow Rare", // Actually a rainbow rare
    },
  });
  
  assert.equal(result.blocked, false);
});

test("should allow rainbow in title when card name includes rainbow", () => {
  const result = getVariantContradictionReason({
    listingTitle: "Rainbow Energy Trainer Card",
    card: {
      name: "Rainbow Energy",
      setName: "Base Set",
      number: "95/102",
      rarity: null,
    },
  });
  
  assert.equal(result.blocked, false);
});

test("should not block rainbow for cards without secret numbers (conservative)", () => {
  // Normal card number, no rarity info - be conservative and allow
  const result = getVariantContradictionReason({
    listingTitle: "Pikachu Rainbow something",
    card: {
      name: "Pikachu",
      setName: "Base Set",
      number: "25/102", // Normal number, not secret
      rarity: null,
    },
  });
  
  assert.equal(result.blocked, false);
});

test("should not block rainbow when no card context provided", () => {
  // Without card context, we can't determine contradiction
  const result = getVariantContradictionReason({
    listingTitle: "Pokemon Card Rainbow Rare",
  });
  
  // Only hard keywords should block without card context
  assert.equal(result.blocked, false);
});

// =============================================================================
// getBlacklistReason integration tests with card context
// =============================================================================

test("getBlacklistReason should check variant contradictions when card provided", () => {
  const result = getBlacklistReason(
    { title: "Umbreon VMAX 215/203 Rainbow Secret" },
    {
      name: "Umbreon VMAX",
      setName: "Evolving Skies",
      number: "215/203",
      rarity: "Alternate Art Secret Rare",
    }
  );
  
  assert.equal(result.blocked, true);
  assert.equal(result.category, "variant_contradiction");
});

test("getBlacklistReason should allow legit rainbow rare with card context", () => {
  const result = getBlacklistReason(
    { title: "Charizard VMAX Rainbow Rare 074/073" },
    {
      name: "Charizard VMAX",
      setName: "Champions Path",
      number: "074/073",
      rarity: "Rainbow Rare",
    }
  );
  
  assert.equal(result.blocked, false);
});

test("getBlacklistReason should still block hard keywords without card context", () => {
  // Hard keywords like "metal" should block even without card context
  const result = getBlacklistReason(
    { title: "Charizard Metal Gold Card Custom" }
  );
  
  // Should be blocked by existing BANNED_TITLE_KEYWORDS or variant contradiction
  assert.equal(result.blocked, true);
});

test("should block SV-prefixed cards claiming rainbow", () => {
  const result = getVariantContradictionReason({
    listingTitle: "Miraidon ex SV107 Rainbow Pokemon",
    card: {
      name: "Miraidon ex",
      setName: "Paldea Evolved",
      number: "SV107/SV122",
      rarity: null,
    },
  });
  
  assert.equal(result.blocked, true);
  assert.equal(result.reason, "rainbow_modifier_contradiction");
});
