import test from "node:test";
import assert from "node:assert/strict";

import { detectCardLanguage } from "../../rebuild/scripts/language";

test("detects Japanese via script", () => {
  const result = detectCardLanguage("エーフィ VMAX ハイクラス");
  assert.equal(result.lang, "JP");
  assert.equal(result.confidence, "HIGH");
});

test("detects Japanese via token", () => {
  const result = detectCardLanguage("Pokemon Japanese Promo Card");
  assert.equal(result.lang, "JP");
  assert.equal(result.confidence, "MED");
});

test("neutral title remains UNKNOWN", () => {
  const result = detectCardLanguage("Pokemon Umbreon VMAX");
  assert.equal(result.lang, "UNKNOWN");
});

test("unicode noise does not trigger JP", () => {
  const result = detectCardLanguage("Pokemon ☆彡 Seller Bonus");
  assert.equal(result.lang, "UNKNOWN");
});
