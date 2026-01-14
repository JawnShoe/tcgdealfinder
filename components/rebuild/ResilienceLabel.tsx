import {
  type ResilienceTier,
  getTierLabel,
  isDegradedTier,
} from "@/lib/rebuild/resilience/evaluateResilience";

// Re-export for convenience
export type { ResilienceTier };

type ResilienceLabelProps = {
  tier: ResilienceTier;
  explanation?: string;
  className?: string;
};

export default function ResilienceLabel(props: ResilienceLabelProps) {
  const { tier, explanation, className } = props;
  const label = getTierLabel(tier);
  const isDegraded = isDegradedTier(tier);

  // Tier-specific styling
  const tierStyles: Record<ResilienceTier, string> = {
    LIVE: "border-emerald-200 bg-emerald-50 text-emerald-800",
    CACHED: "border-blue-200 bg-blue-50 text-blue-800",
    STALE: "border-amber-200 bg-amber-50 text-amber-800",
    PARTIAL: "border-orange-200 bg-orange-50 text-orange-800",
    UNAVAILABLE: "border-slate-300 bg-slate-100 text-slate-700",
  };

  return (
    <div
      className={`inline-flex h-5 items-center gap-2 rounded-full border px-2 text-[11px] font-semibold uppercase leading-5 ${tierStyles[tier]} ${className ?? ""}`}
      data-testid="resilience-label"
      data-tier={tier}
    >
      <span>Resilience: {label}</span>
      {isDegraded && explanation ? (
        <>
          <span className="opacity-50">/</span>
          <span className="font-normal normal-case opacity-75">
            {explanation}
          </span>
        </>
      ) : null}
    </div>
  );
}
