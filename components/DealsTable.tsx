"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminDealActions } from "./AdminDealActions";
import { TrustedBadge } from "./TrustedBadge";
import type { Deal } from "../types/deal";
import type { DealsApiMeta, DealsApiResponse } from "@/types/dealsApi";
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
};

type SortOption =
  | "best-discount"
  | "best-score"
  | "price-low-high"
  | "price-high-low"
  | "historic-high-low"
  | "card-name"
  | "time-left";

type DealViewModel = {
  deal: Deal;
  price: number | null;
  discount: number | null;
  score: number | null;
  trustedSeller: boolean;
  confidence: DealConfidence;
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
  marketKey: "all",
  topDealsOnly: false,
  minDiscountPercent: null,
  minPrice: null,
  maxPrice: null,
  setFilter: "",
  page: 1,
};

interface DealsTableProps {
  deals: Deal[];
  isAdmin?: boolean;
  adminSecret?: string;
  initialApiMeta?: DealsApiMeta | null;
  page?: number;
  totalPages?: number;
}

export default function DealsTable({
  deals,
  isAdmin = false,
  adminSecret,
  initialApiMeta = null,
}: DealsTableProps) {
  const [viewState, setViewState] = useState<DealsViewState>(defaultState);
  const serverMode = Boolean(initialApiMeta);
  const [remoteMeta, setRemoteMeta] = useState<DealsApiMeta | null>(
    initialApiMeta ?? null,
  );
  const [remoteDeals, setRemoteDeals] = useState<Deal[]>(deals);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);

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
    async (targetPage: number) => {
      if (!serverMode || !remoteMeta) return;
      const params = new URLSearchParams({
        sort: remoteMeta.sort,
        page: String(Math.max(targetPage, 1)),
        pageSize: String(remoteMeta.pageSize),
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
        });
      } catch (error) {
        setRemoteError(
          error instanceof Error ? error.message : "Unable to load listings",
        );
      } finally {
        setRemoteLoading(false);
      }
    },
    [serverMode, remoteMeta],
  );

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
      const endsAtMs = deal.endsAt ? Date.parse(deal.endsAt) : null;
      const cardSortKey = buildCardSortKey(deal);

      return {
        deal,
        price,
        discount,
        score,
        trustedSeller,
        confidence,
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

  const sortedDeals = useMemo(() => {
    const list = [...filteredDeals];
    const sortKey = viewState.sortBy || "best-discount";
    const comparator = comparators[sortKey] ?? comparators["best-discount"];
    list.sort(comparator);
    return list;
  }, [filteredDeals, viewState.sortBy]);

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

      {hasDeals ? (
        <>
          <div className="hidden sm:block">
            <div className="w-full overflow-x-auto">
              <table className="min-w-full table-fixed text-sm text-slate-900">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Card</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Historic</th>
                    <th className="px-3 py-2 text-right">Discount</th>
                    <th className="px-3 py-2 text-right">Score</th>
                    <th className="px-3 py-2 text-left">Confidence</th>
                    <th className="px-3 py-2 text-left">Seller</th>
                    <th className="px-3 py-2 text-left">Market</th>
                    <th className="px-3 py-2 text-left">Ends</th>
                    {isAdmin && adminSecret ? (
                      <th className="px-3 py-2 text-left">Admin</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentSlice.map((vm) => (
                    <tr key={vm.deal.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 align-middle">
                        <div className="flex items-center gap-3">
                          {vm.deal.thumbnailUrl ? (
                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white">
                              <Image
                                src={vm.deal.thumbnailUrl}
                                alt={vm.deal.title}
                                width={56}
                                height={56}
                                className="h-full w-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded border border-dashed border-slate-300 bg-white" />
                          )}
                          <div className="flex h-14 flex-col justify-center space-y-0.5 leading-snug">
                            <Link
                              href={vm.deal.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="line-clamp-1 font-semibold text-slate-900 hover:text-slate-700"
                            >
                              {vm.deal.title}
                            </Link>
                            <p className="line-clamp-1 text-xs text-slate-500">
                              {(vm.deal.card?.setName ?? vm.deal.setName ?? "") ||
                                "Unknown set"}
                            </p>
                            {vm.deal.historicBaselineConfidence === "none" ? (
                              <p className="text-xs text-amber-600">
                                {baselineBadgeLabel(vm.deal.historicBaselineBucketUsed)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 align-middle text-right font-semibold">
                        {formatCurrency(vm.price)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 align-middle text-right text-slate-600">
                        {formatCurrency(vm.deal.historicPriceCad)}
                      </td>
                      <td
                        className={`${discountClass(
                          vm.discount,
                        )} whitespace-nowrap px-3 py-3 align-middle text-right font-semibold`}
                      >
                        {formatDiscount(vm.discount)}
                      </td>
                      <td
                        className={`${scoreClass(
                          vm.score,
                        )} whitespace-nowrap px-3 py-3 align-middle text-right font-semibold`}
                      >
                        {formatScore(vm.score)}
                      </td>
                      <td className="px-3 py-3 align-middle text-left text-sm text-slate-600">
                        {getConfidenceLabel(vm.deal.sampleSize ?? null)}
                      </td>
                      <td className="px-3 py-3 align-middle text-left text-sm text-slate-700">
                        <span className="inline-flex items-center gap-1">
                          {vm.deal.sellerUsername ?? "Unknown"}
                          {vm.trustedSeller ? <TrustedBadge /> : null}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle text-left text-sm text-slate-600">
                        {vm.deal.market}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 align-middle text-left text-sm text-slate-600">
                        {formatEndsAt(vm.deal.endsAt)}
                      </td>
                      {isAdmin && adminSecret ? (
                        <td className="px-3 py-3 align-middle text-sm">
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
                      width={72}
                      height={72}
                      className="h-18 w-18 rounded object-cover"
                    />
                  ) : (
                    <div className="h-18 w-18 rounded border border-dashed border-slate-300" />
                  )}
                  <div className="flex-1 space-y-1">
                    <Link
                      href={vm.deal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-1 font-semibold text-slate-900 hover:text-slate-700"
                    >
                      {vm.deal.title}
                    </Link>
                    <p className="line-clamp-1 text-xs text-slate-500">
                      {(vm.deal.card?.setName ?? vm.deal.setName ?? "") ||
                        "Unknown set"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Total</p>
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(vm.price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Historic</p>
                    <p>{formatCurrency(vm.deal.historicPriceCad)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Discount</p>
                    <p className={discountClass(vm.discount)}>
                      {formatDiscount(vm.discount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Score</p>
                    <p className={scoreClass(vm.score)}>
                      {formatScore(vm.score)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>
                    Confidence: {getConfidenceLabel(vm.deal.sampleSize ?? null)}
                  </span>
                  <span>Seller: {vm.deal.sellerUsername ?? "Unknown"}</span>
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
        <p className="text-sm text-slate-600">
          No deals match your filters. Try adjusting the criteria.
        </p>
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
    return left - right;
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
};
