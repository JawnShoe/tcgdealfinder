import type { Metadata } from "next";
import { headers } from "next/headers";
import { isRebuildDbConfigured } from "@/lib/rebuild/data/dataAvailability";
import { getRebuildFreshnessSnapshot } from "@/lib/rebuild/data/getRebuildOpsSnapshot";
import {
  evaluateResilience,
  getTierLabel,
  type ResilienceTier,
} from "@/lib/rebuild/resilience/evaluateResilience";
import {
  getRequestIdFromHeaders,
  logRequest,
} from "@/lib/rebuild/observability/logging";
import {
  getRebuildApiMetricsSnapshot,
  getRebuildOutboundClicksSnapshot,
} from "@/lib/rebuild/observability/metrics";
import { buildCanonicalUrl } from "@/lib/rebuild/seo/canonical";
import { buildRebuildTitle } from "@/lib/rebuild/seo/meta";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const opsTitle = buildRebuildTitle("Ops");
const opsDescription =
  "Rebuild ops dashboards for freshness, errors, latency, and outbound clicks.";

export const metadata: Metadata = {
  title: opsTitle,
  description: opsDescription,
  alternates: {
    canonical: buildCanonicalUrl("/rebuild/ops"),
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: opsTitle,
    description: opsDescription,
    url: buildCanonicalUrl("/rebuild/ops"),
  },
  twitter: {
    title: opsTitle,
    description: opsDescription,
  },
};

function formatPercent(value: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return "n/a";
  }
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return "n/a";
  }
  return `${Math.round(value)}`;
}

function getTierColorClass(tier: ResilienceTier): string {
  switch (tier) {
    case "LIVE":
      return "text-emerald-800";
    case "CACHED":
      return "text-blue-800";
    case "STALE":
      return "text-amber-800";
    case "PARTIAL":
      return "text-orange-800";
    case "UNAVAILABLE":
      return "text-slate-700";
  }
}

type RouteResilienceStatus = {
  route: string;
  tier: ResilienceTier;
  explanation: string;
};

