import test from "node:test";
import assert from "node:assert/strict";

import { buildRecentSoldQuery } from "../update-historical-prices";

test("recent sold query partitions by card language and market", () => {
  const sql = buildRecentSoldQuery();
  assert.ok(
    /JOIN cards c ON c\.id = es\.card_id/i.test(sql),
    "expected join to cards table for language",
  );
  assert.ok(/c\.language/i.test(sql), "expected language column in select");
  assert.ok(
    /GROUP BY card_id, condition, language, market/i.test(sql),
    "expected group by language + market",
  );
});
