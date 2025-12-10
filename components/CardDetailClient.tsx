"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import WatchlistButton from "./WatchlistButton";
import { TrustedBadge } from "./TrustedBadge";

import {
  CONDITION_FILTERS,
  type ConditionFilterKey,
  MARKET_FILTERS,
  type MarketFilterKey,
  matchesConditionFilter,
  matchesMarket,
} from "../lib/filters";
import {
  discountClass,
  formatCurrency,
  formatDiscount,
  formatEndsAt,
  getConfidenceLabel,
} from "../lib/dealFormatting";
import { getDealConfidence, isDealTrusted, type DealConfidence } from "../lib/dealScore";
import {
  ALERT_THRESHOLD_OPTIONS,
  MIN_ALERT_THRESHOLD,
  MAX_ALERT_THRESHOLD,
  clampAlertThreshold,
} from "../lib/alertsConfig";

const PriceHistoryChart = dynamic(() => import("./PriceHistoryChart"), {
  ssr: false,
});

type PriceHistoryPoint = {
  date: string;
  median: number;
  sample: number;
};

type AlertStatus = "idle" | "submitting" | "success" | "error";

type ListingSummary = {
  id: number;
  condition: string;
  title: string;
  url: string;
  totalPriceCad: number | null;
  medianPriceCad: number | null;
  discountPercent: number | null;
  sampleSize: number | null;
  market: string;
  endsAt: string | null;
  thumbnailUrl: string | null;
  sellerUsername: string | null;
  sellerFeedbackCount: number | null;
  sellerPositivePercent: number | null;
};

export type CardDetailClientProps = {
  card: {
    id: number;
    name: string;
    setName: string;
    collectorNumber: string | null;
    rarity: string | null;
  };
  historicals: Array<{
    condition: string;
    medianPriceCad: number | null;
    sampleSize: number | null;
  }>;
  listings: ListingSummary[];
};

