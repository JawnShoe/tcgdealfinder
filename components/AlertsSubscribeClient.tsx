"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { ALERT_THRESHOLD_OPTIONS } from "../lib/alertsConfig";

type SubscribeStatus = "idle" | "loading" | "success" | "error";

type AlertsSubscribeClientProps = {
  initialCardId?: number | null;
  initialCardName?: string | null;
};

export function AlertsSubscribeClient({
  initialCardId,
  initialCardName,
}: AlertsSubscribeClientProps) {
  const [cardId, setCardId] = useState<string>(
    initialCardId ? String(initialCardId) : ""
  );
  const [email, setEmail] = useState("");
  const [minDiscount, setMinDiscount] = useState(ALERT_THRESHOLD_OPTIONS[0]);
  const [status, setStatus] = useState<SubscribeStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cardIdNum = Number(cardId);
    if (!Number.isFinite(cardIdNum) || cardIdNum <= 0) {
      setStatus("error");
      setMessage("Please enter a valid card ID.");
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/alerts/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: cardIdNum,
          email: trimmedEmail,
          minDiscountPercent: minDiscount,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error ?? "Subscription failed");
      }

      setStatus("success");
      setMessage(
        `Subscribed! We'll email ${trimmedEmail} when the discount hits ${minDiscount}%.`
      );
    } catch (error) {
      console.error("Subscribe error:", error);
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not subscribe. Try again later."
      );
    }
  };

  if (status === "success") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-sm font-semibold text-green-800">{message}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setMessage(null);
              setEmail("");
            }}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Subscribe another email
          </button>
          {initialCardId ? (
            <Link
              href={`/cards/${initialCardId}`}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Back to card
            </Link>
          ) : (
            <Link
              href="/"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Browse deals
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          {/* Card ID field */}
          <div className="space-y-2">
            <label
              htmlFor="cardId"
              className="block text-sm font-medium text-slate-700"
            >
              Card ID
            </label>
            {initialCardName ? (
              <div className="space-y-1">
                <input
                  type="number"
                  id="cardId"
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  placeholder="e.g., 123"
                  required
                  min={1}
                  readOnly
                />
                <p className="text-sm text-slate-600">
                  Subscribing to:{" "}
                  <span className="font-medium">{initialCardName}</span>
                </p>
              </div>
            ) : (
              <input
                type="number"
                id="cardId"
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                placeholder="e.g., 123"
                required
                min={1}
              />
            )}
            <p className="text-xs text-slate-500">
              Find the card ID in the URL when viewing a card (e.g.,
              /cards/123).
            </p>
          </div>

          {/* Email field */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              Email address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              placeholder="you@example.com"
              required
            />
          </div>

          {/* Discount threshold field */}
          <div className="space-y-2">
            <label
              htmlFor="minDiscount"
              className="block text-sm font-medium text-slate-700"
            >
              Alert when discount is at least
            </label>
            <select
              id="minDiscount"
              value={minDiscount}
              onChange={(e) => setMinDiscount(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            >
              {ALERT_THRESHOLD_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}% off
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error message */}
      {status === "error" && message && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">{message}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-md bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {status === "loading" ? "Subscribing..." : "Subscribe to alerts"}
      </button>

      <p className="text-center text-xs text-slate-500">
        You can unsubscribe at any time via the link in the alert emails.
      </p>
    </form>
  );
}
