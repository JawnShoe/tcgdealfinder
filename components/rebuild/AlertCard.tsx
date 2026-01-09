type AlertCardProps = {
  title: string;
  detail: string;
  status: string;
  cadence: string;
};

export default function AlertCard({
  title,
  detail,
  status,
  cadence,
}: AlertCardProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <div className="text-right text-xs font-semibold uppercase text-slate-600">
          {status}
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">Cadence: {cadence}</p>
    </div>
  );
}
