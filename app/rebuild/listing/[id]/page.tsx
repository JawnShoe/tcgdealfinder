export default function RebuildListingPage({
  params,
}: {
  params: { id: string };
}) {
  const listingId = params.id;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Rebuild lane - Placeholder surface (isolated, no legacy imports)
      </div>

      <header className="mt-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Listing
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Rebuild Listing {listingId}
        </h1>
        <p className="text-sm text-slate-600">
          This route is a scaffold only. No scoring, ingestion, or legacy reuse.
        </p>
      </header>

      <section className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500">
            Price (placeholder)
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">$TBD</p>
          <p className="mt-1 text-sm text-slate-500">Stable on first render.</p>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500">
            Confidence (placeholder)
          </p>
          <div className="mt-2 inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700">
            TBD - SSR-only
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Reproducible with the same inputs.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500">
            Provenance (visible at first render)
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>source: TBD</li>
            <li>fetched_at: TBD</li>
            <li>parser_version: TBD</li>
            <li>confidence_inputs_hash: TBD</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
