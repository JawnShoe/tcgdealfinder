"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { TrustedBadge } from "./TrustedBadge";
import { WatchlistStarButton } from "./WatchlistStarButton";
import { CardIdentityBlock } from "./CardIdentity";
import { ConfidenceChip } from "./ConfidenceChip";
import { MarketFlag } from "./MarketFlag";
import { SellerNameWithTooltip, formatSellerSalesCount } from "./SellerNameWithTooltip";
import { getSellerDisplayData } from "@/lib/sellerDisplay";
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
  formatUSD,
  formatDiscount,
  getEndsAtDisplay,
  getConfidenceLabel as getSampleConfidenceLabel,
  formatFreshness,
} from "../lib/dealFormatting";
import { buildDealViewModel, type DealViewModel } from "../lib/dealViewModel";
import { ALERT_THRESHOLD_OPTIONS } from "../lib/alertsConfig";
import { isDealTrusted } from "../lib/dealScore";

import {
  getMarketLabel,
  getMarketCompactLabel,
  getMarketEmoji,
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
import type { Deal } from "../types/deal";

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
  totalUsd: number | null;
  historicPriceCad: number | null;
  discountPercent: number | null;
  sampleSize: number | null;
  market: string;
  endsAt: string | null;
  updatedAt: string | null;
  thumbnailUrl: string | null;
  sellerUsername: string | null;
  sellerStoreName: string | null;
  sellerFeedbackCount: number | null;
  sellerPositivePercent: number | null;
  confidenceWeight: number | null;
  integrityStatus: "OK" | "REVIEW";
  integrityReason: string | null;
  integrityScore: number | null;
  overrideType: "ALLOW" | "HARD_BLOCK" | "SOFT_EXCLUDE" | null;
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
      stockImageUrl?: string | null; // TCGplayer stock image
    };
    historicals: HistoricalPoint[];
    listings: ListingRow[];
    moreFromSet: Array<{
      id: number;
      name: string;
      cardNumber: string | null;
    }>;
  };
};

type PriceHistoryStatus = "idle" | "loading" | "ready" | "error";
type AlertStatus = "idle" | "loading" | "success" | "error";

type ConfidenceFilterKey = "all" | "high" | "medium" | "low";
type HeaderSortKey = "total" | "historic" | "discount" | "ends" | "seller";
type HeaderSort = {
  key: HeaderSortKey | null;
  dir: "asc" | "desc";
};

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



// Convert ListingRow to Deal for buildDealViewModel
function listingRowToDeal(
  listing: ListingRow,
  cardId: number,
  cardName: string,
  setName: string,
): Deal {
  return {
    id: listing.id,
    title: listing.title,
    url: listing.url,
    priceCad: listing.totalPriceCad,
    shippingCad: null,
    totalPriceCad: listing.totalPriceCad,
    totalUsd: listing.totalUsd,
    historicPriceCad: listing.historicPriceCad,
    discountPercent: listing.discountPercent,
    sampleSize: listing.sampleSize,
    market: listing.market,
    endsAt: listing.endsAt,
    updatedAt: listing.updatedAt,
    thumbnailUrl: listing.thumbnailUrl,
    sellerUsername: listing.sellerUsername,
    sellerStoreName: listing.sellerStoreName ?? undefined,
    sellerFeedbackCount: listing.sellerFeedbackCount ?? undefined,
    sellerPositivePercent: listing.sellerPositivePercent ?? undefined,
    card: {
      id: cardId,
      name: cardName,
      setName,
      cardNumber: null,
      conditionBucket: listing.condition,
    },
    condition: listing.condition,
    setName,
    cardName,
    cardId,
    listingId: String(listing.id),
    confidenceWeight: listing.confidenceWeight ?? undefined,
    integrityStatus: listing.integrityStatus,
    integrityReason: listing.integrityReason ?? undefined,
    integrityScore: listing.integrityScore ?? undefined,
    overrideType: listing.overrideType ?? undefined,
  };
}

