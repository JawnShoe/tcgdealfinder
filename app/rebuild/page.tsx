import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import ComplianceDisclosure from "@/components/rebuild/ComplianceDisclosure";
import PreferencesBar from "@/components/rebuild/PreferencesBar";
import ExpandableDealList from "@/components/rebuild/ExpandableDealList";
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
const homeTitle = buildRebuildTitle("Today's Best Deals");
const homeDescription =
  "Price-checked against market data. Seller-verified. Updated regularly.";

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
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function RebuildHomePage({
  searchParams,
}: RebuildHomePageProps) {
  const start = Date.now();
  const headersList = await headers();
  const requestId = getRequestIdFromHeaders(headersList);
  let status = 200;
  let requestError: unknown;

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const prefsResult = parseRebuildPrefs(resolvedSearchParams);
  if (prefsResult.kind !== "ok") {
    status = 404;
    logRequest({
      level: "info",
      msg: "rebuild.home.render",
      route: "/rebuild",
      requestId,
      durationMs: Date.now() - start,
      status,
      error: prefsResult,
    });
    notFound();
  }

  const prefs = prefsResult.prefs;

  try {
    const isDbConfigured = isRebuildDbConfigured();
    const { deals } = await getRecentDeals(10);
    const orderedDeals = sortDealsByPrefs(deals, prefs);
    const { deduped: dedupedDeals, duplicates } = dedupeDeals(orderedDeals);

    return (
      <main className="min-h-screen bg-slate-50">
        <style>{`
          body > header {
            display: none;
          }
          .rebuild-sort-inline > p {
            display: none;
          }
          .rebuild-sort-inline label {
            align-items: center;
            line-height: 1;
            font-size: 0.875rem;
            gap: 0.5rem;
          }
          .rebuild-sort-inline select {
            height: 28px;
            padding-top: 0;
            padding-bottom: 0;
            font-size: 0.875rem;
          }
        `}</style>
        <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 2xl:max-w-[1600px]">
          <header className="rounded-lg border border-slate-100 bg-white/80 px-6 py-4">
            <h1 className="text-2xl font-semibold text-slate-900">
              Today&apos;s Best Deals
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Price-checked against market data · Seller data enriched ·
              Continuously refreshed
            </p>
          </header>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
            <div className="grid grid-cols-1 items-center gap-x-4 gap-y-2 px-2 -mx-2 pb-2 sm:grid-cols-[minmax(0,1fr)_10rem_9rem_15rem_1.25rem] lg:grid-cols-[minmax(0,1fr)_12rem_10rem_18rem_1.25rem] 2xl:grid-cols-[minmax(0,1fr)_13rem_11rem_20rem_1.25rem]">
              <h2 className="text-sm font-semibold text-slate-900">Deals</h2>
              <div className="hidden sm:block" aria-hidden="true" />
              <div className="hidden sm:block" aria-hidden="true" />
              <div className="flex items-center justify-end gap-4 text-sm leading-none text-slate-500">
                <span>
                  {dedupedDeals.length} result
                  {dedupedDeals.length !== 1 ? "s" : ""}
                </span>
                <PreferencesBar
                  initialSort={prefs.sort}
                  className="rebuild-sort-inline mt-0 border-0 bg-transparent px-0 py-0"
                />
              </div>
              <div className="hidden sm:block" aria-hidden="true" />
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
              <ExpandableDealList
                mode="home"
                sortPreset={prefs.sort}
                items={dedupedDeals.map((deal) => {
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
      msg: "rebuild.home.render",
      route: "/rebuild",
      requestId,
      durationMs: Date.now() - start,
      status,
      error: requestError,
    });
  }
}
