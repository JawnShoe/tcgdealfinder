import { SkeletonBlock, SkeletonRow } from "@/components/rebuild/Skeleton";

export default function RebuildHomeLoading() {
  return (
    <main
      className="min-h-screen bg-slate-50"
      data-testid="rebuild-loading-home"
    >
      <span className="sr-only">Rebuild lane</span>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3">
          <SkeletonBlock className="h-4 w-48" />
        </div>

        <header className="rounded-lg border border-slate-200 bg-white p-6">
          <SkeletonBlock className="h-6 w-40" />
          <SkeletonBlock className="mt-3 h-4 w-72" />
          <div className="mt-4 flex items-center gap-3 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Resilience</span>
            <span
              data-testid="resilience-label"
              data-tier="UNAVAILABLE"
              className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
            >
              UNAVAILABLE
            </span>
          </div>
        </header>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <SkeletonBlock className="h-3 w-24" />
          <div className="mt-4 flex gap-3">
            <SkeletonBlock className="h-9 flex-1" />
            <SkeletonBlock className="h-9 w-24" />
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-baseline justify-between">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-3 w-14" />
          </div>
          <div className="mt-4 space-y-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
          <SkeletonBlock className="mt-4 h-3 w-40" />
        </section>

        <div
          data-testid="rebuild-home-deferred-skeleton"
          className="mt-6 h-8 w-full rounded-md bg-slate-50"
          aria-hidden="true"
        />

        <details className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <summary className="cursor-pointer list-none text-sm font-medium text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 [&::-webkit-details-marker]:hidden">
            Provenance
          </summary>
          <div className="mt-3 space-y-2 text-xs text-slate-600">
            <SkeletonBlock className="h-3 w-72" />
            <SkeletonBlock className="h-3 w-56" />
          </div>
        </details>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="mt-3 h-4 w-64" />
          <SkeletonBlock className="mt-4 h-3 w-56" />
        </section>
      </div>
    </main>
  );
}
