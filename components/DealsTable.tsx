"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminDealActions } from "./AdminDealActions";
import { TrustedBadge } from "./TrustedBadge";
import { CardIdentityBlock, buildCardIdentityFromDeal } from "./CardIdentity";
import type { Deal } from "../types/deal";
import type { DealsApiMeta, DealsApiResponse } from "@/types/dealsApi";
import {
  CONDITION_FILTERS,
  type ConditionFilterKey,
  MARKET_FILTERS,
  type MarketFilterKey,
  matchesConditionFilter,
  matchesMarket,
  DEFAULT_MARKET_FILTER,
} from "../lib/filters";
import {
  discountClass,
  formatCurrency,
  formatDiscount,
  formatEndsAt,
  formatScore,
  getConfidenceLabel,
  scoreClass,
} from "../lib/dealFormatting";
import { getDealDiscount, getDealPrice } from "../lib/dealMath";
import {
  computeDealScore,
  getDealConfidence,
  isDealTrusted,
  type DealConfidence,
} from "../lib/dealScore";
import {
  applyConfidenceToScore,
  getConfidenceLabel as getWeightLabel,
  getConfidenceBadgeClass,
  getConfidenceDisplayText,
  CONFIDENCE_TOOLTIP,
} from "../lib/dealConfidence";
import { FX_RATE_COPY } from "../lib/money";
import {
  DEFAULT_MARKET,
  getMarketLabel,
  getMarketCompactLabel,
  normalizeMarketCode,
} from "../lib/markets";
import { compareStrictBestDiscountValues } from "../lib/dealSort";

const TOP_DEAL_DISCOUNT = 15;
const TOP_DEAL_SAMPLE_SIZE = 20;
const PAGE_SIZE = 50;

const SORT_LABEL: Record<SortOption, string> = {
  "best-discount": "Best discount",
  "best-score": "Best score",
  "price-low-high": "Price: low to high",
  "price-high-low": "Price: high to low",
  "historic-high-low": "Historic price",
  "card-name": "Card name",
  "time-left": "Ending soon",
  "confidence-first": "High confidence first",
};

type SortOption =
  | "best-discount"
  | "best-score"
  | "price-low-high"
  | "price-high-low"
  | "historic-high-low"
  | "card-name"
  | "time-left"
  | "confidence-first";

type DealViewModel = {
  deal: Deal;
  price: number | null;
  discount: number | null;
  score: number | null;
  trustedSeller: boolean;
  confidence: DealConfidence;
  confidenceWeight: number | null;
  confidenceLabel: "high" | "medium" | "low";
  cardSortKey: string;
  endsAtMs: number | null;
};

type DealsViewState = {
  sortBy: SortOption;
  conditionKey: ConditionFilterKey;
  marketKey: MarketFilterKey;
  topDealsOnly: boolean;
  minDiscountPercent: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  setFilter: string;
  page: number;
};

const defaultState: DealsViewState = {
  sortBy: "best-discount",
  conditionKey: "all",
  marketKey: DEFAULT_MARKET_FILTER,
  topDealsOnly: false,
  minDiscountPercent: null,
  minPrice: null,
  maxPrice: null,
  setFilter: "",
  page: 1,
};

type DealsTableVariant = "default" | "newest";

interface DealsTableProps {
  deals: Deal[];
  isAdmin?: boolean;
  adminSecret?: string;
  initialApiMeta?: DealsApiMeta | null;
  page?: number;
  totalPages?: number;
  variant?: DealsTableVariant;
}

