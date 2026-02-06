import test from "node:test";
import assert from "node:assert/strict";

import {
  getRebuildApiMetricsSnapshot,
  getRebuildOutboundClicksSnapshot,
  mapMetricsTableError,
  recordRebuildApiRequest,
  recordRebuildOutboundClick,
} from "@/lib/rebuild/observability/metrics";

const missingApiTableError = {
  code: "42P01",
  message: 'relation "rebuild_api_requests" does not exist',
};

const missingClicksTableError = {
  message: 'relation "rebuild_outbound_clicks" does not exist',
};

test("mapMetricsTableError maps SQLSTATE 42P01 to not_instrumented", () => {
  const mapped = mapMetricsTableError(missingApiTableError);
  assert.deepEqual(mapped, { status: "not_instrumented", shouldLog: false });
});

test("mapMetricsTableError supports message fallback for missing metrics tables", () => {
  const mapped = mapMetricsTableError(missingClicksTableError);
  assert.deepEqual(mapped, { status: "not_instrumented", shouldLog: false });
});

test("API metrics snapshot degrades without logging when tables are missing", async () => {
  let logCalls = 0;

  const snapshot = await getRebuildApiMetricsSnapshot({
    isDbConfigured: () => true,
    query: async () => {
      throw missingApiTableError;
    },
    logError: () => {
      logCalls += 1;
    },
  });

  assert.equal(snapshot.status, "not_instrumented");
  assert.equal(logCalls, 0);
});

test("API metrics snapshot returns error and logs unexpected DB failures", async () => {
  let logCalls = 0;

  const snapshot = await getRebuildApiMetricsSnapshot({
    isDbConfigured: () => true,
    query: async () => {
      throw new Error("boom");
    },
    logError: () => {
      logCalls += 1;
    },
  });

  assert.equal(snapshot.status, "error");
  assert.equal(logCalls, 1);
});

test("outbound metrics snapshot degrades without logging when tables are missing", async () => {
  let logCalls = 0;

  const snapshot = await getRebuildOutboundClicksSnapshot({
    isDbConfigured: () => true,
    query: async () => {
      throw missingClicksTableError;
    },
    logError: () => {
      logCalls += 1;
    },
  });

  assert.equal(snapshot.status, "not_instrumented");
  assert.equal(logCalls, 0);
});

test("metrics inserts suppress logging for missing tables but log unexpected errors", async () => {
  let logCalls = 0;

  await recordRebuildApiRequest(
    {
      route: "/ops",
      statusCode: 200,
      durationMs: 42,
      requestId: "req-missing",
    },
    {
      isDbConfigured: () => true,
      query: async () => {
        throw missingApiTableError;
      },
      logError: () => {
        logCalls += 1;
      },
    }
  );

  await recordRebuildOutboundClick(
    {
      listingId: "listing-1",
      url: "https://example.com/listing-1",
      requestId: "req-error",
    },
    {
      isDbConfigured: () => true,
      query: async () => {
        throw new Error("db unavailable");
      },
      logError: () => {
        logCalls += 1;
      },
    }
  );

  assert.equal(logCalls, 1);
});
