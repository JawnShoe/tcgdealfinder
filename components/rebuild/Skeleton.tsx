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

export function SkeletonRow({ className }: SkeletonProps) {
  return (
    <SkeletonBlock
      className={className ? `h-12 w-full ${className}` : "h-12 w-full"}
    />
  );
}
