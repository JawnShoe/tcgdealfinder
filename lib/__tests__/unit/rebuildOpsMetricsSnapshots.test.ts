import test, { afterEach, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

import {
  getRebuildApiMetricsSnapshot,
  getRebuildOutboundClicksSnapshot,
} from "@/lib/rebuild/observability/metrics";

const TEST_DATABASE_URL = "postgres://test-user:test-pass@localhost:5432/test";

function setRebuildPoolQuery(
  queryImpl: (text: string, params?: any[]) => Promise<unknown>
) {
  (globalThis as any).rebuildPgPool = {
    query: queryImpl,
  };
}

const MISSING_API_TABLE_ERROR = {
  code: "42P01",
  message: 'relation "rebuild_api_requests" does not exist',
};

const MISSING_CLICKS_TABLE_ERROR = {
  code: "42P01",
  message: 'relation "rebuild_outbound_clicks" does not exist',
};

let previousDatabaseUrl: string | undefined;
let previousPool: unknown;

beforeEach(() => {
  previousDatabaseUrl = process.env.DATABASE_URL;
  previousPool = (globalThis as any).rebuildPgPool;
  process.env.DATABASE_URL = TEST_DATABASE_URL;
});

afterEach(() => {
  process.env.DATABASE_URL = previousDatabaseUrl;
  (globalThis as any).rebuildPgPool = previousPool;
  mock.restoreAll();
});

test("getRebuildApiMetricsSnapshot returns unavailable and does not console.error when table is missing", async () => {
  setRebuildPoolQuery(async () => {
    throw MISSING_API_TABLE_ERROR;
  });
  const consoleError = mock.method(console, "error", () => {});

  const snapshot = await getRebuildApiMetricsSnapshot();

  assert.equal(snapshot.status, "unavailable");
  assert.equal(consoleError.mock.calls.length, 0);
});

test("getRebuildOutboundClicksSnapshot returns unavailable and does not console.error when table is missing", async () => {
  setRebuildPoolQuery(async () => {
    throw MISSING_CLICKS_TABLE_ERROR;
  });
  const consoleError = mock.method(console, "error", () => {});

  const snapshot = await getRebuildOutboundClicksSnapshot();

  assert.equal(snapshot.status, "unavailable");
  assert.equal(consoleError.mock.calls.length, 0);
});

test("unexpected metrics query errors still surface as error status and console.error", async () => {
  setRebuildPoolQuery(async () => {
    throw new Error("boom");
  });
  const consoleError = mock.method(console, "error", () => {});

  const apiSnapshot = await getRebuildApiMetricsSnapshot();
  const clicksSnapshot = await getRebuildOutboundClicksSnapshot();

  assert.equal(apiSnapshot.status, "error");
  assert.equal(clicksSnapshot.status, "error");
  assert.ok(consoleError.mock.calls.length >= 2);
});
