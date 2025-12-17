"use client";

import { useState } from "react";

export default function ListingLookup() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{
    url: string;
    matchEligible: boolean;
    matchRejectReason: string | null;
    rejectDetail: string | null;
    rejectSource: string | null;
    shippingKnown: boolean;
    collectorNumber: {
      raw: string | null;
      norm: string | null;
      confidence: string | null;
      signals: string[];
    };
    cardCollectorNumber: {
      norm: string | null;
      confidence: string | null;
    };
  } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    setStatus("loading");
    setMessage(null);
    setResult(null);

    try {
      const params = new URLSearchParams({ itemId: trimmed });
      const res = await fetch(`/api/listings/by-ebay-id?${params.toString()}`, {
        method: "GET",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? body?.error ?? "Unable to find listing.");
      }
      const json = (await res.json()) as {
        listing: {
          url: string;
          title: string;
          matchEligible: boolean;
          matchRejectReason: string | null;
          rejectSource: string | null;
          rejectDetail: string | null;
          shippingKnown: boolean;
          collectorNumber: {
            raw: string | null;
            norm: string | null;
            confidence: string | null;
            signals: string[];
          };
          cardCollectorNumber: {
            norm: string | null;
            confidence: string | null;
          };
        };
      };
      setResult({
        url: json.listing.url,
        matchEligible: json.listing.matchEligible ?? true,
        matchRejectReason: json.listing.matchRejectReason ?? null,
        rejectSource: json.listing.rejectSource ?? null,
        rejectDetail: json.listing.rejectDetail ?? null,
        shippingKnown: json.listing.shippingKnown ?? true,
        collectorNumber: {
          raw: json.listing.collectorNumber?.raw ?? null,
          norm: json.listing.collectorNumber?.norm ?? null,
          confidence: json.listing.collectorNumber?.confidence ?? null,
          signals: json.listing.collectorNumber?.signals ?? [],
        },
        cardCollectorNumber: {
          norm: json.listing.cardCollectorNumber?.norm ?? null,
          confidence: json.listing.cardCollectorNumber?.confidence ?? null,
        },
      });
      setMessage(json.listing.title ?? "Listing found.");
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Not in our database yet. Try again after the next refresh cycle.",
      );
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
          placeholder="Paste eBay item ID or URL"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Looking..." : "Find listing"}
        </button>
      </form>
      {status !== "idle" && message ? (
        <div className="mt-2 space-y-3 text-sm">
          <p
            className={
              status === "error" ? "text-rose-600" : "text-emerald-600"
            }
          >
            {result ? (
              <>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-link"
                >
                  {message}
                </a>
                {!result.matchEligible && (
                  <span
                    className="ml-2 inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
                    title={
                      result.matchRejectReason === "collector_number_mismatch"
                        ? `Card expects ${result.cardCollectorNumber.norm ?? "unknown"} · Listing ${result.collectorNumber.norm ?? "unknown"}`
                        : result.rejectDetail ?? undefined
                    }
                  >
                    {result.matchRejectReason === "collector_number_mismatch"
                      ? "Excluded: Collector # mismatch"
                      : `Excluded: ${result.matchRejectReason ?? "flagged"}`}
                  </span>
                )}
                {!result.shippingKnown && (
                  <span className="ml-2 inline-flex items-center rounded bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                    Shipping unknown
                  </span>
                )}
              </>
            ) : (
              message
            )}
          </p>
          {result && (
            <div className="rounded border border-slate-200 bg-white p-2 text-xs text-slate-600">
              <p>
                Listing collector #:{" "}
                <span className="font-semibold text-slate-900">
                  {result.collectorNumber.norm ??
                    result.collectorNumber.raw ??
                    "Not detected"}
                </span>{" "}
                ({result.collectorNumber.confidence ?? "NONE"} confidence)
              </p>
              {result.collectorNumber.signals.length > 0 ? (
                <p>
                  Signals:{" "}
                  <span className="font-mono text-[11px]">
                    {result.collectorNumber.signals.join(", ")}
                  </span>
                </p>
              ) : null}
              {result.cardCollectorNumber.norm && (
                <p>
                  Card expects:{" "}
                  <span className="font-semibold text-slate-900">
                    {result.cardCollectorNumber.norm}
                  </span>{" "}
                  ({result.cardCollectorNumber.confidence ?? "UNKNOWN"})
                </p>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
