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
    shippingKnown: boolean;
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
          shippingKnown: boolean;
        };
      };
      setResult({
        url: json.listing.url,
        matchEligible: json.listing.matchEligible ?? true,
        matchRejectReason: json.listing.matchRejectReason ?? null,
        shippingKnown: json.listing.shippingKnown ?? true,
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
        <p
          className={`mt-2 text-sm ${
            status === "error" ? "text-rose-600" : "text-emerald-600"
          }`}
        >
          {result ? (
            <>
              <a href={result.url} target="_blank" rel="noopener noreferrer" className="underline">
                {message}
              </a>
              {!result.matchEligible && (
                <span className="ml-2 inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  Excluded: {result.matchRejectReason ?? "flagged"}
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
      ) : null}
    </div>
  );
}
