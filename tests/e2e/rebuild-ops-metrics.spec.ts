import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const databaseUrl = process.env.DATABASE_URL;
const migrationPath = join(
  process.cwd(),
  "migrations",
  "015_add_rebuild_observability.sql"
);
const metricsMissingCopy =
  "Metrics tables not present in this environment yet.";

test.skip(!databaseUrl, "DATABASE_URL not set for rebuild ops metrics tests.");

test.describe.configure({ mode: "serial" });

async function withDbClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function dropMetricsTables(): Promise<void> {
  await withDbClient(async (client) => {
    await client.query(
      "DROP TABLE IF EXISTS rebuild_api_requests; DROP TABLE IF EXISTS rebuild_outbound_clicks;"
    );
  });
}

async function applyMetricsMigration(): Promise<void> {
  const migrationSql = readFileSync(migrationPath, "utf8");

  await withDbClient(async (client) => {
    await client.query(migrationSql);
  });
}

async function seedMetricsRows(): Promise<void> {
  await withDbClient(async (client) => {
    await client.query("TRUNCATE TABLE rebuild_api_requests;");
    await client.query("TRUNCATE TABLE rebuild_outbound_clicks;");

    await client.query(
      `
        INSERT INTO rebuild_api_requests (route, status_code, duration_ms, request_id)
        VALUES ('/ops', 200, 87, 'ops-metrics-e2e-api')
      `
    );

    await client.query(
      `
        INSERT INTO rebuild_outbound_clicks (listing_id, url, request_id)
        VALUES ('rebuild-e2e-1', 'https://example.com/rebuild-e2e-1', 'ops-metrics-e2e-click')
      `
    );
  });
}

test("ops metrics degrades safely when metrics tables are missing", async ({
  page,
}) => {
  await dropMetricsTables();

  await page.goto(`${baseURL}/ops`, { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("ops-api-metrics-status")).toHaveText(
    "NOT INSTRUMENTED"
  );
  await expect(page.getByTestId("ops-latency-status")).toHaveText(
    "NOT INSTRUMENTED"
  );
  await expect(page.getByTestId("ops-outbound-clicks-status")).toHaveText(
    "NOT INSTRUMENTED"
  );

  await expect(page.getByTestId("ops-api-metrics-empty-message")).toHaveText(
    metricsMissingCopy
  );
  await expect(page.getByTestId("ops-latency-empty-message")).toHaveText(
    metricsMissingCopy
  );
  await expect(
    page.getByTestId("ops-outbound-clicks-empty-message")
  ).toHaveText(metricsMissingCopy);
});

test("ops metrics render normally when metrics migration is applied", async ({
  page,
}) => {
  await applyMetricsMigration();
  await seedMetricsRows();

  await page.goto(`${baseURL}/ops`, { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("ops-api-metrics-status")).toHaveText("OK");
  await expect(page.getByTestId("ops-latency-status")).toHaveText("OK");
  await expect(page.getByTestId("ops-outbound-clicks-status")).toHaveText("OK");
  await expect(page.getByText(metricsMissingCopy)).toHaveCount(0);
});
