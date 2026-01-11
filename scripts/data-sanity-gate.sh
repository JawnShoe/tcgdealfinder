#!/usr/bin/env bash
set -euo pipefail

node <<'NODE'
const { Client } = require("pg");
const { randomUUID } = require("crypto");

const connectionString = process.env.DATABASE_URL;
const jobId = randomUUID();

const log = (level, msg, extra = {}) => {
  const payload = {
    level,
    msg,
    ts: new Date().toISOString(),
    job: "data-sanity-gate",
    jobId,
    ...extra,
  };
  console.log(JSON.stringify(payload));
};

if (!connectionString) {
  log("info", "data-sanity.skip", { reason: "DATABASE_URL not set" });
  process.exit(0);
}

const checks = [
  {
    name: "negative total_price_cad",
    countSql: "SELECT COUNT(*)::int AS count FROM listings WHERE total_price_cad < 0;",
    sampleSql:
      "SELECT listing_id FROM listings WHERE total_price_cad < 0 LIMIT 20;",
  },
  {
    name: "discount_percent out of bounds",
    countSql:
      "SELECT COUNT(*)::int AS count FROM listings WHERE discount_percent IS NOT NULL AND (discount_percent < -95 OR discount_percent > 95);",
    sampleSql:
      "SELECT listing_id FROM listings WHERE discount_percent IS NOT NULL AND (discount_percent < -95 OR discount_percent > 95) LIMIT 20;",
  },
  {
    name: "missing url",
    countSql:
      "SELECT COUNT(*)::int AS count FROM listings WHERE url IS NULL OR BTRIM(url) = '';",
    sampleSql:
      "SELECT listing_id FROM listings WHERE url IS NULL OR BTRIM(url) = '' LIMIT 20;",
  },
];

(async () => {
  const client = new Client({ connectionString });
  await client.connect();

  let failed = false;

  for (const check of checks) {
    const countRes = await client.query(check.countSql);
    const count = Number(countRes.rows[0]?.count ?? 0);

    if (count > 0) {
      failed = true;
      const sampleRes = await client.query(check.sampleSql);
      const samples = sampleRes.rows.map(
        (row) => row.listing_id ?? row.id ?? "unknown"
      );

      log("error", "data-sanity.check.fail", {
        check: check.name,
        count,
        sampleIds: samples,
      });
    } else {
      log("info", "data-sanity.check.pass", { check: check.name });
    }
  }

  const freshnessRes = await client.query(
    "SELECT MAX(updated_at) AS latest_updated_at FROM listings;"
  );
  const latestRaw = freshnessRes.rows[0]?.latest_updated_at;

  if (!latestRaw) {
    log("warn", "data-sanity.freshness.missing");
  } else {
    const latest = new Date(latestRaw);
    const ageHours = (Date.now() - latest.getTime()) / 36e5;
    if (Number.isFinite(ageHours) && ageHours > 168) {
      log("warn", "data-sanity.freshness.stale", {
        ageHours: Math.round(ageHours),
      });
    } else {
      log("info", "data-sanity.freshness.ok");
    }
  }

  await client.end();

  log("info", "data-sanity.complete", { failed });

  if (failed) {
    process.exit(1);
  }
})().catch((error) => {
  log("error", "data-sanity.crash", {
    errorName: error?.name ?? "Error",
    errorMessage: error?.message ?? String(error),
  });
  process.exit(1);
});
NODE
