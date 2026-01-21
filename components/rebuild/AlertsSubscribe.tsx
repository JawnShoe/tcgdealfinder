"use client";

import { useState } from "react";

type SubscribeStatus = "idle" | "loading" | "success" | "error";

type AlertsSubscribeProps = {
  className?: string;
};

export default function AlertsSubscribe({ className }: AlertsSubscribeProps) {
  const [cardId, setCardId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [minDiscountPercent, setMinDiscountPercent] = useState<string>("10");
  const [status, setStatus] = useState<SubscribeStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const disabled = status === "loading";

  const handleSubmit = async () => {
    setError(null);

    const cardIdNumber = Number(cardId.trim());
    const minDiscountNumber = Number(minDiscountPercent.trim());

    if (!Number.isFinite(cardIdNumber) || cardIdNumber <= 0) {
      setStatus("error");
      setError("Card ID is required.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setStatus("error");
      setError("A valid email address is required.");
      return;
    }

    if (
      !Number.isFinite(minDiscountNumber) ||
      minDiscountPercent.trim() === ""
    ) {
      setStatus("error");
      setError("Minimum discount is required.");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/rebuild/alerts/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: cardIdNumber,
          email: email.trim(),
          minDiscountPercent: minDiscountNumber,
        }),
      });

      const json = (await response.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error?: string }
        | null;

      if (!response.ok || !json || json.ok !== true) {
        setStatus("error");
        const message =
          json && typeof json === "object" && "error" in json
            ? String((json as { error?: string }).error ?? "")
            : "";
        setError(
          message.trim() ? message.trim() : "Unable to create subscription."
        );
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setError("Unable to create subscription.");
    }
  };

  if (status === "success") {
    return (
      <div
        data-testid="rebuild-alerts-success"
        className={`rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 ${className ?? ""}`}
      >
        You&apos;ll only be emailed when a deal meets these conditions.
      </div>
    );
  }

  return (
    <form
      data-testid="rebuild-alerts-subscribe-form"
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled) return;
        void handleSubmit();
      }}
    >
      <p className="text-sm text-slate-600">
        You&apos;ll only be emailed when a deal meets these conditions.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">
          Card ID
          <input
            data-testid="rebuild-alerts-card-id"
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
            inputMode="numeric"
            pattern="\\d*"
            value={cardId}
            disabled={disabled}
            onChange={(event) =>
              setCardId(event.target.value.replace(/[^\d]/g, ""))
            }
          />
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700 sm:col-span-2">
          Email
          <input
            data-testid="rebuild-alerts-email"
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
            type="email"
            autoComplete="email"
            value={email}
            disabled={disabled}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">
          Min discount (%)
          <input
            data-testid="rebuild-alerts-min-discount"
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
            inputMode="numeric"
            pattern="\\d*"
            value={minDiscountPercent}
            disabled={disabled}
            onChange={(event) =>
              setMinDiscountPercent(event.target.value.replace(/[^\d]/g, ""))
            }
          />
        </label>

        <div className="flex items-end gap-2 sm:col-span-2">
          <button
            data-testid="rebuild-alerts-submit"
            type="submit"
            disabled={disabled}
            className="rounded-md border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Subscribing..." : "Subscribe"}
          </button>
          {status === "error" && error ? (
            <p
              data-testid="rebuild-alerts-error"
              className="text-sm text-slate-700"
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
