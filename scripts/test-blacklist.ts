/**
 * Test the blacklist function with known bad and good titles
 */

import { getBlacklistReason } from "../lib/blacklist";

// Titles that SHOULD be blocked (fake/non-card items)
const badTitles = [
  // Acrylic material
  "Pokemon Umbreon VMAX 215/203 - Acrylic Custom Display Card",
  // Display case / art extender (UK)
  "Umbreon Vmax 215/203 pokemon card display case art extender",
  // Metal material
  "Pokemon Card TCG / Metal Umbreon VMAX Evolving Skies 215/203 Pokemon Gold Metal",
  // Carta replica (international)
  "Pokemon Umbreon VMAX 215/203 Carta Replica Custom Edition",
  // Wall art
  "ULTRA RARE Umbreon VMAX GLITCH 215/203 Evolving Skies Pokemon Alt Art WALL ART",
  // Card case (not a card)
  "Lugia V Alt Art 186/195 Extended Art Pokemon Card Case (Card not Included)",
];

// Titles that SHOULD be allowed (real cards)
const goodTitles = [
  "Pokemon Umbreon VMAX 215/203 Alt Art SWSH Evolving Skies",
  "Umbreon VMAX Moonbreon Alt Art 215/203 PSA 10 Gem Mint",
  "Pokemon Umbreon VMAX Secret Rare 215/203 Evolving Skies",
  "POKEMON TCG Sword & Shield Silver Tempest LUGIA V ALT ART 186/195 PSA 9",
  "Pokemon Giratina V 186/196 Alt Art Card PSA 10 Lost Origin",
  "Pokemon Umbreon VMAX 215/203 Alt Art SWSH Evolving Skies - PSA 10 + Free Acrylic",
  "Pokemon Lugia v Silver Tempest Alternative Full Art Card #186/195 CGC 9",
];

console.log("=== SHOULD BE BLOCKED (bad listings) ===\n");
let badFailed = 0;
for (const title of badTitles) {
  const result = getBlacklistReason({ title });
  const status = result.blocked ? "✅ BLOCKED" : "❌ NOT BLOCKED";
  console.log(`${status}: ${title.substring(0, 65)}...`);
  if (result.blocked) {
    console.log(`   Reason: ${result.reason}`);
  }
  if (!result.blocked) badFailed++;
  console.log();
}

console.log("\n=== SHOULD BE ALLOWED (real cards) ===\n");
let goodFailed = 0;
for (const title of goodTitles) {
  const result = getBlacklistReason({ title });
  const status = result.blocked ? "❌ BLOCKED" : "✅ ALLOWED";
  console.log(`${status}: ${title.substring(0, 65)}...`);
  if (result.blocked) {
    console.log(`   Reason: ${result.reason}`);
    goodFailed++;
  }
  console.log();
}

console.log("\n=== SUMMARY ===");
console.log(`Bad listings correctly blocked: ${badTitles.length - badFailed}/${badTitles.length}`);
console.log(`Good listings correctly allowed: ${goodTitles.length - goodFailed}/${goodTitles.length}`);

if (badFailed === 0 && goodFailed === 0) {
  console.log("\n✅ All tests passed!");
  process.exit(0);
} else {
  console.log(`\n❌ ${badFailed + goodFailed} test(s) failed!`);
  process.exit(1);
}
