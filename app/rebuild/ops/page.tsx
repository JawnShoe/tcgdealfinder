import { headers } from "next/headers";
import { isRebuildDbConfigured } from "@/lib/rebuild/data/dataAvailability";
import { getRebuildFreshnessSnapshot } from "@/lib/rebuild/data/getRebuildOpsSnapshot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HealthSnapshot = {
  status: "ok" | "error" | "unavailable";
  payload: unknown | null;
  error: string | null;
};

async function getHealthSnapshot(): Promise<HealthSnapshot> {
  try {
    const headerStore = headers();
    const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
    if (!host) {
      return {
        status: "unavailable",
        payload: null,
        error: "Host header unavailable.",
      };
    }

    const protocol =
      headerStore.get("x-forwarded-proto") ??
      (host.includes("localhost") ? "http" : "https");

    const response = await fetch(`${protocol}://${host}/api/health`, {
      cache: "no-store",
    });

    const bodyText = await response.text();
    if (!response.ok) {
      return {
        status: "error",
        payload: null,
        error: `HTTP ${response.status}`,
      };
    }

    try {
      return {
        status: "ok",
        payload: JSON.parse(bodyText),
        error: null,
      };
    } catch {
      return {
        status: "ok",
        payload: { raw: bodyText },
        error: null,
      };
    }
  } catch (error) {
    return {
      status: "error",
      payload: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export default async function RebuildOpsPage() {
  const isDbConfigured = isRebuildDbConfigured();
  const freshness = await getRebuildFreshnessSnapshot();
  const health = await getHealthSnapshot();

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

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Rebuild lane - Ops dashboards
        </div>

        <header className="rounded-lg border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-semibold text-slate-900">Rebuild Ops</h1>
          <p className="mt-2 text-sm text-slate-700">
            Operational visibility and sanity checks for rebuild surfaces.
          </p>
        </header>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Freshness</h2>
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
            <h2 className="text-lg font-semibold text-slate-900">Errors</h2>
            <span
              className={
                health.status === "ok"
                  ? "text-sm font-semibold text-emerald-800"
                  : "text-sm font-semibold text-amber-900"
              }
            >
              {health.status === "ok" ? "OK" : "CHECK"}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-700">
            /api/health snapshot (server-side).
          </p>
          {health.error ? (
            <p className="mt-3 text-sm text-slate-700">
              Health fetch error: {health.error}
            </p>
          ) : null}
          <pre className="mt-4 max-h-64 overflow-auto rounded-md border border-slate-100 bg-slate-50 p-3 text-xs text-slate-800">
            {JSON.stringify(health.payload, null, 2)}
          </pre>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">CWV proxy</h2>
          <p className="mt-2 text-sm text-slate-700">
            Targets for rebuild surfaces (static placeholders).
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-900">
            <li>LCP target: &lt;= 2.5s</li>
            <li>CLS target: &lt;= 0.1</li>
            <li>INP target: &lt;= 200ms</li>
          </ul>
          <p className="mt-3 text-xs text-slate-600">
            Last CI run: placeholder (see CI checks for perf and CLS gates).
          </p>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Outbound clicks
          </h2>
          <p className="mt-2 text-sm text-slate-700">Not instrumented yet.</p>
        </section>
      </div>
    </main>
  );
}
