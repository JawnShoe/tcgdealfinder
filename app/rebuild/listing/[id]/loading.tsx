import { SkeletonBlock } from "@/components/rebuild/Skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          <SkeletonBlock className="h-4 w-48" />
        </div>

        <header className="rounded-lg border border-slate-200 bg-white p-6">
          <SkeletonBlock className="h-3 w-32" />
          <SkeletonBlock className="mt-3 h-7 w-64" />
          <SkeletonBlock className="mt-3 h-4 w-40" />
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="mt-3 h-7 w-24" />
            <SkeletonBlock className="mt-3 h-4 w-20" />
            <SkeletonBlock className="mt-4 h-4 w-28" />
            <SkeletonBlock className="mt-2 h-4 w-24" />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <SkeletonBlock className="h-3 w-32" />
            <div className="mt-3 space-y-3">
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-full" />
            </div>
            <SkeletonBlock className="mt-4 h-4 w-32" />
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <SkeletonBlock className="h-5 w-56" />
          <div className="mt-4 space-y-3">
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-5/6" />
            <SkeletonBlock className="h-4 w-4/6" />
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <SkeletonBlock className="h-5 w-48" />
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <SkeletonBlock className="h-14" />
            <SkeletonBlock className="h-14" />
            <SkeletonBlock className="h-14" />
            <SkeletonBlock className="h-14" />
          </div>
        </section>
      </div>
    </main>
  );
}
