import { SkeletonBlock, SkeletonRow } from "@/components/rebuild/Skeleton";

export default function RebuildDiscoveryLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3">
          <SkeletonBlock className="h-4 w-48" />
        </div>

        <header className="rounded-lg border border-slate-200 bg-white p-6">
          <SkeletonBlock className="h-6 w-40" />
          <SkeletonBlock className="mt-3 h-4 w-72" />
        </header>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-baseline justify-between">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-3 w-14" />
          </div>
          <div className="mt-4 space-y-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
          <SkeletonBlock className="mt-4 h-3 w-40" />
        </section>
      </div>
    </main>
  );
}
