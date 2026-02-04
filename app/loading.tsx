import { SkeletonBlock } from "@/components/rebuild/Skeleton";

const GRID_GAP = "gap-x-4 gap-y-2";
const ROW_PADDING = "px-2";
const GRID_COLS_HOME_SM =
  "sm:grid-cols-[minmax(0,1fr)_10rem_9rem_15rem_1.25rem]";
const GRID_COLS_HOME_LG =
  "lg:grid-cols-[minmax(0,1fr)_12rem_10rem_18rem_1.25rem]";
const GRID_COLS_HOME_2XL =
  "2xl:grid-cols-[minmax(0,1fr)_13rem_11rem_20rem_1.25rem]";
const GRID_COLS_HOME = `grid-cols-1 ${GRID_COLS_HOME_SM} ${GRID_COLS_HOME_LG} ${GRID_COLS_HOME_2XL}`;

function DealsRowSkeleton() {
  return (
    <li className="py-1" aria-hidden="true">
      <div
        className={`grid ${GRID_COLS_HOME} ${GRID_GAP} ${ROW_PADDING} -mx-2 rounded-md py-1.5`}
      >
        <div className="min-w-0">
          <SkeletonBlock className="h-4 w-10/12 bg-slate-200/80" />
          <SkeletonBlock className="mt-2 h-3 w-5/12 bg-slate-200/50" />
        </div>
        <div className="whitespace-nowrap text-right tabular-nums">
          <SkeletonBlock className="ml-auto h-5 w-20 bg-slate-200/80" />
          <SkeletonBlock className="ml-auto mt-2 h-3 w-12 bg-slate-200/50" />
        </div>
        <div className="whitespace-nowrap text-right tabular-nums">
          <SkeletonBlock className="ml-auto h-4 w-14 bg-slate-200/60" />
          <SkeletonBlock className="ml-auto mt-2 h-3 w-16 bg-slate-200/40" />
        </div>
        <div className="min-w-0 text-right">
          <SkeletonBlock className="ml-auto h-4 w-28 bg-slate-200/50" />
          <SkeletonBlock className="ml-auto mt-2 h-3 w-20 bg-slate-200/40" />
        </div>
        <div className="hidden items-center justify-center sm:flex">
          <SkeletonBlock className="h-3 w-3 rounded-sm bg-slate-200/40 opacity-60" />
        </div>
      </div>
    </li>
  );
}

export default function RebuildHomeLoading() {
  return (
    <main
      className="min-h-screen bg-slate-50"
      data-testid="rebuild-loading-home"
    >
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 2xl:max-w-[1600px]">
        <section className="rounded-lg border border-slate-200/40 bg-white/80 px-6 py-4">
          <div className="text-xs font-medium text-slate-600">Rebuild lane</div>
          <SkeletonBlock className="mt-2 h-6 w-52 bg-slate-200/80" />
          <SkeletonBlock className="mt-3 h-4 w-80 bg-slate-200/50" />
          <div className="mt-3 flex items-center gap-3 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Resilience</span>
            <span
              data-testid="resilience-label"
              data-tier="UNAVAILABLE"
              className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
            >
              Resilience: UNAVAILABLE
            </span>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200/60 bg-white p-6">
          <div className="-mx-2 grid items-center pb-2 sm:grid-cols-[minmax(0,1fr)_10rem_9rem_15rem_1.25rem] lg:grid-cols-[minmax(0,1fr)_12rem_10rem_18rem_1.25rem] 2xl:grid-cols-[minmax(0,1fr)_13rem_11rem_20rem_1.25rem] gap-x-4 gap-y-2 px-2">
            <SkeletonBlock className="h-4 w-16 bg-slate-200/60" />
            <div className="hidden sm:block" aria-hidden="true" />
            <div className="hidden sm:block" aria-hidden="true" />
            <SkeletonBlock className="ml-auto h-4 w-28 bg-slate-200/40" />
            <div className="hidden sm:block" aria-hidden="true" />
          </div>

          <ul className="mt-4 divide-y divide-slate-100/70">
            {Array.from({ length: 10 }).map((_, idx) => (
              <DealsRowSkeleton key={idx} />
            ))}
          </ul>
        </section>

        <div
          data-testid="rebuild-home-deferred-skeleton"
          className="mt-6 h-8 w-full rounded-md bg-slate-50"
          aria-hidden="true"
        />

        <details className="mt-6 rounded-lg border border-slate-200/60 bg-white p-6">
          <summary className="cursor-pointer list-none text-sm font-medium text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 [&::-webkit-details-marker]:hidden">
            Provenance · Fetched at: —
          </summary>
          <div className="mt-3 space-y-2 text-xs text-slate-600">
            <SkeletonBlock className="h-3 w-72 bg-slate-200/50" />
            <SkeletonBlock className="h-3 w-56 bg-slate-200/40" />
          </div>
        </details>
      </div>
    </main>
  );
}
