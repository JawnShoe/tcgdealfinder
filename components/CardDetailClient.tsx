"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { TrustedBadge } from "./TrustedBadge";
import { WatchlistButton } from "./WatchlistButton";
import { CardIdentityBlock } from "./CardIdentity";
import { ConfidenceChip } from "./ConfidenceChip";
import { MarketFlag } from "./MarketFlag";
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
  getConfidenceLabel as getSampleConfidenceLabel,
} from "../lib/dealFormatting";
import { ALERT_THRESHOLD_OPTIONS } from "../lib/alertsConfig";
import { isDealTrusted } from "../lib/dealScore";

import {
  getMarketLabel,
  getMarketCompactLabel,
  normalizeMarketCode,
  DEFAULT_MARKET,
} from "../lib/markets";
import {
  getConfidenceLabel as getWeightLabel,
  getConfidenceBadgeClass,
  getConfidenceDisplayText,
  getConfidenceCompactText,
  CONFIDENCE_TOOLTIP,
} from "../lib/dealConfidence";
import { buildAffiliateUrl } from "../lib/affiliateUrl";

const PriceHistoryChart = dynamic(() => import("./PriceHistoryChart"), {
  ssr: false,
});

type HistoricalPoint = {
  condition: string;
  medianPriceCad: number | null;
  sampleSize: number | null;
};

type ListingRow = {
  id: number;
  condition: string;
  title: string;
  url: string;
  totalPriceCad: number | null;
  historicPriceCad: number | null;
  discountPercent: number | null;
  sampleSize: number | null;
  market: string;
  endsAt: string | null;
  thumbnailUrl: string | null;
  sellerUsername: string | null;
  sellerFeedbackCount: number | null;
  sellerPositivePercent: number | null;
  confidenceWeight: number | null;
};

export type CardDetailClientProps = {
  detail: {
    card: {
      id: number;
      name: string;
      setName: string;
      collectorNumber: string | null;
      rarity: string | null;
      condition: string | null;
    };
    historicals: HistoricalPoint[];
    listings: ListingRow[];
  };
};

type PriceHistoryStatus = "idle" | "loading" | "ready" | "error";
type AlertStatus = "idle" | "loading" | "success" | "error";

const CONDITION_LABELS: Record<string, string> = {
  raw_nm: "Raw (NM)",
  raw_lp: "Raw (LP)",
  raw_mp: "Raw (MP)",
  raw_hp: "Raw (HP)",
  psa_10: "PSA 10",
  psa_9: "PSA 9",
  psa_8: "PSA 8",
  bgs_10: "BGS 10",
  bgs_95: "BGS 9.5",
  bgs_9: "BGS 9",
  cgc_10: "CGC 10",
  cgc_95: "CGC 9.5",
  cgc_9: "CGC 9",
};

function formatConditionLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return CONDITION_LABELS[value] ?? value.replace(/_/g, " ").toUpperCase();
}