export default function CardDetailClient({
  detail,
}: CardDetailClientProps) {
  const { card, historicals, listings, moreFromSet } = detail;
  const conditionLabel = formatConditionLabel(card.condition ?? null);

  const [conditionFilter, setConditionFilter] = useState<ConditionFilterKey>(
    CONDITION_FILTERS[0]?.key ?? "all",
  );
  const [marketFilter, setMarketFilter] = useState<MarketFilterKey>(
    MARKET_FILTERS[0]?.key ?? "all",
  );
  const [priceConfFilter, setPriceConfFilter] = useState<ConfidenceFilterKey>("all");
  const [headerSort, setHeaderSort] = useState<HeaderSort>({
    key: "total", // Default: Total ASC
    dir: "asc",
  });
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

  // Convert listings to view models
  const viewModels = useMemo<DealViewModel[]>(() => {
    return listings.map((listing) => {
      const deal = listingRowToDeal(listing, card.id, card.name, card.setName);
      return buildDealViewModel(deal, {
        computeScore: false, // CardDetail doesn't use score
        referenceTime: Date.now(),
      });
    });
  }, [listings, card.id, card.name, card.setName]);

  const filteredListings = useMemo(() => {
    let filtered = viewModels.filter(
      (vm) =>
        matchesConditionFilter(vm.deal.condition, conditionFilter) &&
        matchesMarket(vm.deal.market, marketFilter),
    );

    // Price confidence filter
    if (priceConfFilter !== "all") {
      filtered = filtered.filter((vm) => {
        const confLabel = vm.priceConfidenceLabel ?? "low";
        return confLabel === priceConfFilter;
      });
    }

    // Header sort
    if (headerSort.key) {
      const key = headerSort.key;
      const dir = headerSort.dir;
      filtered = [...filtered].sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;

        switch (key) {
          case "total":
            // Nulls sort last in both ASC and DESC
            aVal = a.totalUsd ?? (dir === "asc" ? Infinity : -Infinity);
            bVal = b.totalUsd ?? (dir === "asc" ? Infinity : -Infinity);
            break;
          case "historic":
            aVal = a.historicUsd ?? (dir === "asc" ? Infinity : -Infinity);
            bVal = b.historicUsd ?? (dir === "asc" ? Infinity : -Infinity);
            break;
          case "discount":
            aVal = a.discountPercent ?? (dir === "asc" ? Infinity : -Infinity);
            bVal = b.discountPercent ?? (dir === "asc" ? Infinity : -Infinity);
            break;
          case "ends":
            aVal = a.endsAtMs ?? (dir === "asc" ? Infinity : -Infinity);
            bVal = b.endsAtMs ?? (dir === "asc" ? Infinity : -Infinity);
            break;
          case "seller":
            aVal = a.deal.sellerUsername ?? "zzz";
            bVal = b.deal.sellerUsername ?? "zzz";
            break;
          default:
            aVal = 0;
            bVal = 0;
        }

        let cmp = 0;
        if (typeof aVal === "number" && typeof bVal === "number") {
          cmp = aVal - bVal;
        } else {
          cmp = String(aVal).localeCompare(String(bVal));
        }

        if (dir === "desc") cmp = -cmp;

        // Stable tie-break
        if (cmp === 0) {
          cmp = a.cardSortKey.localeCompare(b.cardSortKey);
          if (cmp === 0) {
            cmp = a.deal.id - b.deal.id;
          }
        }

        return cmp;
      });
    }

    return filtered;
  }, [viewModels, conditionFilter, marketFilter, priceConfFilter, headerSort]);

  const selectedHistorical = useMemo(() => {
    return (
      historicals.find((row) =>
        matchesConditionFilter(row.condition, conditionFilter),
      ) ?? historicals[0] ?? null
    );
  }, [historicals, conditionFilter]);

  const bestTrustedDeal = useMemo(() => {
    return filteredListings
      .filter(
        (vm) =>
          (vm.deal.overrideType === "ALLOW" ||
            vm.integrityStatus !== "REVIEW") &&
          isDealTrusted(
            vm.deal.sellerFeedbackCount,
            vm.deal.sellerPositivePercent,
          ),
      )
      .sort((a, b) => {
        const discountA = a.discountPercent ?? Number.POSITIVE_INFINITY;
        const discountB = b.discountPercent ?? Number.POSITIVE_INFINITY;
        if (discountA !== discountB) {
          return discountA - discountB;
        }
        const priceA = a.totalUsd ?? Number.POSITIVE_INFINITY;
        const priceB = b.totalUsd ?? Number.POSITIVE_INFINITY;
        return priceA - priceB;
      })[0];
  }, [filteredListings]);

  const bestTrustedDealUrl = useMemo(() => {
    if (!bestTrustedDeal) {
      return null;
    }

    if (bestTrustedDeal.affiliateUrl) {
      return bestTrustedDeal.affiliateUrl;
    }

    const rawUrl =
      bestTrustedDeal.deal.url ??
      listings.find((row) => row.id === bestTrustedDeal.deal.id)?.url ??
      null;

    return rawUrl ? buildAffiliateUrl(rawUrl) : null;
  }, [bestTrustedDeal, listings]);

  const listingsLabel = `${filteredListings.length} listings / ${getSampleConfidenceLabel(
    selectedHistorical?.sampleSize ?? null,
  )} data`;
  const historyPointCount = priceHistory.length;
  const historyLabel = conditionLabel ?? "This condition";
  const historyCountText = `${historyPointCount} sale${
    historyPointCount === 1 ? "" : "s"
  } recorded`;

  const hasAnyListings = listings.length > 0;

  // No-deals intelligence: compute price range and frequency hint from existing data
  const noDealsIntelligence = useMemo(() => {
    // Only compute when filtered listings are empty
    if (filteredListings.length > 0) return null;

    // Price range from historicals (recent sold data)
    let priceRangeLow: number | null = null;
    let priceRangeHigh: number | null = null;
    const validPrices = historicals
      .map((h) => h.medianPriceCad)
      .filter((p): p is number => p != null && Number.isFinite(p) && p > 0);
    if (validPrices.length > 0) {
      priceRangeLow = Math.min(...validPrices);
      priceRangeHigh = Math.max(...validPrices);
    }

    // Frequency hint from price history (sold listings over time)
    let frequencyHint: string | null = null;
    if (priceHistory.length >= 2) {
      // Count total sales and date range
      const totalSales = priceHistory.reduce((sum, p) => sum + p.sample, 0);
      const dates = priceHistory.map((p) => new Date(p.date).getTime());
      const minDate = Math.min(...dates);
      const maxDate = Math.max(...dates);
      const daySpan = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));

      // Calculate average sales per week (approximate, rounded)
      const weeksSpan = Math.max(1, daySpan / 7);
      const salesPerWeek = totalSales / weeksSpan;

      if (salesPerWeek >= 5) {
        frequencyHint = "Typically appears daily";
      } else if (salesPerWeek >= 2) {
        frequencyHint = "Typically appears 2-3x per week";
      } else if (salesPerWeek >= 0.5) {
        frequencyHint = "Typically appears weekly";
      } else if (totalSales >= 2) {
        frequencyHint = "Appears occasionally";
      }
    } else if (priceHistory.length === 1) {
      frequencyHint = "Rarely listed";
    }

    // Only return if we have some intelligence to show
    if (priceRangeLow === null && frequencyHint === null) return null;

    return {
      priceRangeLow,
      priceRangeHigh,
      frequencyHint,
    };
  }, [filteredListings.length, historicals, priceHistory]);

  const bestDealFreshness = bestTrustedDeal
    ? formatFreshness(bestTrustedDeal.deal.updatedAt)
    : null;

  const bestTrustedPriceBreakdown = useMemo(() => {
    if (!bestTrustedDeal) return null;
    return {
      item: bestTrustedDeal.deal.priceCad ?? null,
      shipping: bestTrustedDeal.deal.shippingCad ?? null,
    };
  }, [bestTrustedDeal]);

  const handleHeaderSort = (key: HeaderSortKey) => {
    setHeaderSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      const defaultDir = key === "seller" ? "asc" : "desc";
      return { key, dir: defaultDir };
    });
  };

  const SortArrow = ({ colKey }: { colKey: HeaderSortKey }) => {
    const isActive = headerSort.key === colKey;
    return (
      <span className="ml-1 inline-block w-3 text-center">
        {isActive ? (
          <span>{headerSort.dir === "asc" ? "▲" : "▼"}</span>
        ) : (
          <span className="invisible">▼</span>
        )}
      </span>
    );
  };

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
              {(card.stockImageUrl ?? filteredListings[0]?.thumbnailUrl) ? (
                <Image
                  src={(card.stockImageUrl ?? filteredListings[0]?.thumbnailUrl) as string}
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
              {card.stockImageUrl && (
                <p className="text-xs text-slate-400">Stock image</p>
              )}
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
                  <WatchlistStarButton
                    cardId={card.id}
                    cardName={card.name}
                    setName={card.setName}
                  />
                </div>
              </div>
              <div className={`grid gap-4 ${bestTrustedDeal && bestTrustedDeal.totalUsd && bestTrustedDeal.deal.market ? "md:grid-cols-2" : ""}`}>
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
                {bestTrustedDeal && bestTrustedDeal.totalUsd && bestTrustedDeal.deal.market && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase text-slate-500">
                      Best trusted deal (USD)
                    </p>
                    <div className="mt-1 space-y-2">
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-semibold text-slate-900">
                          {formatUSD(bestTrustedDeal.totalUsd)}
                        </p>
                        {bestDealFreshness && (
                          <span className="text-xs text-slate-500">
                            · {bestDealFreshness}
                          </span>
                        )}
                      </div>
                      {bestTrustedPriceBreakdown && (
                        <p className="text-xs text-slate-500">
                          {bestTrustedPriceBreakdown.item != null
                            ? `Item ${formatUSD(bestTrustedPriceBreakdown.item)}`
                            : "Item price unavailable"}{" "}
                          {bestTrustedPriceBreakdown.shipping != null
                            ? `+ Shipping ${formatUSD(bestTrustedPriceBreakdown.shipping)}`
                            : "+ shipping at checkout"}
                        </p>
                      )}
                      <p
                        className={`text-sm ${discountClass(
                          bestTrustedDeal.discountPercent ?? null,
                        )}`}
                      >
                        {formatDiscount(bestTrustedDeal.discountPercent)}
                      </p>
                      {bestTrustedDealUrl && (
                        <a
                          href={bestTrustedDealUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
                        >
                          <span>View listing</span>
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            aria-hidden="true"
                            className="h-3.5 w-3.5 stroke-current"
                            strokeWidth="1.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11 4h5v5"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16 4l-5.75 5.75"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 6H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3"
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                    {bestTrustedDeal.deal.endsAt && (
                      <p
                        className="text-xs text-slate-500"
                        title={getEndsAtDisplay(bestTrustedDeal.deal.endsAt).tooltip}
                      >
                        {bestTrustedDeal.marketCode} /{" "}
                        {getEndsAtDisplay(bestTrustedDeal.deal.endsAt).label}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-slate-500">
                      {bestDealFreshness
                        ? `Updated ${bestDealFreshness} ago • Price may have changed on eBay`
                        : "Price may have changed on eBay"}
                    </p>
                  </div>
                )}
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

      {moreFromSet.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">More from this set</h2>
            <Link
              href={`/sets/${encodeURIComponent(card.setName)}#catalog-cards`}
              className="text-sm text-slate-600 transition hover:text-slate-900"
            >
              View set page →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {moreFromSet.map((relatedCard) => (
              <Link
                key={relatedCard.id}
                href={`/cards/${relatedCard.id}`}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:bg-slate-100"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {relatedCard.name}
                  </p>
                  {relatedCard.cardNumber && (
                    <p className="text-xs text-slate-500">#{relatedCard.cardNumber}</p>
                  )}
                </div>
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  className="h-4 w-4 flex-none stroke-slate-400"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 10h6m-3-3l3 3-3 3"
                  />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid w-full gap-3 text-sm text-slate-700 sm:grid-cols-3">
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
            <label
              className="flex flex-col gap-1"
              title="Indicates how reliable recent pricing data is based on sales volume and consistency"
            >
              <span className="text-xs font-semibold uppercase text-slate-500">
                Data reliability
              </span>
              <select
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                value={priceConfFilter}
                onChange={(event) =>
                  setPriceConfFilter(event.target.value as ConfidenceFilterKey)
                }
              >
                <option value="all">All</option>
                <option value="high">High</option>
                <option value="medium">Med</option>
                <option value="low">Low</option>
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
                <th 
                  className="whitespace-nowrap px-3 py-2 text-right cursor-pointer hover:bg-slate-100 select-none"
                  onClick={() => handleHeaderSort("total")}
                  title="Click to sort by Total USD"
                >
                  <span className="inline-flex items-center justify-end">
                    <span>Total USD</span>
                    <SortArrow colKey="total" />
                  </span>
                </th>
                <th 
                  className="whitespace-nowrap px-3 py-2 text-right cursor-pointer hover:bg-slate-100 select-none"
                  onClick={() => handleHeaderSort("historic")}
                  title="Click to sort by Historic USD"
                >
                  <span className="inline-flex items-center justify-end">
                    <span>Historic USD</span>
                    <SortArrow colKey="historic" />
                  </span>
                </th>
                <th 
                  className="px-3 py-2 text-right cursor-pointer hover:bg-slate-100 select-none"
                  onClick={() => handleHeaderSort("discount")}
                  title="Click to sort by Discount"
                >
                  <span className="inline-flex items-center justify-end">
                    <span>Discount</span>
                    <SortArrow colKey="discount" />
                  </span>
                </th>
                <th
                  className="whitespace-nowrap px-3 py-2 text-center"
                  title="Indicates how reliable recent pricing data is based on sales volume and consistency"
                >
                  Data reliability
                </th>
                <th 
                  className="px-3 py-2 text-left cursor-pointer hover:bg-slate-100 select-none"
                  onClick={() => handleHeaderSort("seller")}
                  title="Click to sort by Seller"
                >
                  <span className="inline-flex items-center">
                    <span>Seller</span>
                    <SortArrow colKey="seller" />
                  </span>
                </th>
                <th className="px-3 py-2 text-left">Market</th>
                <th 
                  className="px-3 py-2 text-right cursor-pointer hover:bg-slate-100 select-none"
                  onClick={() => handleHeaderSort("ends")}
                  title="Click to sort by Ends"
                >
                  <span className="inline-flex items-center justify-end">
                    <span>Ends</span>
                    <SortArrow colKey="ends" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredListings.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center"
                  >
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {hasAnyListings
                            ? "No listings match your current filters."
                            : "No live deals right now"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {hasAnyListings
                            ? "Try adjusting condition or market selection."
                            : "Deals appear periodically for this card."}
                        </p>
                      </div>

                      {noDealsIntelligence && (
                        <p className="text-xs text-slate-600">
                          {noDealsIntelligence.priceRangeLow !== null && (
                            <span>
                              Recent sold range:{" "}
                              <span className="font-semibold text-slate-800">
                                {noDealsIntelligence.priceRangeLow ===
                                noDealsIntelligence.priceRangeHigh
                                  ? formatCurrency(noDealsIntelligence.priceRangeLow)
                                  : `${formatCurrency(noDealsIntelligence.priceRangeLow)} - ${formatCurrency(noDealsIntelligence.priceRangeHigh)}`}
                              </span>
                            </span>
                          )}
                          {noDealsIntelligence.frequencyHint && (
                            <span>
                              {noDealsIntelligence.priceRangeLow !== null ? " | " : ""}
                              Deal frequency:{" "}
                              <span className="font-semibold text-slate-800">
                                {noDealsIntelligence.frequencyHint}
                              </span>
                            </span>
                          )}
                        </p>
                      )}

                      <div className="flex items-center justify-center gap-2 pt-1">
                        <WatchlistStarButton
                          cardId={card.id}
                          cardName={card.name}
                          setName={card.setName}
                        />
                        <span className="text-sm text-slate-600">
                          Watch this card
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredListings.map((vm) => {
                  const listing = vm.deal;
                  const weightLabel = vm.priceConfidenceLabel;
                  const sellerSalesText = formatSellerSalesCount(
                    listing.sellerFeedbackCount ?? null,
                  );
                  return (
                    <tr key={listing.id} className="even:bg-slate-50/50 hover:bg-slate-100">
                      <td className="px-3 py-4 align-middle">
                        <div className="flex items-start gap-3">
                          {listing.thumbnailUrl ? (
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white">
                              <Image
                                src={listing.thumbnailUrl}
                                alt={listing.title ?? ""}
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
                            primaryHref={buildAffiliateUrl(listing.url ?? "")}
                            showListingTitle
                            showViewCardLink={false}
                          />
                          {vm.integrityStatus === "REVIEW" && (
                            <span
                              className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
                              title={
                                listing.integrityReason ??
                                "Flagged automatically for manual review"
                              }
                            >
                              Review
                            </span>
                          )}
                        </div>
                      </td>
                    <td className="px-3 py-4 align-middle text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-base font-semibold">
                          {formatUSD(vm.totalUsd)}
                        </span>
                        {formatFreshness(listing.updatedAt) && (
                          <span className="text-xs text-slate-500">
                            {formatFreshness(listing.updatedAt)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 align-middle text-right text-base text-slate-600">
                      {formatUSD(vm.historicUsd)}
                    </td>
                    <td
                      className={`px-3 py-4 align-middle text-right text-base font-semibold ${discountClass(
                        vm.discountPercent,
                      )}`}
                    >
                      {formatDiscount(vm.discountPercent)}
                    </td>
                    <td className="px-3 py-4 align-middle text-center">
                      <ConfidenceChip
                        weightLabel={weightLabel}
                        sampleSize={vm.sampleSize}
                        center={false}
                      />
                    </td>
                    <td className="px-3 py-4 align-middle text-sm text-slate-700 w-[160px] overflow-visible">
                      <div className="flex min-w-0 items-start gap-2">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-1">
                            <SellerNameWithTooltip
                              seller={getSellerDisplayData({
                                username: listing.sellerUsername,
                                storeName: listing.sellerStoreName,
                                feedbackCount: listing.sellerFeedbackCount,
                                feedbackPercent: listing.sellerPositivePercent,
                              })}
                              className="text-slate-700 truncate block"
                            />
                            {isDealTrusted(
                              listing.sellerFeedbackCount,
                              listing.sellerPositivePercent,
                            ) && <TrustedBadge className="flex-none" />}
                          </div>
                          {sellerSalesText ? (
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              <span aria-hidden="true">⭐</span>{" "}
                              <span>{sellerSalesText} sales</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 align-middle text-sm text-slate-600">
                      {(() => {
                        const normalized = normalizeMarketCode(listing.market);
                        const marketCode =
                          normalized === "all" ? DEFAULT_MARKET : normalized;
                        return (
                          <span
                            title={getMarketLabel(marketCode)}
                            className="flex items-center gap-1"
                          >
                            <MarketFlag market={marketCode} />
                            <span className="text-xs text-slate-500">
                              {getMarketEmoji(marketCode)}
                            </span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-4 align-middle text-right text-slate-600">
                      <span title={getEndsAtDisplay(listing.endsAt).tooltip}>
                        {getEndsAtDisplay(listing.endsAt).label}
                      </span>
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