export default function CardDetailClient({
  card,
  historicals,
  listings,
}: CardDetailClientProps) {
  const [conditionFilter, setConditionFilter] = useState<ConditionFilterKey>(
    CONDITION_FILTERS[0]?.key ?? "all",
  );
  const [marketFilter, setMarketFilter] = useState<MarketFilterKey>(
    MARKET_FILTERS[0]?.key ?? "all",
  );
  const [historyPoints, setHistoryPoints] = useState<PriceHistoryPoint[]>([]);
  const [alertEmail, setAlertEmail] = useState("");
  const [alertThreshold, setAlertThreshold] = useState<number>(
    ALERT_THRESHOLD_OPTIONS[0] ?? MIN_ALERT_THRESHOLD,
  );
  const [alertStatus, setAlertStatus] = useState<AlertStatus>("idle");

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      try {
        const res = await fetch(/api/historicals/);
        if (!res.ok) return;
        const data = (await res.json()) as { points?: PriceHistoryPoint[] };
        if (!cancelled) {
          setHistoryPoints(data.points ?? []);
        }
      } catch (err) {
        console.error("Failed to load price history", err);
      }
    }
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [card.id]);

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const conditionOk = matchesConditionFilter(
        listing.condition,
        conditionFilter,
      );
      const marketOk = matchesMarket(listing.market, marketFilter);
      return conditionOk && marketOk;
    });
  }, [listings, conditionFilter, marketFilter]);

  const activeHistorical = useMemo(() => {
    const match = historicals.find((row) =>
      matchesConditionFilter(row.condition, conditionFilter),
    );
    if (match) return match;
    return historicals[0] ?? null;
  }, [historicals, conditionFilter]);

  const bestTrustedDeal = useMemo(() => {
    return filteredListings
      .filter((listing) => {
        if (
          listing.sellerFeedbackCount == null ||
          listing.sellerPositivePercent == null
        ) {
          return false;
        }
        if (!isDealTrusted(listing.sellerFeedbackCount, listing.sellerPositivePercent)) {
          return false;
        }
        if (listing.discountPercent == null) {
          return false;
        }
        return listing.discountPercent <= 0;
      })
      .sort((a, b) => {
        const priceA = a.totalPriceCad ?? Infinity;
        const priceB = b.totalPriceCad ?? Infinity;
        return priceA - priceB;
      })[0];
  }, [filteredListings]);

  const confidenceLabel = getConfidenceLabel(activeHistorical?.sampleSize ?? null);
  const confidenceChip = getConfidenceChipClass(
    getDealConfidence(activeHistorical?.sampleSize ?? null),
  );

  const handleAlertSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!alertEmail) return;
    setAlertStatus("submitting");
    try {
      const payload = {
        cardId: card.id,
        email: alertEmail,
        minDiscountPercent: clampAlertThreshold(alertThreshold),
      };
      const res = await fetch("/api/alerts/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Subscribe failed");
      }
      setAlertStatus("success");
    } catch (err) {
      console.error(err);
      setAlertStatus("error");
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel space-y-4">
        <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,320px),minmax(0,1fr)] md:gap-8">
          <div className="space-y-4">
            {filteredListings[0]?.thumbnailUrl ? (
              <Image
                src={filteredListings[0].thumbnailUrl as string}
                alt={card.name}
                width={320}
                height={440}
                className="w-full rounded-lg border border-slate-200 object-contain"
              />
            ) : (
              <div className="aspect-[2/3] w-full rounded-lg border border-slate-200 bg-slate-50" />
            )}
            <div className="space-y-1 text-sm text-slate-600">
              <Link href="/" className="text-sky-700 hover:underline">
                ← Back to all deals
              </Link>
              <div className="text-xs uppercase tracking-wide text-slate-500">
                {card.setName}
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {card.name}
              </div>
              <div className="text-xs text-slate-600">#{card.collectorNumber ?? "?"}</div>
              <div className="pt-2">
                <WatchlistButton
                  cardId={card.id}
                  cardName={card.name}
                  setName={card.setName}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase text-slate-500">Condition</label>
              <select
                className="deal-control__select mt-1 w-full"
                value={conditionFilter}
                onChange={(event) =>
                  setConditionFilter(event.target.value as ConditionFilterKey)
                }
              >
                {CONDITION_FILTERS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500">Market</label>
              <select
                className="deal-control__select mt-1 w-full"
                value={marketFilter}
                onChange={(event) =>
                  setMarketFilter(event.target.value as MarketFilterKey)
                }
              >
                {MARKET_FILTERS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-800">
                Price snapshot ({getFilterLabel(conditionFilter, CONDITION_FILTERS)}, {getFilterLabel(marketFilter, MARKET_FILTERS)})
              </div>
              <dl className="mt-3 grid gap-4 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase text-slate-500">Historic median</dt>
                  <dd className="text-base font-semibold text-slate-900">
                    {formatCurrency(activeHistorical?.medianPriceCad ?? null)}
                  </dd>
                  <dd className="text-xs text-slate-600">
                    <span className={confidenceChip}>{confidenceLabel ?? "Unknown"}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-slate-500">Best trusted deal</dt>
                  {bestTrustedDeal ? (
                    <dd className="space-y-1">
                      <div className="text-base font-semibold text-slate-900">
                        {formatCurrency(bestTrustedDeal.totalPriceCad)}
                      </div>
                      <div className={discountClass(bestTrustedDeal.discountPercent)}>
                        {formatDiscount(bestTrustedDeal.discountPercent)} vs historic
                      </div>
                      <div className="text-xs text-slate-600">
                        Ends {formatEndsAt(bestTrustedDeal.endsAt, { short: true })}
                      </div>
                    </dd>
                  ) : (
                    <dd className="text-sm text-slate-600">No trusted deals within this filter yet.</dd>
                  )}
                </div>
              </dl>
            </div>

            <form className="space-y-3" onSubmit={handleAlertSubmit}>
              <div>
                <label className="text-xs uppercase text-slate-500">Email alerts</label>
                <input
                  type="email"
                  className="deal-control__input mt-1 w-full"
                  placeholder="you@example.com"
                  required
                  value={alertEmail}
                  onChange={(event) => setAlertEmail(event.target.value)}
                />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-500">Min discount</label>
                <select
                  className="deal-control__select mt-1 w-full"
                  value={alertThreshold}
                  onChange={(event) => setAlertThreshold(Number(event.target.value))}
                >
                  {ALERT_THRESHOLD_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}%
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={alertStatus === "submitting"}
                className="w-full rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {alertStatus === "submitting" ? "Subscribing..." : "Notify me"}
              </button>
              {alertStatus === "success" && (
                <p className="text-xs text-emerald-600">Alerts enabled for this card.</p>
              )}
              {alertStatus === "error" && (
                <p className="text-xs text-red-600">Could not save your alert. Please try again.</p>
              )}
            </form>
          </div>
        </div>
      </section>

      <section className="panel space-y-3">
        <div className="text-sm font-semibold text-slate-800">Price history</div>
        <PriceHistoryChart points={historyPoints} />
      </section>

      <section className="panel space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-800">
            Current listings · {getFilterLabel(conditionFilter, CONDITION_FILTERS)} · {getFilterLabel(marketFilter, MARKET_FILTERS)}
          </div>
          <div className="text-xs text-slate-500">{filteredListings.length} matches</div>
        </div>
        {filteredListings.length === 0 ? (
          <p className="text-sm text-slate-600">No listings match your filters yet.</p>
        ) : (
          <div className="space-y-3">
            {filteredListings.map((listing) => (
              <article
                key={listing.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm md:flex-row md:items-center md:gap-4"
              >
                <div className="flex items-center gap-3 md:w-1/3">
                  {listing.thumbnailUrl ? (
                    <Image
                      src={listing.thumbnailUrl}
                      alt={listing.title}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded border border-slate-200 bg-slate-50" />
                  )}
                  <div className="space-y-1">
                    <Link
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-sky-700 hover:underline"
                    >
                      {listing.title}
                    </Link>
                    <div className="text-xs text-slate-600">{card.setName}</div>
                  </div>
                </div>
                <div className="grid flex-1 grid-cols-2 gap-3 text-sm text-slate-700 md:grid-cols-4">
                  <div>
                    <div className="text-xs uppercase text-slate-500">Price</div>
                    <div className="font-semibold text-slate-900">
                      {formatCurrency(listing.totalPriceCad)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-slate-500">Historic</div>
                    <div>{formatCurrency(listing.medianPriceCad)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-slate-500">Discount</div>
                    <div className={discountClass(listing.discountPercent)}>
                      {formatDiscount(listing.discountPercent)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-slate-500">Confidence</div>
                    <div className={getConfidenceChipClass(getDealConfidence(listing.sampleSize ?? null))}>
                      {getConfidenceLabel(listing.sampleSize ?? null)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-1 text-sm text-slate-700 md:w-48">
                  <div className="flex items-center gap-1">
                    <span>{listing.sellerUsername ?? "--"}</span>
                    {listing.sellerFeedbackCount != null &&
                      listing.sellerPositivePercent != null &&
                      isDealTrusted(
                        listing.sellerFeedbackCount,
                        listing.sellerPositivePercent,
                      ) && <TrustedBadge />}
                  </div>
                  <div className="text-xs text-slate-500">{listing.market}</div>
                  <div className="text-xs text-slate-500">
                    Ends {formatEndsAt(listing.endsAt, { short: true })}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function getFilterLabel(
  key: string,
  options: Array<{ key: string; label: string }>,
): string {
  if (key === "all") {
    return "All";
  }
  const option = options.find((item) => item.key === key);
  return option ? option.label : "All";
}

function getConfidenceChipClass(confidence: DealConfidence): string {
  switch (confidence) {
    case "high":
      return "inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700";
    case "medium":
      return "inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700";
    case "low":
      return "inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600";
    default:
      return "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600";
  }
}
