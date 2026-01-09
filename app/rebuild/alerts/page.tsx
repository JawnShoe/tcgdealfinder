import AlertsShell from "@/components/rebuild/AlertsShell";
import ComplianceDisclosure from "@/components/rebuild/ComplianceDisclosure";
import ProvenanceDrilldown from "@/components/rebuild/ProvenanceDrilldown";
import ResilienceLabel, {
  ResilienceMode,
  ResilienceTier,
} from "@/components/rebuild/ResilienceLabel";
import { isRebuildDbConfigured } from "@/lib/rebuild/data/dataAvailability";

export default function RebuildAlertsPage() {
  const isDbConfigured = isRebuildDbConfigured();
  const alertsAvailable = false;
  const alerts = [];

  let resilienceTier: ResilienceTier = "FULL";
  let resilienceMode: ResilienceMode = "LIVE";

  if (!isDbConfigured) {
    resilienceTier = "UNAVAILABLE";
    resilienceMode = "UNKNOWN";
  } else if (!alertsAvailable) {
    resilienceTier = "DEGRADED";
    resilienceMode = "UNKNOWN";
  }

  const provenanceFields = [
    { label: "DB configured", value: isDbConfigured ? "yes" : "no" },
  ];

  const provenanceSummary = isDbConfigured
    ? "DB configured"
    : "DB not configured";

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Rebuild lane - Alerts
        </div>
        <ResilienceLabel
          className="mb-6"
          tier={resilienceTier}
          mode={resilienceMode}
        />

        <header className="rounded-lg border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-semibold text-slate-900">Alerts</h1>
          <p className="mt-2 text-sm text-slate-700">
            Track listing changes with rebuild-only alerts.
          </p>
        </header>

        <AlertsShell isAvailable={alertsAvailable} alerts={alerts} />

        <ProvenanceDrilldown
          className="mt-6"
          summary={provenanceSummary}
          fields={provenanceFields}
        />

        <ComplianceDisclosure className="mt-6" />
      </div>
    </main>
  );
}
