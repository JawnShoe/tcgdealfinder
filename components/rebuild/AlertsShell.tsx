import AlertsSubscribe from "@/components/rebuild/AlertsSubscribe";

type AlertsShellProps = {
  isAvailable: boolean;
};

export default function AlertsShell({ isAvailable }: AlertsShellProps) {
  return (
    <>
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Subscribe to alerts
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Subscribe to email alerts for a specific card.
            </p>
          </div>
        </div>

        <AlertsSubscribe className="mt-4" />

        <div className="mt-3 space-y-1 text-xs text-slate-500">
          {!isAvailable ? (
            <p>Alerts are not available in this environment.</p>
          ) : null}
          <p>
            Alerts history is not available yet (blocked: no public endpoint).
          </p>
        </div>
      </section>
    </>
  );
}
