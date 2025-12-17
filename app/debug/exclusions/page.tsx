import { notFound, redirect } from "next/navigation";
import { query } from "@/lib/db";
import {
  shouldExcludeListingFromCardSurfaces,
  getSoftExclusionReason,
  getBlacklistReason,
  type CardContext,
  type ListingExclusionResult,
} from "@/lib/blacklist";
import { getMarketEmoji } from "@/lib/markets";
import { checkDebugAuth } from "@/lib/debugAuth";
import ExclusionsClient from "./ExclusionsClient";

// =============================================================================
// TYPES
// =============================================================================

type TimeframePreset = "1h" | "6h" | "24h" | "3d" | "7d" | "30d";

type ExcludedListing = {
  id: number;
  listingId: string;
  title: string;
  url: string;
  market: string;
  priceCad: number | null;
  shippingCad: number | null;
  totalPriceCad: number | null;
  sellerUsername: string | null;
  seller: string | null;
  createdAt: Date | null;
  endsAt: Date | null;
  cardId: number | null;
  cardName: string | null;
  cardSetName: string | null;
  cardNumber: string | null;
  cardRarity: string | null;
  exclusionKind: "hard" | "soft";
  exclusionReason: string;
  exclusionHit: string | null;
};

type ExclusionStats = {
  totalScanned: number;
  totalExcluded: number;
  hardCount: number;
  softCount: number;
  topHardHits: Array<{ hit: string; count: number }>;
  topSoftHits: Array<{ hit: string; count: number }>;
};

// =============================================================================
// TIMEFRAME PARSING
// =============================================================================

const TIMEFRAME_HOURS: Record<TimeframePreset, number> = {
  "1h": 1,
  "6h": 6,
  "24h": 24,
  "3d": 72,
  "7d": 168,
  "30d": 720,
};

function parseTimeframe(searchParams: Record<string, string | string[] | undefined>): {
  hours: number;
  label: string;
} {
  // Prefer sinceHours if provided
  const sinceHoursRaw = Array.isArray(searchParams.sinceHours)
    ? searchParams.sinceHours[0]
    : searchParams.sinceHours;
  
  if (sinceHoursRaw) {
    const parsed = parseInt(sinceHoursRaw, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(720, parsed));
      return { hours: clamped, label: `${clamped}h (custom)` };
    }
  }
  
  // Use since preset (or deprecated 'timeframe' alias)
  const sinceRaw = Array.isArray(searchParams.since)
    ? searchParams.since[0]
    : searchParams.since;
  
  const timeframeRaw = Array.isArray(searchParams.timeframe)
    ? searchParams.timeframe[0]
    : searchParams.timeframe;
  
  // Prefer 'since', fall back to deprecated 'timeframe'
  const preset = (sinceRaw ?? timeframeRaw) as TimeframePreset;
  if (preset && TIMEFRAME_HOURS[preset]) {
    return { hours: TIMEFRAME_HOURS[preset], label: preset };
  }
  
  // Default: 24h
  return { hours: 24, label: "24h" };
}

function parseKind(searchParams: Record<string, string | string[] | undefined>): "all" | "hard" | "soft" {
  const kindRaw = Array.isArray(searchParams.kind)
    ? searchParams.kind[0]
    : searchParams.kind;
  
  if (kindRaw === "hard" || kindRaw === "soft") {
    return kindRaw;
  }
  return "all";
}

function parseLimit(searchParams: Record<string, string | string[] | undefined>): number {
  const limitRaw = Array.isArray(searchParams.limit)
    ? searchParams.limit[0]
    : searchParams.limit;
  
  if (limitRaw) {
    const parsed = parseInt(limitRaw, 10);
    if (!isNaN(parsed)) {
      return Math.max(10, Math.min(1000, parsed));
    }
  }
  return 200;
}

// =============================================================================
// DATA FETCHING
// =============================================================================

type ListingRow = {
  id: number;
  listing_id: string;
  title: string;
  url: string;
  market: string;
  price_cad: string | null;
  shipping_cad: string | null;
  total_price_cad: string | null;
  seller_username: string | null;
  seller: string | null;
  created_at: Date | null;
  ends_at: Date | null;
  card_id: number | null;
  card_name: string | null;
  card_set_name: string | null;
  card_number: string | null;
  card_rarity: string | null;
};

