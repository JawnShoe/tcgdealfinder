import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  getRequestIdFromHeaders,
  logRequest,
} from "@/lib/rebuild/observability/logging";
import { buildCanonicalUrl } from "@/lib/rebuild/seo/canonical";
import { buildRebuildTitle } from "@/lib/rebuild/seo/meta";
import { listListingOverrides } from "@/lib/rebuild/data/listingsOps";
import { ListingsToolClient } from "./ListingsToolClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const listingsTitle = buildRebuildTitle("Listings");
const listingsDescription = "Rebuild ops view for listings management.";

export const metadata: Metadata = {
  title: listingsTitle,
  description: listingsDescription,
  alternates: {
    canonical: buildCanonicalUrl("/ops/listings"),
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: listingsTitle,
    description: listingsDescription,
    url: buildCanonicalUrl("/ops/listings"),
  },
  twitter: {
    title: listingsTitle,
    description: listingsDescription,
  },
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function RebuildOpsListingsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const start = Date.now();
  const headersList = await headers();
  const requestId = getRequestIdFromHeaders(headersList);
  let status = 200;
  let requestError: unknown;

  // Parse query params
  const params = searchParams ? await searchParams : {};
  const limitParam = Array.isArray(params.limit)
    ? params.limit[0]
    : params.limit;
  const limit = limitParam
    ? Math.min(parseInt(limitParam, 10) || 200, 500)
    : 200;

  try {
    // Fetch overrides (safe - returns empty array on DB issues)
    let overrides: Awaited<ReturnType<typeof listListingOverrides>> = [];
    let fetchError: string | null = null;
    let isDbNotInitialized = false;

    try {
      overrides = await listListingOverrides({
        limit,
      });
    } catch (err: unknown) {
      // Check for missing table error (42P01 = undefined_table in PostgreSQL)
      const pgError = err as { code?: string };
      if (pgError.code === "42P01") {
        isDbNotInitialized = true;
        fetchError =
          "Database not initialized (missing listing_overrides table)";
      } else {
        fetchError =
          err instanceof Error ? err.message : "Failed to fetch overrides";
      }
      console.error("[rebuild/ops/listings] fetch error:", err);
    }

    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Rebuild lane - Ops Listings
          </div>

          <header className="rounded-lg border border-slate-200 bg-white p-6">
            <h1 className="text-2xl font-semibold text-slate-900">Listings</h1>
            <p className="mt-2 text-sm text-slate-700">
              Manage listing overrides. Set allow/block/soft-exclude on
              individual listings without blacklisting an entire seller.
            </p>
          </header>

          {isDbNotInitialized ? (
            <section
              className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-6"
              data-testid="db-not-initialized"
            >
              <h2 className="text-lg font-semibold text-amber-900">
                Database Not Initialized
              </h2>
              <p className="mt-2 text-sm text-amber-700">
                The listing_overrides table does not exist. Run migrations to
                initialize the database.
              </p>
            </section>
          ) : fetchError ? (
            <section className="mt-6 rounded-lg border border-red-200 bg-red-50 p-6">
              <h2 className="text-lg font-semibold text-red-900">
                Database Error
              </h2>
              <p className="mt-2 text-sm text-red-700">{fetchError}</p>
            </section>
          ) : (
            <ListingsToolClient initialOverrides={overrides} limit={limit} />
          )}
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
      msg: "rebuild.ops.listings.render",
      route: "/ops/listings",
      requestId,
      durationMs: Date.now() - start,
      status,
      error: requestError,
    });
  }
}
