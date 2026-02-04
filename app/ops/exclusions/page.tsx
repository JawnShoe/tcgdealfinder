import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  getRequestIdFromHeaders,
  logRequest,
} from "@/lib/rebuild/observability/logging";
import { buildCanonicalUrl } from "@/lib/rebuild/seo/canonical";
import { buildRebuildTitle } from "@/lib/rebuild/seo/meta";
import { listOverrides } from "@/lib/rebuild/data/exclusions";
import { ExclusionsToolClient } from "./ExclusionsToolClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const exclusionsTitle = buildRebuildTitle("Exclusions");
const exclusionsDescription =
  "Rebuild ops view for listing exclusion overrides.";

export const metadata: Metadata = {
  title: exclusionsTitle,
  description: exclusionsDescription,
  alternates: {
    canonical: buildCanonicalUrl("/ops/exclusions"),
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: exclusionsTitle,
    description: exclusionsDescription,
    url: buildCanonicalUrl("/ops/exclusions"),
  },
  twitter: {
    title: exclusionsTitle,
    description: exclusionsDescription,
  },
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function RebuildOpsExclusionsPage({
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
    ? Math.min(parseInt(limitParam, 10) || 100, 500)
    : 100;

  const kindParam = Array.isArray(params.kind) ? params.kind[0] : params.kind;
  const kindFilter =
    kindParam === "ALLOW" ||
    kindParam === "HARD_BLOCK" ||
    kindParam === "SOFT_EXCLUDE"
      ? kindParam
      : undefined;

  try {
    // Fetch overrides (safe - returns empty array on DB issues)
    let overrides: Awaited<ReturnType<typeof listOverrides>> = [];
    let fetchError: string | null = null;
    let isDbNotInitialized = false;

    try {
      overrides = await listOverrides({
        limit,
        overrideType: kindFilter,
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
      console.error("[rebuild/ops/exclusions] fetch error:", err);
    }

    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Rebuild lane - Ops Exclusions
          </div>

          <header className="rounded-lg border border-slate-200 bg-white p-6">
            <h1 className="text-2xl font-semibold text-slate-900">
              Exclusions
            </h1>
            <p className="mt-2 text-sm text-slate-700">
              Manage listing exclusion overrides. Add ALLOW, HARD_BLOCK, or
              SOFT_EXCLUDE overrides for specific listings.
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
            <ExclusionsToolClient
              initialOverrides={overrides}
              limit={limit}
              kindFilter={kindFilter}
            />
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
      msg: "rebuild.ops.exclusions.render",
      route: "/ops/exclusions",
      requestId,
      durationMs: Date.now() - start,
      status,
      error: requestError,
    });
  }
}
