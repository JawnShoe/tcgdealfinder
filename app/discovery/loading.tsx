import { SkeletonBlock } from "@/components/rebuild/Skeleton";

export default function DiscoveryLoading() {
  return (
    <main
      data-testid="rebuild-loading-discovery"
      className="min-h-screen bg-slate-50"
    >
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <SkeletonBlock className="h-6 w-40" />
          <SkeletonBlock className="mt-3 h-4 w-72" />
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <SkeletonBlock className="h-4 w-16" />
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SkeletonBlock className="h-7 w-full" />
            <SkeletonBlock className="h-7 w-full" />
            <SkeletonBlock className="h-7 w-full" />
            <SkeletonBlock className="h-7 w-full" />
          </div>
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <SkeletonBlock className="h-5 w-32" />
          <div className="mt-4 space-y-3">
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-12 w-full" />
          </div>
        </section>
      </div>
    </main>
  );
}
