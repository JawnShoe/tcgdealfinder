export type ResilienceTier = "FULL" | "DEGRADED" | "UNAVAILABLE";
export type ResilienceMode = "LIVE" | "CACHED" | "UNKNOWN";

type ResilienceLabelProps = {
  tier: ResilienceTier;
  mode: ResilienceMode;
  reason?: string;
  className?: string;
};

export default function ResilienceLabel(props: ResilienceLabelProps) {
  const { tier, mode, className } = props;

  return (
    <div
      className={`inline-flex h-5 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 text-[11px] font-semibold uppercase leading-5 text-slate-700 ${className ?? ""}`}
    >
      <span>Resilience: {tier}</span>
      <span className="text-slate-400">/</span>
      <span>Mode: {mode}</span>
    </div>
  );
}
