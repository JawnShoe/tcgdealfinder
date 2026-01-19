import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import ConfidenceBadge from "@/components/rebuild/ConfidenceBadge";
import ComplianceDisclosure from "@/components/rebuild/ComplianceDisclosure";
import DiscoveryFiltersBar from "@/components/rebuild/DiscoveryFiltersBar";
import IntentPrefetchLink from "@/components/rebuild/IntentPrefetchLink";
import ProvenanceDrilldown from "@/components/rebuild/ProvenanceDrilldown";
import ResilienceLabel from "@/components/rebuild/ResilienceLabel";
import { isRebuildDbConfigured } from "@/lib/rebuild/data/dataAvailability";
import { ensureRebuildCardsLanguageColumn } from "@/lib/rebuild/data/schema";
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
  filterDealsByDiscoveryQuery,
  MAX_DISCOVERY_FETCH_LIMIT,
  orderDealsForDiscovery,
  paginateDiscoveryResults,
  parseDiscoveryQuery,
} from "@/lib/rebuild/discovery/discoveryQuery";
import { evaluateResilience } from "@/lib/rebuild/resilience/evaluateResilience";
import { buildDiscoveryCanonicalUrl } from "@/lib/rebuild/seo/canonical";
import { buildRebuildTitle } from "@/lib/rebuild/seo/meta";
import { buildListingUrl } from "@/lib/rebuild/urls";

const discoveryTitle = buildRebuildTitle("Discovery");
const discoveryDescription =
  "Browse recent deals from the rebuild pipeline with trust signals.";

type DiscoveryPageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

function toCanonicalDiscoveryUrl(url: string): string {
  return url.replace("/rebuild/discovery", "/discovery");
}

export async function generateMetadata({
  searchParams,
}: DiscoveryPageProps): Promise<Metadata> {
  const canonical = toCanonicalDiscoveryUrl(
    buildDiscoveryCanonicalUrl(searchParams)
  );
  return {
    title: discoveryTitle,
    description: discoveryDescription,
    alternates: {
      canonical,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: discoveryTitle,
      description: discoveryDescription,
      url: canonical,
    },
    twitter: {
      title: discoveryTitle,
      description: discoveryDescription,
    },
  };
}

export default async function DiscoveryPage({
  searchParams,
}: DiscoveryPageProps) {
  const start = Date.now();
  const requestId = getRequestIdFromHeaders(headers());
  let status = 200;
  let requestError: unknown;

  const parsedQuery = parseDiscoveryQuery(searchParams ?? {});
  if (parsedQuery.kind !== "ok") {
    status = 404;
    logRequest({
      level: "info",
      msg: "rebuild.discovery.render",
      route: "/discovery",
      requestId,
      durationMs: Date.now() - start,
      status,
      error: parsedQuery,
    });
    notFound();
  }

  const query = parsedQuery.query;

  try {
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
              explanation="Discovery disabled via kill switch"
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
    if (isDbConfigured) {
      await ensureRebuildCardsLanguageColumn({
        route: "/discovery",
        requestId,
      });
    }
    const fetchLimit = Math.min(
      query.pagination.page * query.pagination.pageSize,
      MAX_DISCOVERY_FETCH_LIMIT
    );

    const { deals, fetchedAtISO } = await getRecentDeals(fetchLimit);
    const orderedDeals = orderDealsForDiscovery(deals, query.preset);
    const filteredDeals = filterDealsByDiscoveryQuery(orderedDeals, query);
    const { deduped: dedupedDeals, duplicates } = dedupeDeals(filteredDeals);
    const discoveryResult = paginateDiscoveryResults(
      dedupedDeals,
      query.pagination
    );
    const pageDeals = discoveryResult.items;
    const ageSeconds = deals
      .map((deal) => deal.freshness.dataAgeSeconds)
      .filter((value): value is number => value != null);
    const maxAgeSeconds = ageSeconds.length ? Math.max(...ageSeconds) : null;
    const hasMissingAge =
      deals.length > 0 && ageSeconds.length !== deals.length;

    const resilienceResult = evaluateResilience({
      dbAvailable: isDbConfigured,
      cacheAvailable: false,
      cacheAgeMs: maxAgeSeconds !== null ? maxAgeSeconds * 1000 : null,
      requiredFieldsPresent: !hasMissingAge,
      dataCount: deals.length,
    });

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
            tier={resilienceResult.tier}
            explanation={resilienceResult.explanation}
          />

          <header className="rounded-lg border border-slate-200 bg-white p-6">
            <h1 className="text-2xl font-semibold text-slate-900">Discovery</h1>
            <p className="mt-2 text-sm text-slate-700">
              Browse recent deals from the rebuild pipeline.
            </p>
          </header>

          <DiscoveryFiltersBar
            initialPreset={query.preset}
            initialFilters={query.filters}
          />

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Recent deals
              </h2>
              <p
                data-testid="discovery-results-count"
                data-count={pageDeals.length}
                className="text-xs text-slate-500"
              >
                {pageDeals.length} result
                {pageDeals.length !== 1 ? "s" : ""}
              </p>
            </div>

            {pageDeals.length === 0 ? (
              <div
                data-testid="discovery-empty-state"
                className="mt-4 rounded-md border border-slate-100 bg-slate-50 px-4 py-6 text-center"
              >
                <p className="text-sm text-slate-600">
                  {isDbConfigured
                    ? "No deals available at this time."
                    : "Rebuild data source not configured in this environment."}
                </p>
                {isDbConfigured ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Try clearing filters or lowering the confidence threshold.
                  </p>
                ) : null}
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {pageDeals.map((deal) => {
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
                            href={buildListingUrl({ id: deal.listingId })}
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
                          <p className="mt-1 text-xs text-slate-500">
                            {deal.condition
                              ? `Condition ${deal.condition}`
                              : "Condition unknown"}{" "}
                            • {deal.language} • {deal.freshness.dataAgeLabel}
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
                          <p className="mt-1 text-xs text-slate-500">
                            Confidence {deal.trust.confidence.display} •{" "}
                            {deal.trustAssessment.state.toLowerCase()}
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
      route: "/discovery",
      requestId,
      durationMs: Date.now() - start,
      status,
      error: requestError,
    });
  }
}
