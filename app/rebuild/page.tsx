import type { Metadata } from "next";
import { headers } from "next/headers";
import ConfidenceBadge from "@/components/rebuild/ConfidenceBadge";
import ComplianceDisclosure from "@/components/rebuild/ComplianceDisclosure";
import IntentPrefetchLink from "@/components/rebuild/IntentPrefetchLink";
import PreferencesBar from "@/components/rebuild/PreferencesBar";
import PriorityHydration from "@/components/rebuild/PriorityHydration";
import ProvenanceDrilldown from "@/components/rebuild/ProvenanceDrilldown";
import ResilienceLabel from "@/components/rebuild/ResilienceLabel";
import { evaluateResilience } from "@/lib/rebuild/resilience/evaluateResilience";
import { SkeletonBlock } from "@/components/rebuild/Skeleton";
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
import { buildCanonicalUrl } from "@/lib/rebuild/seo/canonical";
import { buildRebuildTitle } from "@/lib/rebuild/seo/meta";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const homeTitle = buildRebuildTitle("Home");
const homeDescription =
  "Rebuild home for TCG Deal Finder with recent deals and trust signals.";

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: {
    canonical: buildCanonicalUrl("/rebuild"),
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: homeTitle,
    description: homeDescription,
    url: buildCanonicalUrl("/rebuild"),
  },
  twitter: {
    title: homeTitle,
    description: homeDescription,
  },
};

type RebuildHomePageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function RebuildHomePage({
  searchParams,
}: RebuildHomePageProps) {
  const start = Date.now();
  const requestId = getRequestIdFromHeaders(headers());
  let status = 200;
  let requestError: unknown;

  try {
    const prefs = parseRebuildPrefs(searchParams ?? {});
    const isDbConfigured = isRebuildDbConfigured();
    const { deals, fetchedAtISO } = await getRecentDeals(10);
    const orderedDeals = sortDealsByPrefs(deals, prefs);
    const { deduped: dedupedDeals, duplicates } = dedupeDeals(orderedDeals);
    const ageSeconds = deals
      .map((deal) => deal.freshness.dataAgeSeconds)
      .filter((value): value is number => value != null);
    const maxAgeSeconds = ageSeconds.length ? Math.max(...ageSeconds) : null;
    const hasMissingAge =
      deals.length > 0 && ageSeconds.length !== deals.length;

    // Evaluate resilience using the pure function
    const resilienceResult = evaluateResilience({
      dbAvailable: isDbConfigured,
      cacheAvailable: false, // No cache layer yet
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
            Rebuild lane - Home (pipeline data)
          </div>
          <ResilienceLabel
            className="mb-6"
            tier={resilienceResult.tier}
            explanation={resilienceResult.explanation}
          />

          <header className="rounded-lg border border-slate-200 bg-white p-6">
            <h1 className="text-2xl font-semibold text-slate-900">
              TCG Deal Finder
            </h1>
            <p className="mt-2 text-sm text-slate-700">
              Find trading card deals with transparent pricing and confidence
              signals.
            </p>
          </header>

          <PreferencesBar initialSort={prefs.sort} />

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Search
            </p>
            <div className="mt-3 flex gap-3">
              <input
                type="text"
                placeholder="Search cards (coming soon)"
                disabled
                className="flex-1 rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-500"
              />
              <button
                type="button"
                disabled
                className="rounded-md border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500"
              >
                Search
              </button>
            </div>
          </section>

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

          <section
            className="mt-6 rounded-lg border border-slate-200 bg-white p-6"
            data-testid="rebuild-home-nav"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Rebuild surfaces
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Navigate to other rebuild-native routes.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <IntentPrefetchLink
                  href="/rebuild/discovery"
                  className="inline-flex font-medium text-slate-700 underline underline-offset-4 hover:text-slate-900"
                >
                  Browse deals
                </IntentPrefetchLink>
              </li>
              <li>
                <IntentPrefetchLink
                  href="/rebuild/alerts"
                  className="inline-flex font-medium text-slate-700 underline underline-offset-4 hover:text-slate-900"
                >
                  Alerts
                </IntentPrefetchLink>
              </li>
              <li>
                <IntentPrefetchLink
                  href="/rebuild/ops"
                  className="inline-flex font-medium text-slate-700 underline underline-offset-4 hover:text-slate-900"
                >
                  Ops
                </IntentPrefetchLink>
              </li>
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              Click any deal above to view its listing page.
            </p>
          </section>

          <PriorityHydration
            fallback={
              <section
                className="mt-6 rounded-lg border border-slate-200 bg-white p-6"
                data-testid="rebuild-home-deferred-skeleton"
              >
                <SkeletonBlock className="h-5 w-36" />
                <SkeletonBlock className="mt-3 h-4 w-72" />
                <SkeletonBlock className="mt-2 h-4 w-64" />
              </section>
            }
          >
            <section
              className="mt-6 rounded-lg border border-slate-200 bg-white p-6"
              data-testid="rebuild-home-deferred-content"
            >
              <h2 className="text-lg font-semibold text-slate-900">
                Rebuild notes
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                Secondary context and diagnostics will live here as the rebuild
                lane expands.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                This block is non-critical and safe to defer after initial load.
              </p>
            </section>
          </PriorityHydration>
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
      msg: "rebuild.home.render",
      route: "/rebuild",
      requestId,
      durationMs: Date.now() - start,
      status,
      error: requestError,
    });
  }
}
