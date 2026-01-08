type ConfidenceBadgeProps = {
  label: string;
};

export default function ConfidenceBadge({ label }: ConfidenceBadgeProps) {
  const colorClass =
    label === "high"
      ? "bg-emerald-100 text-emerald-800"
      : label === "medium"
        ? "bg-amber-100 text-amber-800"
        : label === "low"
          ? "bg-red-100 text-red-800"
          : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}
