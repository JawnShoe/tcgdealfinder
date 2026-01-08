#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "SKIP: DATABASE_URL not set"
  exit 0
fi

node <<'NODE'
const { Client } = require("pg");

const connectionString = process.env.DATABASE_URL;

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

      console.error(`[FAIL] ${check.name}: ${count} rows`);
      if (samples.length) {
        console.error(`Sample listing_id: ${samples.join(", ")}`);
      }
    } else {
      console.log(`[PASS] ${check.name}`);
    }
  }

  const freshnessRes = await client.query(
    "SELECT MAX(updated_at) AS latest_updated_at FROM listings;"
  );
  const latestRaw = freshnessRes.rows[0]?.latest_updated_at;

  if (!latestRaw) {
    console.warn("[WARN] freshness: no updated_at values found");
  } else {
    const latest = new Date(latestRaw);
    const ageHours = (Date.now() - latest.getTime()) / 36e5;
    if (Number.isFinite(ageHours) && ageHours > 168) {
      console.warn(
        `[WARN] freshness: latest updated_at is ${Math.round(ageHours)} hours old`
      );
    } else {
      console.log("[PASS] freshness: latest updated_at within 7 days");
    }
  }

  await client.end();

  if (failed) {
    process.exit(1);
  }
})().catch((error) => {
  console.error("[FAIL] data-sanity-gate crashed", error);
  process.exit(1);
});
NODE
