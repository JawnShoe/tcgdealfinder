import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import ComplianceDisclosure from "@/components/rebuild/ComplianceDisclosure";
import DiscoveryFiltersBar from "@/components/rebuild/DiscoveryFiltersBar";
import DiscoveryPaginationControls from "@/components/rebuild/DiscoveryPaginationControls";
import ExpandableDealList from "@/components/rebuild/ExpandableDealList";
import ProvenanceDrilldown from "@/components/rebuild/ProvenanceDrilldown";
import ResilienceLabel from "@/components/rebuild/ResilienceLabel";
import { isRebuildDbConfigured } from "@/lib/rebuild/data/dataAvailability";
import { getRecentDeals } from "@/lib/rebuild/data/getRecentDeals";
import { ensureRebuildCardsLanguageColumn } from "@/lib/rebuild/data/schema";
import {
  dedupeDeals,
  normalizeListingKey,
} from "@/lib/rebuild/dedupe/crossMarketDedupe";
import {
  DEFAULT_DISCOVERY_PAGE_SIZE,
  MAX_DISCOVERY_FETCH_LIMIT,
  filterDealsByDiscoveryQuery,
  orderDealsForDiscovery,
  paginateDiscoveryResults,
  parseDiscoveryQuery,
} from "@/lib/rebuild/discovery/discoveryQuery";
import {
  getRequestIdFromHeaders,
  logRequest,
} from "@/lib/rebuild/observability/logging";
import { evaluateResilience } from "@/lib/rebuild/resilience/evaluateResilience";
import { buildDiscoveryCanonicalUrl } from "@/lib/rebuild/seo/canonical";
import { buildRebuildTitle } from "@/lib/rebuild/seo/meta";

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

export default async function RebuildDiscoveryPage({
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
      route: "/rebuild/discovery",
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
          <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 2xl:max-w-[1600px]">
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
        route: "/rebuild/discovery",
        requestId,
      });
    }

    const allowedPageSizes = [25, 50, 100] as const;
    const normalizedPageSize = allowedPageSizes.includes(
      query.pagination.pageSize as (typeof allowedPageSizes)[number]
    )
      ? query.pagination.pageSize
      : DEFAULT_DISCOVERY_PAGE_SIZE;

    const normalizedPagination = {
      page: query.pagination.page,
      pageSize: normalizedPageSize,
    };

    const fetchLimit = Math.min(
      normalizedPagination.page * normalizedPagination.pageSize,
      MAX_DISCOVERY_FETCH_LIMIT
    );

    const { deals, fetchedAtISO } = await getRecentDeals(fetchLimit);
    const orderedDeals = orderDealsForDiscovery(deals, query.preset);
    const filteredDeals = filterDealsByDiscoveryQuery(orderedDeals, query);
    const { deduped: dedupedDeals, duplicates } = dedupeDeals(filteredDeals);
    const discoveryResult = paginateDiscoveryResults(
      dedupedDeals,
      normalizedPagination
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
        <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 2xl:max-w-[1600px]">
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

            <div
              data-testid="discovery-facets"
              className="mt-4 grid gap-3 rounded-md border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-700 sm:grid-cols-3"
            >
              <div>
                <p className="font-semibold text-slate-800">Condition</p>
                {discoveryResult.facets?.condition ? (
                  <ul className="mt-1 space-y-1">
                    {Object.entries(discoveryResult.facets.condition).map(
                      ([key, value]) => (
                        <li key={key} className="flex justify-between gap-2">
                          <span className="uppercase">{key}</span>
                          <span>{value}</span>
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p className="mt-1 text-slate-500">Unavailable</p>
                )}
              </div>

              <div>
                <p className="font-semibold text-slate-800">Language</p>
                {discoveryResult.facets?.language ? (
                  <ul className="mt-1 space-y-1">
                    {Object.entries(discoveryResult.facets.language).map(
                      ([key, value]) => (
                        <li key={key} className="flex justify-between gap-2">
                          <span className="uppercase">{key}</span>
                          <span>{value}</span>
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p className="mt-1 text-slate-500">Unavailable</p>
                )}
              </div>

              <div>
                <p className="font-semibold text-slate-800">Confidence</p>
                {discoveryResult.facets?.confidence ? (
                  <ul className="mt-1 space-y-1">
                    {Object.entries(discoveryResult.facets.confidence).map(
                      ([key, value]) => (
                        <li key={key} className="flex justify-between gap-2">
                          <span className="uppercase">{key}</span>
                          <span>{value}</span>
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p className="mt-1 text-slate-500">Unavailable</p>
                )}
              </div>
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
              <ExpandableDealList
                mode="discovery"
                sortPreset={query.preset}
                items={pageDeals.map((deal) => {
                  const duplicateGroup = duplicates.get(
                    normalizeListingKey(deal)
                  );
                  return {
                    deal,
                    duplicateCount: duplicateGroup
                      ? duplicateGroup.length - 1
                      : 0,
                  };
                })}
              />
            )}

            <DiscoveryPaginationControls
              preset={query.preset}
              filters={query.filters}
              page={discoveryResult.page}
              pageSize={discoveryResult.pageSize}
              totalCount={discoveryResult.totalCount}
            />
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Provenance</h2>
            <ProvenanceDrilldown
              className="mt-3"
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
