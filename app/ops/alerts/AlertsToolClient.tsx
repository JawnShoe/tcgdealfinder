"use client";

import { useState } from "react";
import type { WatchRow, AlertLogRow } from "@/lib/rebuild/data/alertsOps";

type Props = {
  initialWatches: WatchRow[];
  initialAlerts: AlertLogRow[];
};

type Toast = {
  id: string;
  message: string;
  type: "success" | "error";
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return DATE_FORMATTER.format(new Date(value));
}

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return `$${value.toFixed(2)}`;
}

function describeRule(watch: WatchRow): string {
  if (watch.threshold_type === "price_below") {
    return `Price below ${formatCurrency(watch.threshold_value)}`;
  }
  if (watch.threshold_type === "discount_at_least") {
    return `Discount ≥ ${watch.threshold_value.toFixed(1)}% off`;
  }
  return watch.threshold_type;
}

export function AlertsToolClient({ initialWatches, initialAlerts }: Props) {
  const [watches, setWatches] = useState<WatchRow[]>(initialWatches);
  const [alerts] = useState<AlertLogRow[]>(initialAlerts);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [cardId, setCardId] = useState("");
  const [condition, setCondition] = useState("raw_nm");
  const [thresholdType, setThresholdType] = useState<
    "price_below" | "discount_at_least"
  >("price_below");
  const [thresholdValue, setThresholdValue] = useState("");
  const [note, setNote] = useState("");

  const showToast = (message: string, type: "success" | "error") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardId.trim() || !thresholdValue.trim()) {
      showToast("Card ID and threshold value are required", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/rebuild/ops/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cardId: parseInt(cardId, 10),
          condition,
          thresholdType,
          thresholdValue: parseFloat(thresholdValue),
          note: note.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Failed to create watch", "error");
        return;
      }

      // Refresh page to get updated data
      window.location.reload();
    } catch {
      showToast("Network error", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: number, currentActive: boolean) => {
    try {
      const response = await fetch("/api/rebuild/ops/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "toggle",
          id,
          active: !currentActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Failed to toggle watch", "error");
        return;
      }

      // Optimistic update
      setWatches((prev) =>
        prev.map((w) => (w.id === id ? { ...w, active: !currentActive } : w))
      );
      showToast(
        currentActive ? "Watch deactivated" : "Watch activated",
        "success"
      );
    } catch {
      showToast("Network error", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Delete watch #${id}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/rebuild/ops/alerts?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Failed to delete watch", "error");
        return;
      }

      // Optimistic update
      setWatches((prev) => prev.filter((w) => w.id !== id));
      showToast("Watch deleted", "success");
    } catch {
      showToast("Network error", "error");
    }
  };

  const activeCount = watches.filter((w) => w.active).length;

  return (
    <>
      {/* Stats */}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-900">{activeCount}</span>{" "}
          active watches ·{" "}
          <span className="font-medium text-slate-900">{watches.length}</span>{" "}
          total
        </p>
      </section>

      {/* Add Watch Form */}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
            data-testid="add-watch-button"
          >
            Add watch
          </button>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900">
              New Watch Rule
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Card ID *
                </label>
                <input
                  type="number"
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value)}
                  placeholder="12345"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Condition
                </label>
                <input
                  type="text"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="raw_nm"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Threshold Type
                </label>
                <select
                  value={thresholdType}
                  onChange={(e) =>
                    setThresholdType(
                      e.target.value as "price_below" | "discount_at_least"
                    )
                  }
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="price_below">Price below</option>
                  <option value="discount_at_least">Discount at least</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Threshold Value *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(e.target.value)}
                  placeholder={thresholdType === "price_below" ? "10.00" : "20"}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  {thresholdType === "price_below"
                    ? "Price in CAD"
                    : "Percentage"}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create Watch"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Watches Table */}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-medium text-slate-900">Watchlist</h2>
        </div>

        {watches.length === 0 ? (
          <div
            className="px-4 py-8 text-center text-slate-500"
            data-testid="no-watches-message"
          >
            No watch entries yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Card
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Condition
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Rule
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Active?
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Last Triggered
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {watches.map((watch) => (
                  <tr key={watch.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{watch.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">
                          {watch.card_name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {watch.set_name}
                          {watch.card_number ? ` · #${watch.card_number}` : ""}
                        </span>
                        <span className="text-xs text-slate-400">
                          Card ID: {watch.card_id}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {watch.condition ?? "any"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {describeRule(watch)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                          watch.active
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {watch.active ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {formatDate(watch.last_triggered_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggle(watch.id, watch.active)}
                          className="text-xs text-slate-700 transition hover:text-slate-900"
                        >
                          {watch.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(watch.id)}
                          className="text-xs text-red-600 transition hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Alerts Table */}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-medium text-slate-900">Recent Alerts</h2>
        </div>

        {alerts.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500">
            No alerts yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Watch
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Card
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Condition
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Total (CAD)
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Median (CAD)
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Discount %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {formatDate(alert.created_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {alert.watch_id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">
                          {alert.card_name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {alert.set_name}
                          {alert.card_number ? ` · #${alert.card_number}` : ""}
                        </span>
                        <span className="text-xs text-slate-400">
                          Card ID: {alert.card_id}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {alert.condition ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatCurrency(alert.total_price_cad)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatCurrency(alert.median_price_cad)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {alert.discount_percent != null
                        ? `${alert.discount_percent.toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
}
