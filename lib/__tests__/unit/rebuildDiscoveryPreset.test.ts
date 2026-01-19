import test from "node:test";
import assert from "node:assert/strict";

import {
  ALLOWED_PRESETS,
  DEFAULT_REBUILD_SORT,
  parsePreset,
  parseRebuildPrefs,
} from "@/lib/rebuild/prefs/rebuildPrefs";

test("discovery presets are centrally allowlisted", () => {
  assert.deepEqual(ALLOWED_PRESETS, [
    "newest",
    "biggest-discount",
    "endingSoon",
  ]);
});

test("parsePreset defaults when missing", () => {
  assert.equal(parsePreset(null), DEFAULT_REBUILD_SORT);
  assert.equal(parsePreset(""), DEFAULT_REBUILD_SORT);
  assert.equal(parsePreset("   "), DEFAULT_REBUILD_SORT);
});

test("parsePreset normalizes endingSoon aliases", () => {
  assert.equal(parsePreset("endingSoon"), "endingSoon");
  assert.equal(parsePreset("ending-soon"), "endingSoon");
  assert.equal(parsePreset("endingsoon"), "endingSoon");
});

test("parsePreset returns invalid sentinel for unknown presets", () => {
  assert.deepEqual(parsePreset("unknown"), { kind: "invalid" });
  assert.deepEqual(parsePreset("biggest_discount"), { kind: "invalid" });
});

test("parseRebuildPrefs returns invalid result for unknown preset", () => {
  const result = parseRebuildPrefs({ sort: "not-a-preset" });
  assert.equal(result.kind, "invalid_preset");
});
