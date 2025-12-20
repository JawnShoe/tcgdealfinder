import { notFound, redirect } from "next/navigation";
import {
  parseTimeframe,
  parseKind,
  parseLimit,
  fetchRecentListings,
  processExclusions,
  type TimeframePreset,
} from "./exclusionsData";
import { checkDebugAuth } from "@/lib/debugAuth";
import ExclusionsClient from "./ExclusionsClient";
import { IntegrityReviewPanel } from "./IntegrityReviewPanel";

// =============================================================================
// TYPES
// =============================================================================


// =============================================================================
// PAGE COMPONENT
// =============================================================================

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ExclusionsQuarantinePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ?? {};
  
  // Security: check auth via cookie > header > query param
  const auth = checkDebugAuth(params);
  
  if (!auth.valid) {
    notFound();
  }
  
  // If authenticated via query param, redirect through login route to set cookie
  // This is necessary because cookies can only be set in Route Handlers, not Server Components
  if (auth.shouldSetCookieAndRedirect && auth.queryToken) {
    // Build the final destination URL (without token)
    const cleanParams = new URLSearchParams();
    const since = Array.isArray(params.since) ? params.since[0] : params.since;
    const sinceHours = Array.isArray(params.sinceHours) ? params.sinceHours[0] : params.sinceHours;
    const kind = Array.isArray(params.kind) ? params.kind[0] : params.kind;
    const limit = Array.isArray(params.limit) ? params.limit[0] : params.limit;
    
    if (since) cleanParams.set("since", since);
    if (sinceHours) cleanParams.set("sinceHours", sinceHours);
    if (kind) cleanParams.set("kind", kind);
    if (limit) cleanParams.set("limit", limit);
    
    const finalDestination = `/debug/exclusions${cleanParams.toString() ? `?${cleanParams.toString()}` : ""}`;
    
    // Redirect to login route which will set the cookie and redirect back
    const loginUrl = `/debug/login?token=${encodeURIComponent(auth.queryToken)}&redirect=${encodeURIComponent(finalDestination)}`;
    redirect(loginUrl);
  }
  
  // Parse query params
  const timeframe = parseTimeframe(params);
  const kindFilter = parseKind(params);
  const limitVal = parseLimit(params);
  
  // Fetch and process data
  const rows = await fetchRecentListings(timeframe.hours, limitVal);
  const { excluded, stats } = await processExclusions(rows, kindFilter, limitVal);
  
  // Calculate sinceDate for override checks
  const sinceDate = new Date(Date.now() - timeframe.hours * 60 * 60 * 1000);
  
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-amber-400">
            🔒 Exclusions Quarantine
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Review and manage excluded listings (hard blocks + soft merch exclusions).
            Use ALLOW/HARD_BLOCK/SOFT_EXCLUDE buttons to apply overrides.
          </p>
        </div>

        <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Operator workflow moved to <span className="font-mono">/admin</span>{" "}
          (Exclusions tab). This debug page remains available for debug-only
          triage.
        </div>
        
        {/* Active Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded bg-slate-700 px-2 py-1">
            ⏱️ {timeframe.label}
          </span>
          <span className="rounded bg-slate-700 px-2 py-1">
            🎯 {kindFilter === "all" ? "all" : kindFilter}
          </span>
          <span className="rounded bg-slate-700 px-2 py-1">
            📊 limit: {limitVal}
          </span>
          <span className="rounded bg-slate-700 px-2 py-1">
            📥 scanned: {stats.totalScanned}
          </span>
          <span className="rounded bg-amber-900 px-2 py-1 text-amber-300">
            🚫 excluded: {stats.totalExcluded}
          </span>
        </div>
        
        {/* Quick Filters */}
        <div className="mb-6 space-y-3">
          {/* Timeframe buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 uppercase">Since:</span>
            {(["1h", "6h", "24h", "3d", "7d", "30d"] as TimeframePreset[]).map((t) => (
              <a
                key={t}
                href={`/debug/exclusions?since=${t}&kind=${kindFilter}&limit=${limitVal}`}
                className={`rounded px-3 py-1 text-sm transition ${
                  timeframe.label === t
                    ? "bg-amber-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {t}
              </a>
            ))}
          </div>
          
          {/* Kind buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 uppercase">Kind:</span>
            {(["all", "hard", "soft"] as const).map((k) => (
              <a
                key={k}
                href={`/debug/exclusions?since=${timeframe.label.replace(" (custom)", "")}&kind=${k}&limit=${limitVal}`}
                className={`rounded px-3 py-1 text-sm transition ${
                  kindFilter === k
                    ? "bg-amber-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {k}
              </a>
            ))}
          </div>
          
          {/* Limit buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 uppercase">Limit:</span>
            {[50, 100, 200, 500, 1000].map((l) => (
              <a
                key={l}
                href={`/debug/exclusions?since=${timeframe.label.replace(" (custom)", "")}&kind=${kindFilter}&limit=${l}`}
                className={`rounded px-3 py-1 text-sm transition ${
                  limitVal === l
                    ? "bg-amber-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {l}
              </a>
            ))}
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Scanned" value={stats.totalScanned} color="slate" />
          <StatCard label="Total Excluded" value={stats.totalExcluded} color="amber" />
          <StatCard label="Hard Blocked" value={stats.hardCount} color="red" />
          <StatCard label="Soft Excluded" value={stats.softCount} color="blue" />
        </div>
        
        {/* Top Hits */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <TopHitsCard title="Top Hard Block Hits" hits={stats.topHardHits} color="red" />
          <TopHitsCard title="Top Soft Exclusion Hits" hits={stats.topSoftHits} color="blue" />
        </div>
        
        {/* Client Component for Interactive Table */}
        <ExclusionsClient listings={excluded} sinceDate={sinceDate} />
        <IntegrityReviewPanel sinceIso={sinceDate.toISOString()} />
      </div>
    </main>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "slate" | "amber" | "red" | "blue";
}) {
  const bgColors = {
    slate: "bg-slate-800",
    amber: "bg-amber-900/50",
    red: "bg-red-900/50",
    blue: "bg-blue-900/50",
  };
  const textColors = {
    slate: "text-slate-100",
    amber: "text-amber-300",
    red: "text-red-300",
    blue: "text-blue-300",
  };
  
  return (
    <div className={`rounded-lg ${bgColors[color]} p-4`}>
      <div className="text-xs text-slate-400 uppercase">{label}</div>
      <div className={`text-2xl font-bold ${textColors[color]}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function TopHitsCard({
  title,
  hits,
  color,
}: {
  title: string;
  hits: Array<{ hit: string; count: number }>;
  color: "red" | "blue";
}) {
  const headerColor = color === "red" ? "text-red-400" : "text-blue-400";
  
  return (
    <div className="rounded-lg bg-slate-800 p-4">
      <h3 className={`mb-2 text-sm font-semibold ${headerColor}`}>{title}</h3>
      {hits.length === 0 ? (
        <p className="text-sm text-slate-500">No hits</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {hits.map((h, i) => (
            <li key={i} className="flex justify-between">
              <span className="font-mono text-slate-300">&quot;{h.hit}&quot;</span>
              <span className="text-slate-400">{h.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

