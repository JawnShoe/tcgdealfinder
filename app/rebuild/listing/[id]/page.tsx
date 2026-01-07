import { getRebuildListingById } from "@/lib/rebuild/data/getRebuildListingById";

type PageProps = {
  params: { id: string };
};

export default async function RebuildListingPage({ params }: PageProps) {
  const listing = await getRebuildListingById(params.id);

  if (!listing) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Rebuild lane - listing not found
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-700">
              No listing data found for ID{" "}
              <span className="font-mono">{params.id}</span>.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Rebuild lane - pipeline data (db)
        </div>

        <header className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-800">
            Rebuild listing
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            {listing.title}
          </h1>
          <p className="mt-1 text-sm text-slate-700">
            Listing ID: <span className="font-mono">{params.id}</span>
          </p>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-800">
              Price
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {listing.price.display}
            </p>
            <p className="mt-1 text-sm text-emerald-800">
              Deal delta: {listing.price.deltaDisplay}
            </p>
            <p className="mt-3 text-sm text-slate-700">
              Condition: {listing.condition ?? "Unknown"}
            </p>
            <p className="text-sm text-slate-700">
              Availability: {listing.availability ?? "Unknown"}
            </p>
          </div>

          <div
            className="rounded-lg border border-slate-200 bg-white p-4"
            data-testid="trust-panel"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-800">
              Trust panel
            </p>
            <dl className="mt-3 space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <dt>Confidence</dt>
                <dd
                  className="font-mono font-semibold text-slate-900"
                  data-testid="trust-confidence"
                >
                  {listing.trust.confidence.display}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Source</dt>
                <dd
                  className="font-mono text-slate-900"
                  data-testid="trust-source"
                >
                  {listing.trust.source}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Fetched at</dt>
                <dd
                  className="font-mono text-slate-900"
                  data-testid="trust-fetched-at"
                >
                  {listing.trust.fetchedAtISO}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Data age</dt>
                <dd
                  className="font-mono text-slate-900"
                  data-testid="trust-data-age"
                >
                  {listing.trust.dataAgeLabel}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-slate-700">
              Seller:{" "}
              {listing.seller.name ?? listing.seller.username ?? "Unknown"}
            </p>
          </div>
        </section>

        <section
          className="mt-6 rounded-lg border border-slate-200 bg-white p-6"
          data-testid="explainability-panel"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            Explainability (pipeline)
          </h2>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-800">
            Confidence inputs
          </p>
          <ul
            className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-700"
            data-testid="explainability-inputs"
          >
            {listing.transparency.inputs.map((input) => (
              <li key={input}>{input}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-800">
            Pipeline version: {listing.transparency.pipelineVersion}.
          </p>
        </section>

        <section
          className="mt-6 rounded-lg border border-slate-200 bg-white p-6"
          data-testid="transparency-panel"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            Transparency log (pipeline)
          </h2>
          <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-800">
                Data sources
              </dt>
              <dd
                className="mt-1 font-mono text-slate-900"
                data-testid="transparency-sources"
              >
                {listing.transparency.sources.join(", ")}
              </dd>
            </div>
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-800">
                Fetched at
              </dt>
              <dd
                className="mt-1 font-mono text-slate-900"
                data-testid="transparency-fetched-at"
              >
                {listing.trust.fetchedAtISO}
              </dd>
            </div>
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-800">
                Computed at
              </dt>
              <dd
                className="mt-1 font-mono text-slate-900"
                data-testid="transparency-computed-at"
              >
                {listing.transparency.computedAtISO}
              </dd>
            </div>
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-800">
                Pipeline version
              </dt>
              <dd
                className="mt-1 font-mono text-slate-900"
                data-testid="transparency-pipeline-version"
              >
                {listing.transparency.pipelineVersion}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
