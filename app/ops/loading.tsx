import { SkeletonBlock } from "@/components/rebuild/Skeleton";

export default function RebuildOpsLoading() {
  return (
    <main
      className="min-h-screen bg-slate-50"
      data-testid="rebuild-loading-ops"
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <SkeletonBlock className="mb-6 h-10 rounded-lg" />
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <SkeletonBlock className="h-6 w-40" />
          <SkeletonBlock className="mt-3 h-4 w-64" />
        </div>
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <SkeletonBlock className="h-5 w-32" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <SkeletonBlock className="h-5 w-28" />
            <SkeletonBlock className="mt-3 h-24" />
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="mt-3 h-16" />
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="mt-3 h-10" />
          </div>
        </div>
      </div>
    </main>
  );
}
