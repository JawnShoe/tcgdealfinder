import { SkeletonBlock, SkeletonRow } from "@/components/rebuild/Skeleton";

export default function RebuildAlertsLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3">
          <SkeletonBlock className="h-4 w-32" />
        </div>

        <header className="rounded-lg border border-slate-200 bg-white p-6">
          <SkeletonBlock className="h-6 w-32" />
          <SkeletonBlock className="mt-3 h-4 w-72" />
        </header>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <SkeletonBlock className="h-5 w-28" />
          <SkeletonBlock className="mt-3 h-4 w-64" />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <SkeletonBlock className="h-9 flex-1" />
            <SkeletonBlock className="h-9 w-28" />
          </div>
          <SkeletonBlock className="mt-3 h-3 w-56" />
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-baseline justify-between">
            <SkeletonBlock className="h-5 w-28" />
            <SkeletonBlock className="h-3 w-12" />
          </div>
          <div className="mt-4 space-y-3">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="mt-3 h-3 w-48" />
        </section>
      </div>
    </main>
  );
}