async function fetchRecentListings(hours: number, limit: number): Promise<ListingRow[]> {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  // Fetch with a higher internal limit to account for filtering
  // We'll process in app and take the first `limit` excluded items
  const internalLimit = Math.min(limit * 5, 5000);
  
  const result = await query<ListingRow>(
    `SELECT 
      l.id,
      l.listing_id,
      l.title,
      l.url,
      l.market,
      l.price_cad,
      l.shipping_cad,
      l.total_price_cad,
      l.seller_username,
      l.seller,
      l.created_at,
      l.ends_at,
      l.card_id,
      c.name AS card_name,
      c.set_name AS card_set_name,
      c.card_number AS card_number,
      NULL::TEXT AS card_rarity
    FROM listings l
    LEFT JOIN cards c ON l.card_id = c.id
    WHERE l.created_at >= $1
    ORDER BY l.created_at DESC
    LIMIT $2`,
    [cutoff, internalLimit]
  );
  
  return result.rows;
}

async function processExclusions(
  rows: ListingRow[],
  kindFilter: "all" | "hard" | "soft",
  limit: number
): Promise<{ excluded: ExcludedListing[]; stats: ExclusionStats }> {
  const excluded: ExcludedListing[] = [];
  const hardHits: Record<string, number> = {};
  const softHits: Record<string, number> = {};
  let hardCount = 0;
  let softCount = 0;
  
  for (const row of rows) {
    const cardContext: CardContext | undefined = row.card_id
      ? {
          name: row.card_name,
          setName: row.card_set_name,
          number: row.card_number,
          rarity: row.card_rarity,
        }
      : undefined;
    
    const result = await shouldExcludeListingFromCardSurfaces(
      { title: row.title, listingId: row.listing_id },
      cardContext
    );
    
    if (!result.excluded) {
      continue;
    }
    
    const kind = result.hardBlocked ? "hard" : "soft";
    
    // Track stats for all excluded items (before kind filter)
    if (kind === "hard") {
      hardCount++;
      if (result.hit) {
        hardHits[result.hit] = (hardHits[result.hit] ?? 0) + 1;
      }
    } else {
      softCount++;
      if (result.hit) {
        softHits[result.hit] = (softHits[result.hit] ?? 0) + 1;
      }
    }
    
    // Apply kind filter
    if (kindFilter !== "all" && kindFilter !== kind) {
      continue;
    }
    
    // Only add to display list if under limit
    if (excluded.length < limit) {
      excluded.push({
        id: row.id,
        listingId: row.listing_id,
        title: row.title,
        url: row.url,
        market: row.market,
        priceCad: row.price_cad ? parseFloat(row.price_cad) : null,
        shippingCad: row.shipping_cad ? parseFloat(row.shipping_cad) : null,
        totalPriceCad: row.total_price_cad ? parseFloat(row.total_price_cad) : null,
        sellerUsername: row.seller_username,
        seller: row.seller,
        createdAt: row.created_at,
        endsAt: row.ends_at,
        cardId: row.card_id,
        cardName: row.card_name,
        cardSetName: row.card_set_name,
        cardNumber: row.card_number,
        cardRarity: row.card_rarity,
        exclusionKind: kind,
        exclusionReason: result.reason ?? "unknown",
        exclusionHit: result.hit ?? null,
      });
    }
  }
  
  const topHardHits = Object.entries(hardHits)
    .map(([hit, count]) => ({ hit, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  const topSoftHits = Object.entries(softHits)
    .map(([hit, count]) => ({ hit, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    excluded,
    stats: {
      totalScanned: rows.length,
      totalExcluded: hardCount + softCount,
      hardCount,
      softCount,
      topHardHits,
      topSoftHits,
    },
  };
}

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
              <span className="font-mono text-slate-300">"{h.hit}"</span>
              <span className="text-slate-400">{h.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Export types for client component
export type { ExcludedListing };
