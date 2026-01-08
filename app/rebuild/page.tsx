import Link from "next/link";
import { getRecentDeals } from "@/lib/rebuild/data/getRecentDeals";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RebuildHomePage() {
  const { deals, total, fetchedAtISO } = await getRecentDeals(10);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Rebuild lane - Home (pipeline data)
        </div>

        <header className="rounded-lg border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-semibold text-slate-900">
            TCG Deal Finder
          </h1>
          <p className="mt-2 text-sm text-slate-700">
            Find trading card deals with transparent pricing and confidence
            signals.
          </p>
        </header>

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
              {total} result{total !== 1 ? "s" : ""}
            </p>
          </div>

          {deals.length === 0 ? (
            <div className="mt-4 rounded-md border border-slate-100 bg-slate-50 px-4 py-6 text-center">
              <p className="text-sm text-slate-600">
                No deals available at this time.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {deals.map((deal) => (
                <li key={deal.listingId} className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/rebuild/listing/${encodeURIComponent(deal.listingId)}`}
                        className="text-sm font-medium text-slate-900 hover:text-slate-700"
                      >
                        {deal.title}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        {deal.seller.name ?? deal.seller.username ?? "Unknown"}{" "}
                        at {deal.provenance.market ?? deal.provenance.source}
                      </p>
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
                      <ConfidenceBadge label={deal.trust.confidence.label} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Data fetched: {fetchedAtISO}
          </p>
        </section>

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
          <p className="mt-4 text-xs text-slate-500">
            Click any deal above to view its listing page.
          </p>
        </section>
      </div>
    </main>
  );
}

function ConfidenceBadge({ label }: { label: string }) {
  const colorClass =
    label === "high"
      ? "bg-emerald-100 text-emerald-800"
      : label === "medium"
        ? "bg-amber-100 text-amber-800"
        : label === "low"
          ? "bg-red-100 text-red-800"
          : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}
