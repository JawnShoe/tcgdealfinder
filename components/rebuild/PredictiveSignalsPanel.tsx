import type { PredictiveSignalsResult } from "@/lib/rebuild/signals/predictiveSignals";

type PredictiveSignalsPanelProps = {
  result: PredictiveSignalsResult;
  className?: string;
};

export default function PredictiveSignalsPanel({
  result,
  className,
}: PredictiveSignalsPanelProps) {
  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-6 ${
        className ?? ""
      }`}
      data-testid="predictive-signals"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Predictive signals
        </h2>
        <p className="text-xs font-mono text-slate-700">{result.score} / 100</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">
        {result.label}
      </p>
      <ul
        className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700"
        data-testid="predictive-signals-reasons"
      >
        {result.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      {result.inputsUsed.length > 0 ? (
        <details className="mt-3 text-xs text-slate-600">
          <summary className="cursor-pointer select-none text-slate-700">
            Inputs used
          </summary>
          <p className="mt-2 font-mono">{result.inputsUsed.join(", ")}</p>
        </details>
      ) : null}
    </section>
  );
}
