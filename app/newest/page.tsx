"use server";

import DealsTable from "@/components/DealsTable";
import { runDealsQuery } from "@/app/api/deals/dealsQuery";
import { DEFAULT_MARKET } from "@/lib/markets";

export default async function NewestListingsPage() {
  const initial = await runDealsQuery({
    sort: "newest",
    page: 1,
    market: DEFAULT_MARKET,
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-10 sm:px-6 lg:px-10 lg:pb-14">
        <section className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Newest listings
            </h1>
            <p className="text-sm text-slate-600">
              Fresh inventory straight from our ingestion pipeline. Listings appear here even if
              they are unscored or outside the top-ranked slice.
            </p>
            <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
              Some listings may be unscored until enough sold data exists.
            </p>
          </div>
        </section>

        <section className="mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-7 lg:px-10">
            <DealsTable deals={initial.items} initialApiMeta={initial} />
          </div>
        </section>
      </div>
    </main>
  );
}
