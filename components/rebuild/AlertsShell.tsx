import AlertCard from "./AlertCard";

type AlertItem = {
  id: string;
  title: string;
  detail: string;
  status: string;
  cadence: string;
};

type AlertsShellProps = {
  isAvailable: boolean;
  alerts: AlertItem[];
};

export default function AlertsShell({ isAvailable, alerts }: AlertsShellProps) {
  const hasAlerts = alerts.length > 0;

  return (
    <>
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Create alert
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Save a listing or card to watch for pricing changes.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            disabled
            placeholder="Listing URL or card name"
            className="flex-1 rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-500"
          />
          <button
            type="button"
            disabled
            className="rounded-md border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500"
          >
            Create alert
          </button>
        </div>
        {!isAvailable ? (
          <p className="mt-3 text-xs text-slate-500">
            Alerts are not available yet in this environment.
          </p>
        ) : null}
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Your alerts</h2>
          <p className="text-xs text-slate-500">{alerts.length} total</p>
        </div>

        {!isAvailable ? (
          <div className="mt-4 rounded-md border border-slate-100 bg-slate-50 px-4 py-6 text-center">
            <p className="text-sm text-slate-600">
              Alerts are not available yet in this environment.
            </p>
          </div>
        ) : hasAlerts ? (
          <div className="mt-4 space-y-3">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                title={alert.title}
                detail={alert.detail}
                status={alert.status}
                cadence={alert.cadence}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-slate-100 bg-slate-50 px-4 py-6 text-center">
            <p className="text-sm text-slate-600">No alerts configured yet.</p>
          </div>
        )}
      </section>
    </>
  );
}
