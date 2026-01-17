import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  getRequestIdFromHeaders,
  logRequest,
} from "@/lib/rebuild/observability/logging";
import { buildCanonicalUrl } from "@/lib/rebuild/seo/canonical";
import { buildRebuildTitle } from "@/lib/rebuild/seo/meta";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const blacklistTitle = buildRebuildTitle("Blacklist");
const blacklistDescription =
  "Rebuild ops view for blacklist seller management.";

export const metadata: Metadata = {
  title: blacklistTitle,
  description: blacklistDescription,
  alternates: {
    canonical: buildCanonicalUrl("/rebuild/ops/blacklist"),
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: blacklistTitle,
    description: blacklistDescription,
    url: buildCanonicalUrl("/rebuild/ops/blacklist"),
  },
  twitter: {
    title: blacklistTitle,
    description: blacklistDescription,
  },
};

export default async function RebuildOpsBlacklistPage() {
  const start = Date.now();
  const requestId = getRequestIdFromHeaders(headers());
  let status = 200;
  let requestError: unknown;

  try {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Rebuild lane - Ops Blacklist
          </div>

          <header className="rounded-lg border border-slate-200 bg-white p-6">
            <h1 className="text-2xl font-semibold text-slate-900">Blacklist</h1>
            <p className="mt-2 text-sm text-slate-700">
              Rebuild ops view for blacklist seller management.
            </p>
          </header>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Migration Status
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              This route is a Stage 2 migration target. The full blacklist
              management tool lives at <code>/admin?tab=blacklist</code> and
              will be fully migrated in a later phase.
            </p>
            <div className="mt-4 rounded-md border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-sm text-slate-600">
                Current status: <strong>Read-only stub</strong>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Legacy route <code>/admin/blacklist</code> now redirects here.
              </p>
            </div>
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              No blacklist entries found
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              The blacklist management tool will be available after full
              migration of the admin blacklist panel to the rebuild lane.
            </p>
          </section>
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
      msg: "rebuild.ops.blacklist.render",
      route: "/rebuild/ops/blacklist",
      requestId,
      durationMs: Date.now() - start,
      status,
      error: requestError,
    });
  }
}
