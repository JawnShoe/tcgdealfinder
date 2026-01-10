import ConfidenceBadge from "@/components/rebuild/ConfidenceBadge";
import ComplianceDisclosure from "@/components/rebuild/ComplianceDisclosure";
import IntentPrefetchLink from "@/components/rebuild/IntentPrefetchLink";
import OutboundDealLink from "@/components/rebuild/OutboundDealLink";
import PredictiveSignalsPanel from "@/components/rebuild/PredictiveSignalsPanel";
import PriorityHydration from "@/components/rebuild/PriorityHydration";
import ProvenanceDrilldown from "@/components/rebuild/ProvenanceDrilldown";
import ResilienceLabel, {
  ResilienceMode,
  ResilienceTier,
} from "@/components/rebuild/ResilienceLabel";
import { SkeletonBlock } from "@/components/rebuild/Skeleton";
import { isRebuildDbConfigured } from "@/lib/rebuild/data/dataAvailability";
import { getRebuildListingById } from "@/lib/rebuild/data/getRebuildListingById";
import { computePredictiveSignals } from "@/lib/rebuild/signals/predictiveSignals";

type PageProps = {
  params: { id: string };
};

const FRESHNESS_SLO_SECONDS = 15 * 60;

export default async function RebuildListingPage({ params }: PageProps) {
  const isDbConfigured = isRebuildDbConfigured();
  const listing = isDbConfigured
    ? await getRebuildListingById(params.id)
    : null;

  let resilienceTier: ResilienceTier = "FULL";
  let resilienceMode: ResilienceMode = "LIVE";
  if (!isDbConfigured) {
    resilienceTier = "UNAVAILABLE";
    resilienceMode = "UNKNOWN";
  } else if (!listing) {
    resilienceTier = "UNAVAILABLE";
    resilienceMode = "UNKNOWN";
  } else if (
    listing.freshness.dataAgeSeconds == null ||
    listing.freshness.dataAgeSeconds > FRESHNESS_SLO_SECONDS
  ) {
    resilienceTier = "DEGRADED";
  }

  if (!isDbConfigured) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Rebuild lane - data unavailable
          </div>
          <ResilienceLabel
            className="mb-6"
            tier={resilienceTier}
            mode={resilienceMode}
          />
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-900">
              Rebuild data source not configured in this environment.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Rebuild lane - listing not found
          </div>
          <ResilienceLabel
            className="mb-6"
            tier={resilienceTier}
            mode={resilienceMode}
          />
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-900">
              No listing data found for ID{" "}
              <span className="font-mono">{params.id}</span>.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const provenanceFields = [
    { label: "DB configured", value: isDbConfigured ? "yes" : "no" },
    { label: "Listing ID", value: listing.listingId },
    { label: "Source", value: listing.provenance.source },
    { label: "Data fetched at", value: listing.trust.fetchedAtISO },
    { label: "Data age", value: listing.trust.dataAgeLabel },
    { label: "Pipeline version", value: listing.transparency.pipelineVersion },
  ];

  if (listing.provenance.market) {
    provenanceFields.splice(3, 0, {
      label: "Market",
      value: listing.provenance.market,
    });
  }

  if (listing.provenance.snapshotAtISO) {
    provenanceFields.push({
      label: "Snapshot at",
      value: listing.provenance.snapshotAtISO,
    });
  }

  if (listing.provenance.updatedAtISO) {
    provenanceFields.push({
      label: "Updated at",
      value: listing.provenance.updatedAtISO,
    });
  }

  const predictiveSignals = computePredictiveSignals(listing);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Rebuild lane - pipeline data (db)
        </div>
        <ResilienceLabel
          className="mb-6"
          tier={resilienceTier}
          mode={resilienceMode}
        />

        <header className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-900">
            Rebuild listing
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            {listing.title}
          </h1>
          <p className="mt-1 text-sm text-slate-900">
            Listing ID: <span className="font-mono">{params.id}</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <IntentPrefetchLink
              href="/rebuild/discovery"
              className="text-sm font-medium text-slate-700 underline underline-offset-4 hover:text-slate-900"
            >
              Back to Discovery
            </IntentPrefetchLink>
            {listing.url ? (
              <OutboundDealLink
                href={listing.url}
                className="text-sm font-medium text-slate-700 underline underline-offset-4 hover:text-slate-900"
              >
                View original listing
              </OutboundDealLink>
            ) : null}
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-900">
              Price
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {listing.price.display}
            </p>
            <p className="mt-1 text-sm text-emerald-900">
              Deal delta: {listing.price.deltaDisplay}
            </p>
            <div className="mt-2">
              <ConfidenceBadge label={listing.trust.confidence.label} />
            </div>
            <p className="mt-3 text-sm text-slate-900">
              Condition: {listing.condition ?? "Unknown"}
            </p>
            <p className="text-sm text-slate-900">
              Availability: {listing.availability ?? "Unknown"}
            </p>
          </div>

          <div
            className="rounded-lg border border-slate-200 bg-white p-4"
            data-testid="trust-panel"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-900">
              Trust panel
            </p>
            <dl className="mt-3 space-y-3 text-sm text-slate-900">
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
            <p className="mt-3 text-sm text-slate-900">
              Seller:{" "}
              {listing.seller.name ?? listing.seller.username ?? "Unknown"}
            </p>
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                Provenance
              </p>
              <dl className="mt-2 space-y-2 text-sm text-slate-900">
                <div className="flex items-center justify-between">
                  <dt>Market</dt>
                  <dd className="font-mono text-slate-900">
                    {listing.provenance.market ?? "Unknown"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Snapshot at</dt>
                  <dd className="font-mono text-slate-900">
                    {listing.provenance.snapshotAtISO ?? "Unknown"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Updated at</dt>
                  <dd className="font-mono text-slate-900">
                    {listing.provenance.updatedAtISO ?? "Unknown"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section
          className="mt-6 rounded-lg border border-slate-200 bg-white p-6"
          data-testid="explainability-panel"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            Explainability (pipeline)
          </h2>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-900">
            Confidence inputs
          </p>
          <ul
            className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-900"
            data-testid="explainability-inputs"
          >
            {listing.transparency.inputs.map((input) => (
              <li key={input}>{input}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-900">
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
          <dl className="mt-4 grid gap-3 text-sm text-slate-900 sm:grid-cols-2">
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-900">
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
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-900">
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
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-900">
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
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-900">
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

        <PredictiveSignalsPanel className="mt-6" result={predictiveSignals} />

        <ProvenanceDrilldown
          className="mt-6"
          summary={`Data age ${listing.trust.dataAgeLabel}`}
          fields={provenanceFields}
        />

        <ComplianceDisclosure className="mt-6" />

        <PriorityHydration
          fallback={
            <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
              <SkeletonBlock className="h-5 w-40" />
              <SkeletonBlock className="mt-3 h-4 w-72" />
              <SkeletonBlock className="mt-2 h-4 w-60" />
            </section>
          }
        >
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Rebuild notes
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              Additional non-critical panels will appear here as the rebuild
              lane expands.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              This section is secondary to the trust and pricing surfaces above.
            </p>
          </section>
        </PriorityHydration>
      </div>
    </main>
  );
}
