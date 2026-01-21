import AlertsSubscribe from "@/components/rebuild/AlertsSubscribe";
import AlertsHistory from "@/components/rebuild/AlertsHistory";

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
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Recent alerts</h2>
        <p className="mt-2 text-sm text-slate-600">
          Recently triggered alerts (limited window).
        </p>
        <AlertsHistory className="mt-4" />
      </section>
    </>
  );
}
