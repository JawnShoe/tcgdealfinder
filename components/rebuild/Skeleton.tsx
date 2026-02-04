type SkeletonProps = {
  className?: string;
};

export function SkeletonBlock({ className }: SkeletonProps) {
  const classes = className
    ? `rounded bg-slate-200 ${className}`
    : "rounded bg-slate-200";

  return <div aria-hidden="true" className={classes} />;
}

export function SkeletonLine({ className }: SkeletonProps) {
  return <SkeletonBlock className={className ? `h-3 ${className}` : "h-3"} />;
}

const GRID_GAP = "gap-x-4 gap-y-2";
const ROW_PADDING = "px-2";
const GRID_COLS_SM = "sm:grid-cols-[minmax(0,1fr)_10rem_9rem_15rem_2rem]";
const GRID_COLS_LG = "lg:grid-cols-[minmax(0,1fr)_12rem_10rem_18rem_2rem]";
const GRID_COLS_2XL = "2xl:grid-cols-[minmax(0,1fr)_13rem_11rem_20rem_2rem]";
const GRID_COLS = `grid-cols-1 ${GRID_COLS_SM} ${GRID_COLS_LG} ${GRID_COLS_2XL}`;

const GRID_COLS_HOME_SM =
  "sm:grid-cols-[minmax(0,1fr)_10rem_9rem_15rem_1.25rem]";
const GRID_COLS_HOME_LG =
  "lg:grid-cols-[minmax(0,1fr)_12rem_10rem_18rem_1.25rem]";
const GRID_COLS_HOME_2XL =
  "2xl:grid-cols-[minmax(0,1fr)_13rem_11rem_20rem_1.25rem]";
const GRID_COLS_HOME = `grid-cols-1 ${GRID_COLS_HOME_SM} ${GRID_COLS_HOME_LG} ${GRID_COLS_HOME_2XL}`;

type SkeletonRowProps = SkeletonProps & {
  mode?: "home" | "discovery";
};

export function SkeletonRow({
  className,
  mode = "discovery",
}: SkeletonRowProps) {
  const gridCols = mode === "home" ? GRID_COLS_HOME : GRID_COLS;
  return (
    <div
      aria-hidden="true"
      className={`grid ${gridCols} ${GRID_GAP} ${ROW_PADDING} -mx-2 rounded-md py-1.5 ${
        className ?? ""
      }`}
    >
      <div className="min-w-0">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="mt-2 h-3 w-5/12" />
      </div>

      <div className="whitespace-nowrap text-right tabular-nums">
        <SkeletonBlock className="ml-auto h-5 w-20" />
        <SkeletonBlock className="ml-auto mt-2 h-3 w-12" />
      </div>

      <div className="whitespace-nowrap text-right tabular-nums">
        <SkeletonBlock className="ml-auto h-4 w-14" />
        <SkeletonBlock className="ml-auto mt-2 h-3 w-16" />
      </div>

      <div className="min-w-0 text-right">
        <SkeletonBlock className="ml-auto h-4 w-24" />
        <SkeletonBlock className="ml-auto mt-2 h-3 w-20" />
      </div>

      <div className="hidden items-center justify-center sm:flex">
        <SkeletonBlock className="h-3 w-3 rounded-sm opacity-60" />
      </div>
    </div>
  );
}
