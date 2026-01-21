"use client";

import { useCallback, useEffect, useState } from "react";

type AlertsHistoryUnavailableStatus = "db_unavailable" | "db_not_initialized";

type PublicAlertEvent = {
  summary: string;
  occurredAtISO: string;
  triggered: {
    condition: string | null;
    discountPercent: number | null;
  };
};

type AlertsHistoryResponse =
  | {
      ok: true;
      alerts: PublicAlertEvent[];
      limit: number;
      windowHours: number;
      status?: AlertsHistoryUnavailableStatus;
    }
  | { ok: false; error: string };

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "unavailable"; status: AlertsHistoryUnavailableStatus }
  | { kind: "empty" }
  | { kind: "ready"; alerts: PublicAlertEvent[] };

type AlertsHistoryProps = {
  className?: string;
};

export default function AlertsHistory({ className }: AlertsHistoryProps) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });

    try {
      const response = await fetch("/api/rebuild/alerts/history", {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      const json = (await response
        .json()
        .catch(() => null)) as AlertsHistoryResponse | null;

      if (
        !response.ok ||
        !json ||
        typeof json !== "object" ||
        !("ok" in json)
      ) {
        setState({
          kind: "error",
          message: "Unable to load recent alerts.",
        });
        return;
      }

      if (!json.ok) {
        setState({
          kind: "error",
          message: "Unable to load recent alerts.",
        });
        return;
      }

      if (
        json.status === "db_unavailable" ||
        json.status === "db_not_initialized"
      ) {
        setState({ kind: "unavailable", status: json.status });
        return;
      }

      if (!Array.isArray(json.alerts) || json.alerts.length === 0) {
        setState({ kind: "empty" });
        return;
      }

      setState({ kind: "ready", alerts: json.alerts });
    } catch {
      setState({ kind: "error", message: "Unable to load recent alerts." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div data-testid="rebuild-alerts-history" className={className}>
      {state.kind === "loading" ? (
        <p
          data-testid="rebuild-alerts-history-loading"
          className="text-sm text-slate-600"
        >
          Loading recent alerts…
        </p>
      ) : null}

      {state.kind === "error" ? (
        <div data-testid="rebuild-alerts-history-error">
          <p className="text-sm text-slate-700">{state.message}</p>
          <button
            data-testid="rebuild-alerts-history-retry"
            type="button"
            className="mt-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {state.kind === "unavailable" ? (
        <p
          data-testid="rebuild-alerts-history-unavailable"
          className="text-sm text-slate-600"
        >
          Recent alerts are not available in this environment.
        </p>
      ) : null}

      {state.kind === "empty" ? (
        <p
          data-testid="rebuild-alerts-history-empty"
          className="text-sm text-slate-600"
        >
          No alerts triggered recently.
        </p>
      ) : null}

      {state.kind === "ready" ? (
        <ul
          data-testid="rebuild-alerts-history-list"
          className="space-y-3"
          aria-label="Recent alerts"
        >
          {state.alerts.map((alert, index) => (
            <li
              key={`${alert.occurredAtISO}-${index}`}
              data-testid="rebuild-alerts-history-item"
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <p className="text-sm font-medium text-slate-900">
                {alert.summary}
              </p>
              <p className="mt-1 text-xs text-slate-700">
                {formatTrigger(alert.triggered)}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                When: {formatAge(alert.occurredAtISO)} ·{" "}
                <span className="whitespace-nowrap">
                  {formatUtc(alert.occurredAtISO)}
                </span>
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function formatTrigger(triggered: PublicAlertEvent["triggered"]): string {
  const parts: string[] = [];

  const condition = triggered.condition?.trim() || null;
  parts.push(condition ? `Condition: ${condition}` : "Condition: —");

  if (typeof triggered.discountPercent === "number") {
    parts.push(`Discount: ${Math.round(triggered.discountPercent)}%`);
  } else {
    parts.push("Discount: —");
  }

  return parts.join(" · ");
}

function formatAge(occurredAtISO: string): string {
  const parsed = new Date(occurredAtISO);
  if (!Number.isFinite(parsed.getTime())) return "—";

  const diffMs = Date.now() - parsed.getTime();
  if (diffMs < 0) return "Just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatUtc(occurredAtISO: string): string {
  const parsed = new Date(occurredAtISO);
  if (!Number.isFinite(parsed.getTime())) return "—";

  const yyyy = parsed.getUTCFullYear();
  const mm = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getUTCDate()).padStart(2, "0");
  const hh = String(parsed.getUTCHours()).padStart(2, "0");
  const min = String(parsed.getUTCMinutes()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
}