export default async function RebuildOpsPage() {
  const start = Date.now();
  const headersList = await headers();
  const requestId = getRequestIdFromHeaders(headersList);
  let status = 200;
  let requestError: unknown;

  try {
    const isOpsDisabled = process.env.KILL_ROUTE_REBUILD_OPS === "1";
    if (isOpsDisabled) {
      return (
        <main className="min-h-screen bg-slate-50">
          <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              Rebuild lane - Ops temporarily disabled
            </div>
            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h1 className="text-2xl font-semibold text-slate-900">
                Rebuild Ops
              </h1>
              <p className="mt-2 text-sm text-slate-700">
                This route is disabled via KILL_ROUTE_REBUILD_OPS.
              </p>
            </section>
          </div>
        </main>
      );
    }
    const isDbConfigured = isRebuildDbConfigured();
    const freshness = await getRebuildFreshnessSnapshot();
    const apiMetrics = await getRebuildApiMetricsSnapshot();
    const outboundClicks = await getRebuildOutboundClicksSnapshot();

    // Compute resilience status for each route based on current data availability
    const freshnessAgeMs =
      freshness.ageHours != null ? freshness.ageHours * 60 * 60 * 1000 : null;

    const routeResilienceStatuses: RouteResilienceStatus[] = [
      {
        route: "/rebuild",
        ...evaluateResilience({
          dbAvailable: isDbConfigured,
          cacheAvailable: false,
          cacheAgeMs: freshnessAgeMs,
          requiredFieldsPresent: freshness.count24h != null,
          dataCount: freshness.count24h ?? 0,
        }),
      },
      {
        route: "/rebuild/discovery",
        ...evaluateResilience({
          dbAvailable: isDbConfigured,
          cacheAvailable: false,
          cacheAgeMs: freshnessAgeMs,
          requiredFieldsPresent: freshness.count24h != null,
          dataCount: freshness.count24h ?? 0,
        }),
      },
      {
        route: "/rebuild/listing/[id]",
        ...evaluateResilience({
          dbAvailable: isDbConfigured,
          cacheAvailable: false,
          cacheAgeMs: freshnessAgeMs,
          requiredFieldsPresent: true,
          dataCount: isDbConfigured ? 1 : 0,
        }),
      },
      {
        route: "/rebuild/alerts",
        ...evaluateResilience({
          dbAvailable: isDbConfigured,
          cacheAvailable: false,
          cacheAgeMs: null,
          requiredFieldsPresent: false, // Alerts not yet available
          dataCount: 0,
        }),
      },
      {
        route: "/rebuild/ops",
        ...evaluateResilience({
          dbAvailable: isDbConfigured,
          cacheAvailable: false,
          cacheAgeMs: null,
          requiredFieldsPresent: true,
          dataCount: isDbConfigured ? 1 : 0,
        }),
      },
    ];

    const freshnessStatus = isDbConfigured ? freshness.status : "unavailable";
    const freshnessStatusLabel =
      freshnessStatus === "ok"
        ? "OK"
        : freshnessStatus === "stale"
          ? "STALE"
          : freshnessStatus === "unavailable"
            ? "UNAVAILABLE"
            : "UNKNOWN";

    const freshnessStatusClass =
      freshnessStatus === "ok"
        ? "text-emerald-800"
        : freshnessStatus === "stale"
          ? "text-amber-900"
          : "text-slate-700";

    const apiStatusLabel =
      apiMetrics.status === "available"
        ? "OK"
        : apiMetrics.status === "empty"
          ? "NO DATA"
          : apiMetrics.status === "error"
            ? "ERROR"
            : "UNAVAILABLE";

    const apiStatusClass =
      apiMetrics.status === "available"
        ? "text-emerald-800"
        : apiMetrics.status === "empty"
          ? "text-amber-900"
          : "text-slate-700";

    const clicksStatusLabel =
      outboundClicks.status === "available"
        ? "OK"
        : outboundClicks.status === "empty"
          ? "NO DATA"
          : outboundClicks.status === "error"
            ? "ERROR"
            : "UNAVAILABLE";

    const clicksStatusClass =
      outboundClicks.status === "available"
        ? "text-emerald-800"
        : outboundClicks.status === "empty"
          ? "text-amber-900"
          : "text-slate-700";

    const apiEmptyMessage =
      apiMetrics.status === "empty"
        ? "No API traffic recorded yet."
        : apiMetrics.status === "error"
          ? "Metrics query failed."
          : "Not instrumented yet.";

    const clicksEmptyMessage =
      outboundClicks.status === "empty"
        ? "No outbound clicks recorded yet."
        : outboundClicks.status === "error"
          ? "Metrics query failed."
          : "Not instrumented yet.";

    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Rebuild lane - Ops dashboards
          </div>

          <header className="rounded-lg border border-slate-200 bg-white p-6">
            <h1 className="text-2xl font-semibold text-slate-900">
              Rebuild Ops
            </h1>
            <p className="mt-2 text-sm text-slate-700">
              Operational visibility and sanity checks for rebuild surfaces.
            </p>
          </header>

          <section
            className="mt-6 rounded-lg border border-slate-200 bg-white p-6"
            data-testid="resilience-tiers-panel"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Resilience Tiers (C4)
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              Current degradation tier for each rebuild route.
            </p>
            <dl className="mt-4 space-y-2">
              {routeResilienceStatuses.map((status) => (
                <div
                  key={status.route}
                  className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <dt className="font-mono text-sm text-slate-900">
                    {status.route}
                  </dt>
                  <dd className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${getTierColorClass(status.tier)}`}
                    >
                      {getTierLabel(status.tier)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {status.explanation}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-slate-600">
              Tiers: LIVE (full data) → CACHED (from cache) → STALE (expired
              cache) → PARTIAL (missing fields) → UNAVAILABLE (no data).
            </p>
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Job freshness
              </h2>
              <span className={`text-sm font-semibold ${freshnessStatusClass}`}>
                {freshnessStatusLabel}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-700">
              Data source configured: {isDbConfigured ? "Yes" : "No"}
            </p>
            <dl className="mt-4 grid gap-3 text-sm text-slate-900 sm:grid-cols-2">
              <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                  Latest updated_at
                </dt>
                <dd className="mt-1 font-mono text-slate-900">
                  {freshness.latestUpdatedAtISO ?? "n/a"}
                </dd>
              </div>
              <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                  Age (hours)
                </dt>
                <dd className="mt-1 font-mono text-slate-900">
                  {freshness.ageHours ?? "n/a"}
                </dd>
              </div>
              <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                  Listings last 24h
                </dt>
                <dd className="mt-1 font-mono text-slate-900">
                  {freshness.count24h ?? "n/a"}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-slate-600">
              Stale threshold: &gt; 6 hours since latest update.
            </p>
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                API error rate
              </h2>
              <span className={`text-sm font-semibold ${apiStatusClass}`}>
                {apiStatusLabel}
              </span>
            </div>
            {apiMetrics.status === "available" ? (
              <dl className="mt-4 grid gap-3 text-sm text-slate-900 sm:grid-cols-3">
                <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                    Error rate
                  </dt>
                  <dd className="mt-1 font-mono text-slate-900">
                    {formatPercent(apiMetrics.errorRate)}
                  </dd>
                </div>
                <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                    Requests
                  </dt>
                  <dd className="mt-1 font-mono text-slate-900">
                    {apiMetrics.totalRequests}
                  </dd>
                </div>
                <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                    Window
                  </dt>
                  <dd className="mt-1 font-mono text-slate-900">
                    {apiMetrics.windowMinutes}m
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-slate-700">{apiEmptyMessage}</p>
            )}
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Latency</h2>
              <span className={`text-sm font-semibold ${apiStatusClass}`}>
                {apiStatusLabel}
              </span>
            </div>
            {apiMetrics.status === "available" ? (
              <dl className="mt-4 grid gap-3 text-sm text-slate-900 sm:grid-cols-3">
                <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                    P50 (ms)
                  </dt>
                  <dd className="mt-1 font-mono text-slate-900">
                    {formatNumber(apiMetrics.p50Ms)}
                  </dd>
                </div>
                <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                    P95 (ms)
                  </dt>
                  <dd className="mt-1 font-mono text-slate-900">
                    {formatNumber(apiMetrics.p95Ms)}
                  </dd>
                </div>
                <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                    Window
                  </dt>
                  <dd className="mt-1 font-mono text-slate-900">
                    {apiMetrics.windowMinutes}m
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-slate-700">
                {apiMetrics.status === "empty"
                  ? "No latency samples recorded yet."
                  : apiEmptyMessage}
              </p>
            )}
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Outbound clicks
              </h2>
              <span className={`text-sm font-semibold ${clicksStatusClass}`}>
                {clicksStatusLabel}
              </span>
            </div>
            {outboundClicks.status === "available" ? (
              <dl className="mt-4 grid gap-3 text-sm text-slate-900 sm:grid-cols-3">
                <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                    Last 24h
                  </dt>
                  <dd className="mt-1 font-mono text-slate-900">
                    {outboundClicks.last24hClicks}
                  </dd>
                </div>
                <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                    Total
                  </dt>
                  <dd className="mt-1 font-mono text-slate-900">
                    {outboundClicks.totalClicks}
                  </dd>
                </div>
                <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                    Last click
                  </dt>
                  <dd className="mt-1 font-mono text-slate-900">
                    {outboundClicks.lastClickedAtISO ?? "n/a"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-slate-700">
                {clicksEmptyMessage}
              </p>
            )}
          </section>
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
      msg: "rebuild.ops.render",
      route: "/rebuild/ops",
      requestId,
      durationMs: Date.now() - start,
      status,
      error: requestError,
    });
  }
}
