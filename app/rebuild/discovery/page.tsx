import { headers } from "next/headers";
import ConfidenceBadge from "@/components/rebuild/ConfidenceBadge";
import ComplianceDisclosure from "@/components/rebuild/ComplianceDisclosure";
import IntentPrefetchLink from "@/components/rebuild/IntentPrefetchLink";
import PreferencesBar from "@/components/rebuild/PreferencesBar";
import ProvenanceDrilldown from "@/components/rebuild/ProvenanceDrilldown";
import ResilienceLabel, {
  ResilienceMode,
  ResilienceTier,
} from "@/components/rebuild/ResilienceLabel";
import { isRebuildDbConfigured } from "@/lib/rebuild/data/dataAvailability";
import { getRecentDeals } from "@/lib/rebuild/data/getRecentDeals";
import {
  dedupeDeals,
  normalizeListingKey,
} from "@/lib/rebuild/dedupe/crossMarketDedupe";
import {
  getRequestIdFromHeaders,
  logRequest,
} from "@/lib/rebuild/observability/logging";
import {
  parseRebuildPrefs,
  sortDealsByPrefs,
} from "@/lib/rebuild/prefs/rebuildPrefs";

const FRESHNESS_SLO_SECONDS = 15 * 60;

type RebuildDiscoveryPageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function RebuildDiscoveryPage({
  searchParams,
}: RebuildDiscoveryPageProps) {
  const start = Date.now();
  const requestId = getRequestIdFromHeaders(headers());
  let status = 200;
  let requestError: unknown;

  try {
    const prefs = parseRebuildPrefs(searchParams ?? {});
    const isDiscoveryDisabled =
      process.env.KILL_FEATURE_REBUILD_DISCOVERY === "1";
    if (isDiscoveryDisabled) {
      return (
        <main className="min-h-screen bg-slate-50">
          <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              Rebuild lane - Discovery temporarily disabled
            </div>
            <ResilienceLabel
              className="mb-6"
              tier="UNAVAILABLE"
              mode="UNKNOWN"
            />
            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h1 className="text-2xl font-semibold text-slate-900">
                Discovery
              </h1>
              <p className="mt-2 text-sm text-slate-700">
                Discovery is temporarily disabled via
                KILL_FEATURE_REBUILD_DISCOVERY.
              </p>
            </section>
            <ComplianceDisclosure className="mt-6" />
          </div>
        </main>
      );
    }
    const isDbConfigured = isRebuildDbConfigured();
    const { deals, fetchedAtISO } = await getRecentDeals(25);
    const orderedDeals = sortDealsByPrefs(deals, prefs);
    const { deduped: dedupedDeals, duplicates } = dedupeDeals(orderedDeals);
    const ageSeconds = deals
      .map((deal) => deal.freshness.dataAgeSeconds)
      .filter((value): value is number => value != null);
    const maxAgeSeconds = ageSeconds.length ? Math.max(...ageSeconds) : null;
    const hasMissingAge =
      deals.length > 0 && ageSeconds.length !== deals.length;

    let resilienceTier: ResilienceTier = "FULL";
    let resilienceMode: ResilienceMode = "LIVE";
    if (!isDbConfigured) {
      resilienceTier = "UNAVAILABLE";
      resilienceMode = "UNKNOWN";
    } else if (deals.length === 0) {
      resilienceTier = "DEGRADED";
    } else if (hasMissingAge) {
      resilienceTier = "DEGRADED";
    } else if (maxAgeSeconds != null && maxAgeSeconds > FRESHNESS_SLO_SECONDS) {
      resilienceTier = "DEGRADED";
    }

    const provenanceFields = [
      { label: "DB configured", value: isDbConfigured ? "yes" : "no" },
    ];

    if (isDbConfigured) {
      provenanceFields.push({ label: "Data fetched at", value: fetchedAtISO });
    }

    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Rebuild lane - Discovery (pipeline data)
          </div>
          <ResilienceLabel
            className="mb-6"
            tier={resilienceTier}
            mode={resilienceMode}
          />

          <header className="rounded-lg border border-slate-200 bg-white p-6">
            <h1 className="text-2xl font-semibold text-slate-900">Discovery</h1>
            <p className="mt-2 text-sm text-slate-700">
              Browse recent deals from the rebuild pipeline.
            </p>
          </header>

          <PreferencesBar initialSort={prefs.sort} />

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Recent deals
              </h2>
              <p className="text-xs text-slate-500">
                {dedupedDeals.length} result
                {dedupedDeals.length !== 1 ? "s" : ""}
              </p>
            </div>

            {dedupedDeals.length === 0 ? (
              <div className="mt-4 rounded-md border border-slate-100 bg-slate-50 px-4 py-6 text-center">
                <p className="text-sm text-slate-600">
                  {isDbConfigured
                    ? "No deals available at this time."
                    : "Rebuild data source not configured in this environment."}
                </p>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {dedupedDeals.map((deal) => {
                  const duplicateGroup = duplicates.get(
                    normalizeListingKey(deal)
                  );
                  const duplicateCount = duplicateGroup
                    ? duplicateGroup.length - 1
                    : 0;

                  return (
                    <li key={deal.listingId} className="py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <IntentPrefetchLink
                            href={`/rebuild/listing/${encodeURIComponent(
                              deal.listingId
                            )}`}
                            className="text-sm font-medium text-slate-900 hover:text-slate-700"
                          >
                            {deal.title}
                          </IntentPrefetchLink>
                          <p className="mt-1 text-xs text-slate-500">
                            {deal.seller.name ??
                              deal.seller.username ??
                              "Unknown"}{" "}
                            at{" "}
                            {deal.provenance.market ?? deal.provenance.source}
                          </p>
                          {duplicateCount > 0 ? (
                            <p className="mt-1 text-xs text-slate-500">
                              Also seen in {duplicateCount} other market
                              {duplicateCount !== 1 ? "s" : ""}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            {deal.price.display}
                          </p>
                          <p
                            className={`text-xs font-medium ${
                              (deal.price.discountPercent ?? 0) < 0
                                ? "text-emerald-700"
                                : "text-slate-500"
                            }`}
                          >
                            {deal.price.deltaDisplay}
                          </p>
                          <ConfidenceBadge
                            label={deal.trust.confidence.label}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <ProvenanceDrilldown
              className="mt-4"
              summary={
                isDbConfigured
                  ? `Fetched at ${fetchedAtISO}`
                  : "DB not configured"
              }
              fields={provenanceFields}
            />
          </section>

          <ComplianceDisclosure className="mt-6" />
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
      msg: "rebuild.discovery.render",
      route: "/rebuild/discovery",
      requestId,
      durationMs: Date.now() - start,
      status,
      error: requestError,
    });
  }
}
