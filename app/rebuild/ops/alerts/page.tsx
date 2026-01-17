import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  getRequestIdFromHeaders,
  logRequest,
} from "@/lib/rebuild/observability/logging";
import { buildCanonicalUrl } from "@/lib/rebuild/seo/canonical";
import { buildRebuildTitle } from "@/lib/rebuild/seo/meta";
import { listWatches, listRecentAlerts } from "@/lib/rebuild/data/alertsOps";
import { AlertsToolClient } from "./AlertsToolClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const alertsTitle = buildRebuildTitle("Alerts");
const alertsDescription = "Rebuild ops view for alerts watchlist management.";

export const metadata: Metadata = {
  title: alertsTitle,
  description: alertsDescription,
  alternates: {
    canonical: buildCanonicalUrl("/rebuild/ops/alerts"),
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: alertsTitle,
    description: alertsDescription,
    url: buildCanonicalUrl("/rebuild/ops/alerts"),
  },
  twitter: {
    title: alertsTitle,
    description: alertsDescription,
  },
};

export default async function RebuildOpsAlertsPage() {
  const start = Date.now();
  const requestId = getRequestIdFromHeaders(headers());
  let status = 200;
  let requestError: unknown;

  try {
    // Fetch watches and alerts (safe - returns empty arrays on DB issues)
    let watches: Awaited<ReturnType<typeof listWatches>> = [];
    let alerts: Awaited<ReturnType<typeof listRecentAlerts>> = [];
    let fetchError: string | null = null;
    let isDbNotInitialized = false;

    try {
      [watches, alerts] = await Promise.all([
        listWatches(),
        listRecentAlerts(50),
      ]);
    } catch (err: unknown) {
      // Check for missing table error (42P01 = undefined_table in PostgreSQL)
      const pgError = err as { code?: string };
      if (pgError.code === "42P01") {
        isDbNotInitialized = true;
        fetchError =
          "Database not initialized (missing alerts_watchlist or alerts_log table)";
      } else {
        fetchError =
          err instanceof Error ? err.message : "Failed to fetch alerts data";
      }
      console.error("[rebuild/ops/alerts] fetch error:", err);
    }

    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Rebuild lane - Ops Alerts
          </div>

          <header className="rounded-lg border border-slate-200 bg-white p-6">
            <h1 className="text-2xl font-semibold text-slate-900">Alerts</h1>
            <p className="mt-2 text-sm text-slate-700">
              Manage alert watchlist rules. When a watched card meets the
              threshold criteria, an alert is logged.
            </p>
          </header>

          {isDbNotInitialized ? (
            <section
              className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-6"
              data-testid="db-not-initialized"
            >
              <h2 className="text-lg font-semibold text-amber-900">
                Database Not Initialized
              </h2>
              <p className="mt-2 text-sm text-amber-700">
                The alerts_watchlist or alerts_log table does not exist. Run
                migrations to initialize the database.
              </p>
            </section>
          ) : fetchError ? (
            <section className="mt-6 rounded-lg border border-red-200 bg-red-50 p-6">
              <h2 className="text-lg font-semibold text-red-900">
                Database Error
              </h2>
              <p className="mt-2 text-sm text-red-700">{fetchError}</p>
            </section>
          ) : (
            <AlertsToolClient initialWatches={watches} initialAlerts={alerts} />
          )}
        </div>
      </main>
    );
  } catch (error) {
    status = 500;
    requestError = error;
    throw error;
  } finally {
    logRequest({
      level: status >= 500 ? "error" : "info",
      msg: "rebuild.ops.alerts.render",
      route: "/rebuild/ops/alerts",
      requestId,
      durationMs: Date.now() - start,
      status,
      error: requestError,
    });
  }
}