export default function DealsTable({
  deals,
  isAdmin = false,
  adminSecret,
  initialApiMeta = null,
  variant = "default",
}: DealsTableProps) {
  const [viewState, setViewState] = useState<DealsViewState>({
    ...defaultState,
    marketKey: initialApiMeta?.market ?? defaultState.marketKey,
  });
  const serverMode = Boolean(initialApiMeta);
  const [remoteMeta, setRemoteMeta] = useState<DealsApiMeta | null>(
    initialApiMeta ?? null,
  );
  const [remoteDeals, setRemoteDeals] = useState<Deal[]>(deals);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const isNewestVariant = variant === "newest";
  const formatDiscountDisplay = (value: number | null | undefined) => {
    if (!isNewestVariant) {
      return formatDiscount(value);
    }
    if (value == null || Number.isNaN(value)) {
      return "Unscored";
    }
    if (value < 0) {
      return formatDiscount(value);
    }
    return `+${Math.abs(value).toFixed(1)}% markup`;
  };
  const isUnscoredDiscount = (value: number | null | undefined) =>
    isNewestVariant && (value == null || Number.isNaN(value));
  const formatMarketLabel = (market: string | null | undefined) =>
    getMarketLabel(normalizeMarketCode(market ?? DEFAULT_MARKET));
  const formatMarketCompact = (market: string | null | undefined) => {
    const code = normalizeMarketCode(market ?? DEFAULT_MARKET);
    return {
      display: getMarketCompactLabel(code),
      fullLabel: getMarketLabel(code),
    };
  };

  const updateState = (
    producer: (prev: DealsViewState) => DealsViewState,
    options?: { resetPage?: boolean },
  ) => {
    setViewState((prev) => {
      const next = producer(prev);
      if (options?.resetPage) {
        return { ...next, page: 1 };
      }
      return next;
    });
  };

  useEffect(() => {
    if (!serverMode) return;
    setRemoteDeals(deals);
  }, [serverMode, deals]);

  useEffect(() => {
    if (!serverMode) return;
    setRemoteMeta(initialApiMeta ?? null);
  }, [serverMode, initialApiMeta]);

  const fetchRemotePage = useCallback(
    async (
      targetPage: number,
      overrides?: { market?: MarketFilterKey },
    ) => {
      if (!serverMode || !remoteMeta) return;
      const params = new URLSearchParams({
        sort: remoteMeta.sort,
        page: String(Math.max(targetPage, 1)),
        pageSize: String(remoteMeta.pageSize),
        market: overrides?.market ?? viewState.marketKey,
      });
      setRemoteLoading(true);
      setRemoteError(null);
      try {
        const res = await fetch(`/api/deals?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }
        const payload: DealsApiResponse = await res.json();
        setRemoteDeals(payload.items);
        setRemoteMeta({
          sort: payload.sort,
          page: payload.page,
          pageSize: payload.pageSize,
          totalItems: payload.totalItems,
          totalPages: payload.totalPages,
          market: payload.market,
        });
      } catch (error) {
        setRemoteError(
          error instanceof Error ? error.message : "Unable to load listings",
        );
      } finally {
        setRemoteLoading(false);
      }
    },
    [serverMode, remoteMeta, viewState.marketKey],
  );

  useEffect(() => {
    if (!serverMode || !remoteMeta) return;
    if (viewState.marketKey === remoteMeta.market) return;
    void fetchRemotePage(1, { market: viewState.marketKey });
  }, [serverMode, remoteMeta, viewState.marketKey, fetchRemotePage]);

  const baseDeals = serverMode ? remoteDeals : deals;
  const referenceTime = useMemo(() => Date.now(), [baseDeals]);

  const viewModels = useMemo<DealViewModel[]>(() => {
    return baseDeals.map((deal) => {
      const price = getDealPrice(deal);
      const discount = getDealDiscount(deal);
      const trustedSeller = isDealTrusted(
        deal.sellerFeedbackCount ?? null,
        deal.sellerPositivePercent ?? null,
      );
      const confidence = getDealConfidence(deal.sampleSize ?? null);
      const score = computeDealScore(
        {
          discountPercent: discount,
          isTrustedSeller: trustedSeller,
          endsAt: deal.endsAt,
          confidence,
        },
        referenceTime,
      );
      const confidenceWeight = deal.confidenceWeight ?? null;
      const weightedScore = applyConfidenceToScore(score, confidenceWeight);
      const confidenceLabel = getWeightLabel(confidenceWeight);
      const endsAtMs = deal.endsAt ? Date.parse(deal.endsAt) : null;
      const cardSortKey = buildCardSortKey(deal);

      return {
        deal,
        price,
        discount,
        score: weightedScore,
        trustedSeller,
        confidence,
        confidenceWeight,
        confidenceLabel,
        cardSortKey,
        endsAtMs: Number.isNaN(endsAtMs) ? null : endsAtMs,
      };
    });
  }, [baseDeals, referenceTime]);

  const filteredDeals = useMemo(() => {
    const normalizedSet = viewState.setFilter.trim().toLowerCase();
    const minDiscountTarget = viewState.minDiscountPercent ?? null;
    const minPriceTarget = viewState.minPrice ?? null;
    const maxPriceTarget = viewState.maxPrice ?? null;

    return viewModels.filter((vm) => {
      const { deal, discount, price } = vm;

      if (
        !matchesConditionFilter(
          deal.condition ?? deal.card?.conditionBucket ?? null,
          viewState.conditionKey,
        )
      ) {
        return false;
      }

      if (!matchesMarket(deal.market, viewState.marketKey)) {
        return false;
      }

      if (
        normalizedSet &&
        normalizedSet !== "all" &&
        !(deal.card?.setName ?? deal.setName ?? "")
          .toLowerCase()
          .includes(normalizedSet)
      ) {
        return false;
      }

      if (viewState.topDealsOnly) {
        if (discount == null || discount > -TOP_DEAL_DISCOUNT) {
          return false;
        }
        if ((deal.sampleSize ?? 0) < TOP_DEAL_SAMPLE_SIZE) {
          return false;
        }
      }

      if (minDiscountTarget != null) {
        if (discount == null || discount > -minDiscountTarget) {
          return false;
        }
      }

      if (minPriceTarget != null && (price == null || price < minPriceTarget)) {
        return false;
      }

      if (maxPriceTarget != null && (price == null || price > maxPriceTarget)) {
        return false;
      }

      return true;
    });
  }, [viewModels, viewState]);

  const { sortedDeals, showNoDiscountNotice } = useMemo(() => {
    const list = [...filteredDeals];
    const sortKey = viewState.sortBy || "best-discount";
    if (isNewestVariant && sortKey === "best-discount") {
      const hasDiscounted = list.some(
        (vm) => vm.discount != null && vm.discount < 0,
      );
      if (hasDiscounted) {
        list.sort((a, b) =>
          compareStrictBestDiscountValues(a.discount, b.discount),
        );
        return { sortedDeals: list, showNoDiscountNotice: false };
      }
      return {
        sortedDeals: list,
        showNoDiscountNotice: list.length > 0,
      };
    }
    const comparator = comparators[sortKey] ?? comparators["best-discount"];
    list.sort(comparator);
    return { sortedDeals: list, showNoDiscountNotice: false };
  }, [filteredDeals, viewState.sortBy, isNewestVariant]);

  useEffect(() => {
    if (serverMode) return;
    setViewState((prev) => {
      const maxPage = Math.max(1, Math.ceil(sortedDeals.length / PAGE_SIZE));
      return prev.page > maxPage ? { ...prev, page: maxPage } : prev;
    });
  }, [serverMode, sortedDeals.length]);

  const totalPages = serverMode
    ? remoteMeta?.totalPages ?? 1
    : Math.max(1, Math.ceil(sortedDeals.length / PAGE_SIZE));
  const currentPage = serverMode ? remoteMeta?.page ?? 1 : viewState.page;
  const pageStart = (viewState.page - 1) * PAGE_SIZE;
  const currentSlice = serverMode
    ? sortedDeals
    : sortedDeals.slice(pageStart, pageStart + PAGE_SIZE);
  const hasDeals = currentSlice.length > 0;

  const handlePrev = () => {
    if (serverMode) {
      if (remoteMeta && remoteMeta.page > 1 && !remoteLoading) {
        void fetchRemotePage(remoteMeta.page - 1);
      }
      return;
    }
    setViewState((prev) =>
      prev.page > 1 ? { ...prev, page: prev.page - 1 } : prev,
    );
  };

  const handleNext = () => {
    if (serverMode) {
      if (
        remoteMeta &&
        !remoteLoading &&
        (remoteMeta.totalPages == null ||
          remoteMeta.page < remoteMeta.totalPages)
      ) {
        void fetchRemotePage(remoteMeta.page + 1);
      }
      return;
    }
    setViewState((prev) =>
      prev.page < totalPages ? { ...prev, page: prev.page + 1 } : prev,
    );
  };

  const inputClasses =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none";

  const colClass = (
    colKey:
      | "card"
      | "total"
      | "historic"
      | "discount"
      | "score"
      | "confidence"
      | "seller"
      | "market"
      | "ends",
    variant: DealsTableVariant = "default",
  ): string => {
    const isNewest = variant === "newest";
    switch (colKey) {
      case "card":
        return isNewest ? "w-[280px] min-w-[280px]" : "w-[320px] min-w-[320px]";
      case "total":
        return "w-[120px]";
      case "historic":
        return "w-[120px]";
      case "discount":
        return "";
      case "score":
        return "";
      case "confidence":
        return "";
      case "seller":
        return isNewest ? "w-[140px]" : "";
      case "market":
        return isNewest ? "w-[80px]" : "";
      case "ends":
        return "w-[96px]";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="mb-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Sort by
            </span>
            <select
              className={inputClasses}
              value={viewState.sortBy}
              onChange={(event) =>
                updateState(
                  (prev) => ({
                    ...prev,
                    sortBy: event.target.value as SortOption,
                  }),
                  { resetPage: true },
                )
              }
            >
              {Object.keys(SORT_LABEL).map((option) => (
                <option key={option} value={option}>
                  {SORT_LABEL[option as SortOption]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Condition
            </span>
            <select
              className={inputClasses}
              value={viewState.conditionKey}
              onChange={(event) =>
                updateState(
                  (prev) => ({
                    ...prev,
                    conditionKey: event.target.value as ConditionFilterKey,
                  }),
                  { resetPage: true },
                )
              }
            >
              {CONDITION_FILTERS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Market
            </span>
            <select
              className={inputClasses}
              value={viewState.marketKey}
              onChange={(event) =>
                updateState(
                  (prev) => ({
                    ...prev,
                    marketKey: event.target.value as MarketFilterKey,
                  }),
                  { resetPage: true },
                )
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

        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Min discount (% off)
            </span>
            <input
              type="number"
              inputMode="decimal"
              className={inputClasses}
              placeholder="15"
              value={viewState.minDiscountPercent ?? ""}
              onChange={(event) =>
                updateState(
                  (prev) => ({
                    ...prev,
                    minDiscountPercent: parseNumberInput(event.target.value),
                  }),
                  { resetPage: true },
                )
              }
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Price range
            </span>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                className={inputClasses}
                placeholder="Min"
                value={viewState.minPrice ?? ""}
                onChange={(event) =>
                  updateState(
                    (prev) => ({
                      ...prev,
                      minPrice: parseNumberInput(event.target.value),
                    }),
                    { resetPage: true },
                  )
                }
              />
              <input
                type="number"
                inputMode="decimal"
                className={inputClasses}
                placeholder="Max"
                value={viewState.maxPrice ?? ""}
                onChange={(event) =>
                  updateState(
                    (prev) => ({
                      ...prev,
                      maxPrice: parseNumberInput(event.target.value),
                    }),
                    { resetPage: true },
                  )
                }
              />
            </div>
          </label>

          <label className="flex flex-col justify-end gap-2 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Set filter
            </span>
            <input
              type="text"
              className={inputClasses}
              placeholder="e.g. Evolving Skies"
              value={viewState.setFilter}
              onChange={(event) =>
                updateState(
                  (prev) => ({ ...prev, setFilter: event.target.value }),
                  { resetPage: true },
                )
              }
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-slate-900"
            checked={viewState.topDealsOnly}
            onChange={(event) =>
              updateState(
                (prev) => ({ ...prev, topDealsOnly: event.target.checked }),
                { resetPage: true },
              )
            }
          />
          <span>Top deals only (>= 15% off & >= 20 sales)</span>
        </label>
      </div>

      <p className="text-xs uppercase tracking-wide text-slate-500">
        Prices shown in USD (converted from CAD). {FX_RATE_COPY}
      </p>

      {showNoDiscountNotice ? (
        <p className="text-xs text-slate-500">
          No discounted listings found in this feed.
        </p>
      ) : null}

      {hasDeals ? (
        <>
      <div className="hidden sm:block">
        <div className="w-full overflow-x-auto">
          <table className="min-w-full table-fixed text-sm text-slate-900">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className={`px-3 py-2 text-left ${colClass("card", variant)}`}>
                      Card
                    </th>
                    <th className={`${colClass("total", variant)} px-3 py-2 text-right`}>
                      Total (USD)
                    </th>
                    <th className={`${colClass("historic", variant)} px-3 py-2 text-right`}>
                      Historic (USD)
                    </th>
                    <th className={`${colClass("discount", variant)} px-3 py-2 text-right`}>Discount</th>
                    {!isNewestVariant && variant !== "default" ? (
                      <th className={`${colClass("score", variant)} px-3 py-2 text-right`}>Score</th>
                    ) : null}
                    <th className={`${colClass("confidence", variant)} px-3 py-2 text-left`}>Confidence</th>
                    <th className={`${colClass("seller", variant)} px-3 py-2 text-left`}>Seller</th>
                    <th className={`${colClass("market", variant)} px-3 py-2 text-left`}>Market</th>
                    <th className={`${colClass("ends", variant)} px-3 py-2 text-left`}>Ends</th>
                    {isAdmin && adminSecret ? (
                      <th className="px-3 py-2 text-left">Admin</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentSlice.map((vm) => (
                    <tr key={vm.deal.id} className="even:bg-slate-50/50 hover:bg-slate-100">
                      <td className={`${colClass("card", variant)} px-3 py-4 align-middle`}>
                        <div className="flex items-start gap-2.5">
                          {vm.deal.thumbnailUrl ? (
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white">
                              <Image
                                src={vm.deal.thumbnailUrl}
                                alt={vm.deal.title}
                                width={64}
                                height={64}
                                className="h-full w-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded border border-dashed border-slate-300 bg-white" />
                          )}
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <CardIdentityBlock
                              identity={buildCardIdentityFromDeal(vm.deal)}
                              primaryHref={vm.deal.url}
                              showListingTitle={isNewestVariant}
                              showViewCardLink
                            />
                            {vm.deal.historicBaselineConfidence === "none" ? (
                              <p className="text-xs text-amber-600">
                                {baselineBadgeLabel(
                                  vm.deal.historicBaselineBucketUsed,
                                )}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className={`${colClass("total", variant)} px-3 py-4 align-middle text-right text-base font-semibold`}>
                        {formatCurrency(vm.price)}
                      </td>
                      <td className={`${colClass("historic", variant)} px-3 py-4 align-middle text-right text-base text-slate-600`}>
                        {formatCurrency(vm.deal.historicPriceCad)}
                      </td>
                      <td
                        className={`${colClass("discount", variant)} ${discountClass(
                          vm.discount,
                        )} whitespace-nowrap px-3 py-4 align-middle text-right text-base ${
                          isUnscoredDiscount(vm.discount)
                            ? "font-normal italic text-slate-400"
                            : "font-semibold"
                        }`}
                      >
                        {formatDiscountDisplay(vm.discount)}
                      </td>
                      {!isNewestVariant && variant !== "default" ? (
                        <td className={`${colClass("score", variant)} px-3 py-4 align-middle text-right text-base`}>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`${scoreClass(vm.score)} font-semibold`}>
                              {formatScore(vm.score)}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getConfidenceBadgeClass(
                                vm.confidenceLabel,
                              )}`}
                              title={CONFIDENCE_TOOLTIP}
                            >
                              {getConfidenceDisplayText(vm.confidenceLabel)}
                            </span>
                          </div>
                        </td>
                      ) : null}
                      <td className={`${colClass("confidence", variant)} px-3 py-4 align-middle text-left`}>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getConfidenceBadgeClass(
                            vm.confidenceLabel,
                          )}`}
                          title={`${CONFIDENCE_TOOLTIP} ${getConfidenceLabel(vm.deal.sampleSize ?? null)}`}
                        >
                          {getConfidenceDisplayText(vm.confidenceLabel)}
                        </span>
                      </td>
                      <td className={`${colClass("seller", variant)} px-3 py-4 align-middle text-left text-sm text-slate-700`}>
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`truncate ${
                              isNewestVariant ? "max-w-[100px]" : ""
                            }`}
                            title={vm.deal.sellerUsername ?? "Unknown"}
                          >
                            {vm.deal.sellerUsername ?? "Unknown"}
                          </span>
                          {vm.trustedSeller ? (
                            <TrustedBadge className="flex-none" />
                          ) : null}
                        </div>
                      </td>
                      <td className={`${colClass("market", variant)} px-3 py-4 align-middle text-left text-sm text-slate-600${
                        isNewestVariant ? " whitespace-normal break-words" : ""
                      }`}>
                        <span title={formatMarketCompact(vm.deal.market).fullLabel}>
                          {formatMarketCompact(vm.deal.market).display}
                        </span>
                      </td>
                      <td className={`${colClass("ends", variant)} whitespace-normal px-3 py-4 align-middle text-left text-sm text-slate-600`}>
                        {formatEndsAt(vm.deal.endsAt)}
                      </td>
                      {isAdmin && adminSecret ? (
                        <td className="px-3 py-4 align-middle text-sm">
                          <AdminDealActions deal={vm.deal} />
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 sm:hidden">
            {currentSlice.map((vm) => (
              <div
                key={vm.deal.id}
                className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex gap-3">
                  {vm.deal.thumbnailUrl ? (
                    <Image
                      src={vm.deal.thumbnailUrl}
                      alt={vm.deal.title}
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded border border-dashed border-slate-300" />
                  )}
                  <CardIdentityBlock
                    identity={buildCardIdentityFromDeal(vm.deal)}
                    primaryHref={vm.deal.url}
                    showListingTitle={isNewestVariant}
                    showViewCardLink={false}
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-base">
                  <div>
                    <p className="text-slate-500">Total (USD)</p>
                    <p className="text-base font-semibold text-slate-900">
                      {formatCurrency(vm.price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Historic (USD)</p>
                    <p className="text-base">{formatCurrency(vm.deal.historicPriceCad)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Discount</p>
                    <p
                      className={`${discountClass(vm.discount)} text-base ${
                        isUnscoredDiscount(vm.discount) ? "text-slate-500" : ""
                      }`}
                    >
                      {formatDiscountDisplay(vm.discount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Score</p>
                    <div className="flex flex-col gap-1">
                      <p className={`${scoreClass(vm.score)} text-base`}>
                        {formatScore(vm.score)}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getConfidenceBadgeClass(
                          vm.confidenceLabel,
                        )}`}
                        title={CONFIDENCE_TOOLTIP}
                      >
                        {getConfidenceDisplayText(vm.confidenceLabel)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>
                    Confidence: {getConfidenceLabel(vm.deal.sampleSize ?? null)}
                  </span>
                  <span>Seller: {vm.deal.sellerUsername ?? "Unknown"}</span>
                  <span title={formatMarketCompact(vm.deal.market).fullLabel}>
                    Market: {formatMarketCompact(vm.deal.market).display}
                  </span>
                  {vm.trustedSeller ? (
                    <span className="inline-flex items-center gap-1">
                      <TrustedBadge />
                      Trusted
                    </span>
                  ) : null}
                  <span>Ends {formatEndsAt(vm.deal.endsAt)}</span>
                </div>

                {isAdmin && adminSecret ? (
                  <div className="mt-3">
                    <AdminDealActions deal={vm.deal} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="py-10 text-center">
          <p className="text-sm text-slate-600">
            No deals match your current filters.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Try adjusting condition, discount, or price range.
          </p>
        </div>
      )}

      {serverMode && remoteError ? (
        <p className="text-center text-sm text-rose-600">{remoteError}</p>
      ) : null}
      <div className="flex items-center justify-center gap-4 pt-2 text-sm text-slate-700">
        <button
          type="button"
          className="rounded border border-slate-300 px-3 py-1 disabled:cursor-not-allowed disabled:text-slate-400"
          onClick={handlePrev}
          disabled={
            serverMode
              ? !remoteMeta || remoteMeta.page <= 1 || remoteLoading
              : currentPage <= 1
          }
        >
          Previous
        </button>
        <span className="inline-flex items-center gap-2">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          {serverMode && remoteLoading ? (
            <span className="text-xs text-slate-500">Loading…</span>
          ) : null}
        </span>
        <button
          type="button"
          className="rounded border border-slate-300 px-3 py-1 disabled:cursor-not-allowed disabled:text-slate-400"
          onClick={handleNext}
          disabled={
            serverMode
              ? !remoteMeta ||
                remoteLoading ||
                (remoteMeta.totalPages != null &&
                  remoteMeta.page >= remoteMeta.totalPages)
              : currentPage >= totalPages
          }
        >
          Next
        </button>
      </div>
    </div>
  );
}

function parseNumberInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildCardSortKey(deal: Deal): string {
  const setName = (deal.card?.setName ?? deal.setName ?? "").toLowerCase();
  const number = (deal.card?.cardNumber ?? "").toLowerCase();
  const name = (deal.card?.name ?? deal.cardName ?? deal.title ?? "").toLowerCase();
  return `${setName}||${number}||${name}`;
}

function baselineBadgeLabel(bucket: string | null | undefined): string {
  if (bucket) {
    const friendly = bucket
      .split("_")
      .filter(Boolean)
      .map((part) => part.toUpperCase())
      .join(" ");
    return friendly ? `No ${friendly} history` : "No baseline yet";
  }
  return "No baseline yet";
}

const comparators: Record<
  SortOption,
  (a: DealViewModel, b: DealViewModel) => number
> = {
  "best-discount": (a, b) => {
    const left = a.discount ?? Infinity;
    const right = b.discount ?? Infinity;
    const diff = left - right;
    if (diff !== 0) return diff;
    const leftWeight = a.confidenceWeight ?? 0;
    const rightWeight = b.confidenceWeight ?? 0;
    if (rightWeight !== leftWeight) {
      return rightWeight - leftWeight;
    }
    return (b.score ?? -Infinity) - (a.score ?? -Infinity);
  },
  "best-score": (a, b) => {
    const left = a.score ?? -Infinity;
    const right = b.score ?? -Infinity;
    return right - left;
  },
  "price-low-high": (a, b) => {
    const left = a.price ?? Infinity;
    const right = b.price ?? Infinity;
    return left - right;
  },
  "price-high-low": (a, b) => {
    const left = a.price ?? -Infinity;
    const right = b.price ?? -Infinity;
    return right - left;
  },
  "historic-high-low": (a, b) => {
    const left = a.deal.historicPriceCad ?? -Infinity;
    const right = b.deal.historicPriceCad ?? -Infinity;
    return right - left;
  },
  "card-name": (a, b) => a.cardSortKey.localeCompare(b.cardSortKey),
  "time-left": (a, b) => {
    const left = a.endsAtMs ?? Infinity;
    const right = b.endsAtMs ?? Infinity;
    return left - right;
  },
  "confidence-first": (a, b) => {
    const left = a.confidenceWeight ?? 0;
    const right = b.confidenceWeight ?? 0;
    if (right !== left) {
      return right - left;
    }
    return (b.score ?? -Infinity) - (a.score ?? -Infinity);
  },
};
