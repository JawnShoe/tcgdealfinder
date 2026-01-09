type ProvenanceField = {
  label: string;
  value: string;
};

type ProvenanceDrilldownProps = {
  summary: string;
  fields: ProvenanceField[];
  className?: string;
};

export default function ProvenanceDrilldown({
  summary,
  fields,
  className,
}: ProvenanceDrilldownProps) {
  return (
    <details
      className={`rounded-lg border border-slate-200 bg-white p-4 ${className ?? ""}`}
    >
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-slate-900">
        <span>Provenance</span>
        <span className="min-w-0 flex-1 truncate text-right text-xs font-normal text-slate-500">
          {summary}
        </span>
      </summary>
      <dl className="mt-3 grid gap-2 text-sm text-slate-900 sm:grid-cols-2">
        {fields.map((field) => (
          <div
            key={field.label}
            className="flex items-start justify-between gap-3"
          >
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              {field.label}
            </dt>
            <dd className="text-right font-mono text-xs text-slate-900">
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