export default function CardDetailClient({
  detail,
}: CardDetailClientProps) {
  const { card, historicals, listings } = detail;
  const conditionLabel = formatConditionLabel(card.condition ?? null);

  const [conditionFilter, setConditionFilter] = useState<ConditionFilterKey>(
    CONDITION_FILTERS[0]?.key ?? "all",
  );
  const [marketFilter, setMarketFilter] = useState<MarketFilterKey>(
    MARKET_FILTERS[0]?.key ?? "all",
  );
  const [priceHistory, setPriceHistory] = useState<
    { date: string; median: number; sample: number }[]
  >([]);
  const [priceHistoryStatus, setPriceHistoryStatus] =
    useState<PriceHistoryStatus>("idle");
  const [alertEmail, setAlertEmail] = useState("");
  const [alertThreshold, setAlertThreshold] = useState(
    ALERT_THRESHOLD_OPTIONS[0],
  );
  const [alertStatus, setAlertStatus] = useState<AlertStatus>("idle");
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadHistory = async () => {
      try {
        setPriceHistoryStatus("loading");
        const res = await fetch(`/api/historicals/${card.id}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("Failed to load price history");
        }
        const data = (await res.json()) as Array<{
          date: string;
          median: number;
          sample: number;
        }>;
        if (!cancelled) {
          setPriceHistory(data);
          setPriceHistoryStatus("ready");
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setPriceHistoryStatus("error");
        }
      }
    };
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [card.id]);

  const filteredListings = useMemo(() => {
    return listings.filter(
      (listing) =>
        matchesConditionFilter(listing.condition, conditionFilter) &&
        matchesMarket(listing.market, marketFilter),
    );
  }, [listings, conditionFilter, marketFilter]);

  const selectedHistorical = useMemo(() => {
    return (
      historicals.find((row) =>
        matchesConditionFilter(row.condition, conditionFilter),
      ) ?? historicals[0] ?? null
    );
  }, [historicals, conditionFilter]);

  const bestTrustedDeal = useMemo(() => {
    return filteredListings
      .filter((listing) =>
        isDealTrusted(
          listing.sellerFeedbackCount,
          listing.sellerPositivePercent,
        ),
      )
      .sort((a, b) => {
        const discountA = a.discountPercent ?? Number.POSITIVE_INFINITY;
        const discountB = b.discountPercent ?? Number.POSITIVE_INFINITY;
        if (discountA !== discountB) {
          return discountA - discountB;
        }
        const priceA = a.totalPriceCad ?? Number.POSITIVE_INFINITY;
        const priceB = b.totalPriceCad ?? Number.POSITIVE_INFINITY;
        return priceA - priceB;
      })[0];
  }, [filteredListings]);

  const listingsLabel = `${filteredListings.length} listings / ${getSampleConfidenceLabel(
    selectedHistorical?.sampleSize ?? null,
  )} data`;
  const historyPointCount = priceHistory.length;
  const historyLabel = conditionLabel ?? "This condition";
  const historyCountText = `${historyPointCount} sale${
    historyPointCount === 1 ? "" : "s"
  } recorded`;

  const handleAlertSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = alertEmail.trim();
    if (!trimmed) {
      setAlertStatus("error");
      setAlertMessage("Please enter an email.");
      return;
    }

    setAlertStatus("loading");
    setAlertMessage(null);

    try {
      const res = await fetch("/api/alerts/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card.id,
          email: trimmed,
          minDiscountPercent: alertThreshold,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error ?? "Subscription failed");
      }
      setAlertStatus("success");
      setAlertMessage(
        `We'll email ${trimmed} when the discount hits ${alertThreshold}%`,
      );
    } catch (error) {
      console.error(error);
      setAlertStatus("error");
      setAlertMessage("Could not save your alert. Try again later.");
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-800">
          &larr; Home
        </Link>
        <Link href="/newest" className="hover:text-slate-800">
          Newest listings
        </Link>
      </nav>

      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-7 lg:px-10">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-12">
          <div className="flex flex-col gap-4">
            <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {filteredListings[0]?.thumbnailUrl ? (
                <Image
                  src={filteredListings[0].thumbnailUrl as string}
                  alt={card.name}
                  width={320}
                  height={420}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
                  No image available
                </div>
              )}
            </div>
            <div className="space-y-1 text-center text-sm text-slate-600 lg:text-left">
              <p>{card.setName}</p>
              {card.collectorNumber && <p>#{card.collectorNumber}</p>}
              {card.rarity && <p>Rarity: {card.rarity}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="space-y-4 border-b border-slate-200 pb-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase text-slate-500">Card</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-3xl font-semibold text-slate-900">
                      {card.name}
                    </h2>
                    {conditionLabel && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {conditionLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{card.setName}</p>
                </div>
                <div className="sm:pt-1">
                  <WatchlistButton cardId={card.id} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase text-slate-500">
                    Historic median (USD)
                  </p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {formatCurrency(selectedHistorical?.medianPriceCad ?? null)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedHistorical?.sampleSize
                      ? `${selectedHistorical.sampleSize} sales`
                      : "Limited data"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase text-slate-500">
                    Best trusted deal (USD)
                  </p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {bestTrustedDeal
                      ? formatCurrency(bestTrustedDeal.totalPriceCad)
                      : "--"}
                  </p>
                  <p
                    className={`text-sm ${discountClass(
                      bestTrustedDeal?.discountPercent ?? null,
                    )}`}
                  >
                    {bestTrustedDeal
                      ? formatDiscount(bestTrustedDeal.discountPercent)
                      : "No trusted listings"}
                  </p>
                  {bestTrustedDeal && (
                    <p className="text-xs text-slate-500">
                      {bestTrustedDeal.market} /{" "}
                      {formatEndsAt(bestTrustedDeal.endsAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <form
              onSubmit={handleAlertSubmit}
              className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm font-semibold text-slate-900">Email alerts</p>
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
                <input
                  type="email"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  placeholder="you@example.com"
                  value={alertEmail}
                  onChange={(event) => setAlertEmail(event.target.value)}
                  required
                />
                <select
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  value={alertThreshold}
                  onChange={(event) =>
                    setAlertThreshold(Number(event.target.value))
                  }
                >
                  {ALERT_THRESHOLD_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}%
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  disabled={alertStatus === "loading"}
                >
                  {alertStatus === "loading" ? "Saving..." : "Notify me"}
                </button>
              </div>
              {alertMessage && (
                <p
                  className={`text-xs ${
                    alertStatus === "error"
                      ? "text-rose-500"
                      : "text-emerald-600"
                  }`}
                >
                  {alertMessage}
                </p>
              )}
            </form>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid w-full gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Condition
              </span>
              <select
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
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
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Market
              </span>
              <select
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
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
            </label>
          </div>
          <p className="text-xs text-slate-500">{listingsLabel}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 lg:px-8">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Price history</h2>
        {priceHistoryStatus === "loading" && (
          <p className="text-sm text-slate-500">Loading chart...</p>
        )}
        {priceHistoryStatus === "error" && (
          <p className="text-sm text-rose-500">
            Unable to load price history right now.
          </p>
        )}
        {priceHistoryStatus === "ready" && (
          <>
            {priceHistory.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                {historyLabel} history: {historyCountText}. More data needed.
              </p>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <PriceHistoryChart points={priceHistory} />
              </div>
            )}
          </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 lg:px-8">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Live listings</h2>
          <p className="text-xs text-slate-500">{listingsLabel}</p>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="min-w-full table-fixed text-sm text-slate-900">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Listing</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">Total USD</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">Historic USD</th>
                <th className="px-3 py-2 text-right">Discount</th>
                <th className="whitespace-nowrap px-3 py-2 text-center">Price conf.</th>
                <th className="px-3 py-2 text-left">Seller</th>
                <th className="px-3 py-2 text-left">Market</th>
                <th className="px-3 py-2 text-right">Ends</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredListings.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center"
                  >
                    <p className="text-sm text-slate-600">
                      No listings match your current filters.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Try adjusting condition or market selection.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredListings.map((listing) => {
                  const weightLabel = getWeightLabel(
                    listing.confidenceWeight ?? null,
                  );
                  return (
                    <tr key={listing.id} className="even:bg-slate-50/50 hover:bg-slate-100">
                      <td className="px-3 py-4 align-middle">
                        <div className="flex items-start gap-3">
                          {listing.thumbnailUrl ? (
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white">
                              <Image
                                src={listing.thumbnailUrl}
                                alt={listing.title}
                                width={64}
                                height={64}
                                className="h-full w-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded border border-dashed border-slate-300 bg-white" />
                          )}
                          <CardIdentityBlock
                            identity={{
                              primary: detail.card.name ?? listing.title,
                              setName: detail.card.setName ?? null,
                              listingTitle: listing.title,
                              cardId: detail.card.id,
                            }}
                            primaryHref={buildAffiliateUrl(listing.url)}
                            showListingTitle
                            showViewCardLink={false}
                          />
                        </div>
                      </td>
                    <td className="px-3 py-4 align-middle text-right text-base font-semibold">
                      {formatCurrency(listing.totalPriceCad)}
                    </td>
                    <td className="px-3 py-4 align-middle text-right text-base text-slate-600">
                      {formatCurrency(listing.historicPriceCad)}
                    </td>
                    <td
                      className={`px-3 py-4 align-middle text-right text-base font-semibold ${discountClass(
                        listing.discountPercent,
                      )}`}
                    >
                      {formatDiscount(listing.discountPercent)}
                    </td>
                    <td className="px-3 py-4 align-middle text-center">
                      <ConfidenceChip
                        weightLabel={weightLabel}
                        sampleSize={listing.sampleSize}
                        center={false}
                      />
                    </td>
                    <td className="px-3 py-4 align-middle text-sm text-slate-700">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="truncate"
                          title={listing.sellerUsername ?? "Unknown"}
                        >
                          {listing.sellerUsername ?? "Unknown"}
                        </span>
                        {isDealTrusted(
                          listing.sellerFeedbackCount,
                          listing.sellerPositivePercent,
                        ) && <TrustedBadge className="flex-none" />}
                      </div>
                    </td>
                    <td className="px-3 py-4 align-middle text-sm text-slate-600">
                      <span
                        title={getMarketLabel(normalizeMarketCode(listing.market))}
                        className="flex items-center gap-1"
                      >
                        <MarketFlag market={listing.market} />
                        <span>{normalizeMarketCode(listing.market) === "EBAY_US" ? "US" : "CA"}</span>
                      </span>
                    </td>
                    <td className="px-3 py-4 align-middle text-right text-slate-600">
                      {formatEndsAt(listing.endsAt)}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
