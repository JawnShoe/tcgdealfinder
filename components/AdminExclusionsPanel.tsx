import type { TimeframePreset } from "@/app/debug/exclusions/exclusionsData";
import {
  fetchRecentListings,
  parseKind,
  parseLimit,
  parseTimeframe,
  processExclusions,
} from "@/app/debug/exclusions/exclusionsData";
import ExclusionsClient from "@/app/debug/exclusions/ExclusionsClient";

type SearchParams = Record<string, string | string[] | undefined>;

type AdminExclusionsPanelProps = {
  searchParams?: SearchParams;
  basePath?: string;
  baseQuery?: string;
};

export async function AdminExclusionsPanel({
  searchParams,
  basePath = "/admin/exclusions",
  baseQuery,
}: AdminExclusionsPanelProps) {
  const params = searchParams ?? {};
  const timeframe = parseTimeframe(params);
  const kindFilter = parseKind(params);
  const limitVal = parseLimit(params);

  const rows = await fetchRecentListings(timeframe.hours, limitVal);
  const { excluded, stats } = await processExclusions(
    rows,
    kindFilter,
    limitVal,
  );

  const sinceDate = new Date(Date.now() - timeframe.hours * 60 * 60 * 1000);
  const queryPrefix = baseQuery ? `${baseQuery}&` : "";

  return (
    <>
      <div className="panel">
        <h1 className="text-2xl font-semibold text-slate-900">
          Exclusions Quarantine
        </h1>
        <p className="text-sm text-slate-500">
          Review excluded listings (hard blocks + soft merch exclusions).
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded bg-slate-700 px-2 py-1 text-white">
          Since: {timeframe.label}
        </span>
        <span className="rounded bg-slate-700 px-2 py-1 text-white">
          Kind: {kindFilter}
        </span>
        <span className="rounded bg-slate-700 px-2 py-1 text-white">
          Limit: {limitVal}
        </span>
        <span className="rounded bg-slate-700 px-2 py-1 text-white">
          Scanned: {stats.totalScanned}
        </span>
        <span className="rounded bg-amber-900 px-2 py-1 text-amber-200">
          Excluded: {stats.totalExcluded}
        </span>
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 uppercase">Since:</span>
          {(["1h", "6h", "24h", "3d", "7d", "30d"] as TimeframePreset[]).map(
            (t) => (
              <a
                key={t}
                href={`${basePath}?${queryPrefix}since=${t}&kind=${kindFilter}&limit=${limitVal}`}
                className={`rounded px-3 py-1 text-sm transition ${
                  timeframe.label === t
                    ? "bg-amber-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {t}
              </a>
            ),
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 uppercase">Kind:</span>
          {(["all", "hard", "soft"] as const).map((k) => (
            <a
              key={k}
              href={`${basePath}?${queryPrefix}since=${timeframe.label.replace(" (custom)", "")}&kind=${k}&limit=${limitVal}`}
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

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 uppercase">Limit:</span>
          {[50, 100, 200, 500, 1000].map((l) => (
            <a
              key={l}
              href={`${basePath}?${queryPrefix}since=${timeframe.label.replace(" (custom)", "")}&kind=${kindFilter}&limit=${l}`}
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

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Scanned" value={stats.totalScanned} color="slate" />
        <StatCard label="Total Excluded" value={stats.totalExcluded} color="amber" />
        <StatCard label="Hard Blocked" value={stats.hardCount} color="red" />
        <StatCard label="Soft Excluded" value={stats.softCount} color="blue" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <TopHitsCard title="Top Hard Block Hits" hits={stats.topHardHits} color="red" />
        <TopHitsCard title="Top Soft Exclusion Hits" hits={stats.topSoftHits} color="blue" />
      </div>

      <ExclusionsClient
        listings={excluded}
        sinceDate={sinceDate}
        enableOverrides={false}
        enableActions={false}
        showAdminTools={false}
      />
    </>
  );
}

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
