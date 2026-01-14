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

  const tierBorderStyles: Record<ResilienceTier, string> = {
    LIVE: "border-emerald-700",
    CACHED: "border-blue-700",
    STALE: "border-amber-800",
    PARTIAL: "border-orange-800",
    UNAVAILABLE: "border-slate-500",
  };

  const tierBadgeStyles: Record<ResilienceTier, string> = {
    LIVE: "bg-emerald-700 text-white",
    CACHED: "bg-blue-700 text-white",
    STALE: "bg-amber-800 text-white",
    PARTIAL: "bg-orange-800 text-white",
    UNAVAILABLE: "bg-slate-700 text-white",
  };

  return (
    <div
      className={`inline-flex h-6 items-center gap-2 rounded-md border border-l-4 bg-white px-2 text-[11px] font-semibold leading-5 text-slate-900 ${tierBorderStyles[tier]} ${className ?? ""}`}
      data-testid="resilience-label"
      data-tier={tier}
    >
      <span
        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase leading-4 ${tierBadgeStyles[tier]}`}
      >
        {label}
      </span>
      <span className="uppercase">Resilience</span>
      {isDegraded && explanation ? (
        <>
          <span className="font-normal text-slate-800" aria-hidden="true">
            -
          </span>
          <span className="font-normal normal-case text-slate-800">
            {explanation}
          </span>
        </>
      ) : null}
    </div>
  );
}
