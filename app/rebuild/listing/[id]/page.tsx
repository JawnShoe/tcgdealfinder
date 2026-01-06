type PageProps = {
  params: { id: string };
};

const placeholderDeal = {
  id: "placeholder",
  title: "Placeholder Listing",
  price: "$199.00",
  priceDelta: "-12%",
  condition: "NM",
  availability: "In stock",
  seller: "Placeholder Seller",
  source: "placeholder-source",
  fetchedAt: "2026-01-05T12:00:00Z",
  parserVersion: "v0-placeholder",
  confidence: 72,
  confidenceInputsHash: "placeholder-hash",
  dataAgeMinutes: 5,
};

export default function RebuildListingPage({ params }: PageProps) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Rebuild lane - placeholder data
        </div>

        <header className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Rebuild listing
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            {placeholderDeal.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Listing ID: <span className="font-mono">{params.id}</span>
          </p>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Price
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {placeholderDeal.price}
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              Deal delta: {placeholderDeal.priceDelta}
            </p>
            <p className="mt-3 text-sm text-slate-600">
              Condition: {placeholderDeal.condition}
            </p>
            <p className="text-sm text-slate-600">
              Availability: {placeholderDeal.availability}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Confidence (SSR)
            </p>
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
              {placeholderDeal.confidence} / 100 (placeholder)
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Seller: {placeholderDeal.seller}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Trust metadata
            </p>
            <dl className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <dt>Source</dt>
                <dd className="font-mono text-slate-900">
                  {placeholderDeal.source}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Fetched at</dt>
                <dd className="font-mono text-slate-900">
                  {placeholderDeal.fetchedAt}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Data age</dt>
                <dd className="font-mono text-slate-900">
                  {placeholderDeal.dataAgeMinutes}m
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Why this is a deal (placeholder)
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Price is below recent median for the same condition.</li>
            <li>Seller meets baseline trust thresholds.</li>
            <li>Listing includes clear condition and direct outbound link.</li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Placeholder data only - no scoring or ingestion logic wired.
          </p>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Transparency log (placeholder)
          </h2>
          <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Source
              </dt>
              <dd className="mt-1 font-mono text-slate-900">
                {placeholderDeal.source}
              </dd>
            </div>
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Fetched at
              </dt>
              <dd className="mt-1 font-mono text-slate-900">
                {placeholderDeal.fetchedAt}
              </dd>
            </div>
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Parser version
              </dt>
              <dd className="mt-1 font-mono text-slate-900">
                {placeholderDeal.parserVersion}
              </dd>
            </div>
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Confidence inputs hash
              </dt>
              <dd className="mt-1 font-mono text-slate-900">
                {placeholderDeal.confidenceInputsHash}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
