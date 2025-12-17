"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { formatCurrency } from "@/lib/dealFormatting";

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

type WatchRow = {
  id: number;
  cardId: number;
  cardName: string;
  setName: string;
  cardNumber: string | null;
  condition: string | null;
  thresholdType: string;
  thresholdValue: number;
  active: boolean;
  note: string | null;
  createdAt: string;
  lastCheckedAt: string | null;
  lastTriggeredAt: string | null;
};

type AlertRow = {
  id: number;
  watchId: number;
  cardId: number;
  cardName: string;
  setName: string;
  cardNumber: string | null;
  condition: string | null;
  totalPriceCad: number | null;
  medianPriceCad: number | null;
  discountPercent: number | null;
  createdAt: string;
};

type Props = {
  watches: WatchRow[];
  alerts: AlertRow[];
  adminSecret: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_FORMATTER.format(date);
}

function describeRule(watch: WatchRow) {
  if (watch.thresholdType === "price_below") {
    return `Price below ${formatCurrency(watch.thresholdValue)}`;
  }
  if (watch.thresholdType === "discount_at_least") {
    return `Discount ≥ ${watch.thresholdValue.toFixed(1)}% off`;
  }
  return watch.thresholdType;
}

export function AdminAlertsClient({
  watches,
  alerts,
  adminSecret,
}: Props) {
  const router = useRouter();
  const [cardId, setCardId] = useState("");
  const [condition, setCondition] = useState("raw_nm");
  const [thresholdType, setThresholdType] = useState<"price_below" | "discount_at_least">(
    "price_below",
  );
  const [thresholdValue, setThresholdValue] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function callAdminApi(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": adminSecret,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Request failed");
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await callAdminApi("/api/admin/alerts/create", {
        cardId: Number(cardId),
        condition,
        thresholdType,
        thresholdValue: Number(thresholdValue),
        note: note || undefined,
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to create watch:", err);
      alert("Failed to create watch");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(id: number, active: boolean) {
    try {
      await callAdminApi("/api/admin/alerts/toggle", { id, active });
      router.refresh();
    } catch (err) {
      console.error("Failed to toggle watch:", err);
      alert("Toggle failed");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(`Delete watch #${id}?`)) {
      return;
    }
    try {
      await callAdminApi("/api/admin/alerts/delete", { id });
      router.refresh();
    } catch (err) {
      console.error("Failed to delete watch:", err);
      alert("Delete failed");
    }
  }

  const activeCount = watches.filter((w) => w.active).length;

  return (
    <div className="space-y-6">
      <div className="rounded border bg-white p-4">
        <h1 className="text-xl font-semibold text-slate-900">
          Admin – Alerts
        </h1>
        <p className="text-sm text-slate-600">
          {activeCount} active watches · {watches.length} total
        </p>
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          New Watch
        </h2>
        <form
          onSubmit={handleCreate}
          className="grid gap-3 text-sm text-slate-700 md:grid-cols-2"
        >
          <label className="flex flex-col gap-1">
            <span>Card ID</span>
            <input
              type="number"
              required
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              className="rounded border px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Condition (e.g. raw_nm)</span>
            <input
              type="text"
              required
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="rounded border px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Threshold Type</span>
            <select
              value={thresholdType}
              onChange={(e) =>
                setThresholdType(e.target.value as "price_below" | "discount_at_least")
              }
              className="rounded border px-2 py-1"
            >
              <option value="price_below">Price below</option>
              <option value="discount_at_least">Discount at least</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span>Threshold Value</span>
            <input
              type="number"
              required
              value={thresholdValue}
              onChange={(e) => setThresholdValue(e.target.value)}
              className="rounded border px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span>Note (optional)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded border px-2 py-1"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-slate-900 px-3 py-1 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create watch"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          Watchlist
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs md:text-sm">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border px-2 py-1">ID</th>
                <th className="border px-2 py-1">Card</th>
                <th className="border px-2 py-1">Condition</th>
                <th className="border px-2 py-1">Rule</th>
                <th className="border px-2 py-1">Active?</th>
                <th className="border px-2 py-1">Last triggered</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {watches.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-center text-slate-500"
                  >
                    No watch entries yet.
                  </td>
                </tr>
              ) : (
                watches.map((watch) => (
                  <tr key={watch.id} className="border-t">
                    <td className="px-2 py-1">{watch.id}</td>
                    <td className="px-2 py-1">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">
                          {watch.cardName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {watch.setName}
                          {watch.cardNumber ? ` · #${watch.cardNumber}` : ""}
                        </span>
                        <Link
                          href={`/cards/${watch.cardId}`}
                          target="_blank"
                          className="text-xs text-sky-600 transition hover:text-sky-800"
                        >
                          View card
                        </Link>
                      </div>
                    </td>
                    <td className="px-2 py-1">{watch.condition ?? "any"}</td>
                    <td className="px-2 py-1">{describeRule(watch)}</td>
                    <td className="px-2 py-1">
                      {watch.active ? "Yes" : "No"}
                    </td>
                    <td className="px-2 py-1">
                      {formatDate(watch.lastTriggeredAt)}
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className="text-xs text-slate-700 transition hover:text-slate-900"
                          onClick={() =>
                            handleToggle(watch.id, !watch.active)
                          }
                        >
                          {watch.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-600 transition hover:text-red-700"
                          onClick={() => handleDelete(watch.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          Recent Alerts
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs md:text-sm">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border px-2 py-1">Time</th>
                <th className="border px-2 py-1">Watch</th>
                <th className="border px-2 py-1">Card</th>
                <th className="border px-2 py-1">Condition</th>
                <th className="border px-2 py-1">Total (USD)</th>
                <th className="border px-2 py-1">Median (USD)</th>
                <th className="border px-2 py-1">Discount %</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-center text-slate-500"
                  >
                    No alerts yet.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.id} className="border-t">
                    <td className="px-2 py-1">{formatDate(alert.createdAt)}</td>
                    <td className="px-2 py-1">{alert.watchId}</td>
                    <td className="px-2 py-1">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">
                          {alert.cardName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {alert.setName}
                          {alert.cardNumber ? ` · #${alert.cardNumber}` : ""}
                        </span>
                        <Link
                          href={`/cards/${alert.cardId}`}
                          target="_blank"
                          className="text-xs text-sky-600 transition hover:text-sky-800"
                        >
                          View card
                        </Link>
                      </div>
                    </td>
                    <td className="px-2 py-1">
                      {alert.condition ?? "—"}
                    </td>
                    <td className="px-2 py-1">
                      {formatCurrency(alert.totalPriceCad)}
                    </td>
                    <td className="px-2 py-1">
                      {formatCurrency(alert.medianPriceCad)}
                    </td>
                    <td className="px-2 py-1">
                      {alert.discountPercent != null
                        ? `${alert.discountPercent.toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
