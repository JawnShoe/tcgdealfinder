"use client";

/**
 * TABLE QA CHECKLIST
 * 
 * Column visibility by variant/page:
 * 
 * Homepage (variant="default"):
 *   - Card (320px) | Total USD | Historic USD | Discount | Seller | Market (flag + US/CA) | Ends
 *   - NO Score column (hidden, but used internally for sorting)
 *   - NO Confidence column (removed to reduce width and improve scanability)
 * 
 * /newest page (variant="newest"):
 *   - Card (280px) | Total USD | Historic USD | Discount | Confidence (centered) | Seller (140px) | Market (flag + US/CA, 80px) | Ends
 *   - NO Score column (hidden on newest)
 * 
 * /cards page (no variant prop, uses default):
 *   - Card | Total USD | Historic USD | Discount | Score | Confidence (left-aligned) | Seller | Market (flag + US/CA) | Ends
 * 
 * Other pages (/top-deals, /ending-soon):
 *   - Use custom table implementations with flag + US/CA market display
 * 
 * Design rules:
 *   - All tables use SVG flag icons + short code (🇺🇸 US or 🇨🇦 CA)
 *   - Long seller names truncate with tooltip (truncate class + title attribute)
 *   - TrustedBadge uses flex-none to stay aligned
 *   - Headers use whitespace-nowrap on "Total USD" and "Historic USD"
 *   - No horizontal scroll on standard desktop (1280px+) for homepage and /newest
 */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminDealActions } from "./AdminDealActions";
import { TrustedBadge } from "./TrustedBadge";
import { CardIdentityBlock, buildCardIdentityFromDeal } from "./CardIdentity";
import { ConfidenceChip } from "./ConfidenceChip";
import { MarketFlag } from "./MarketFlag";
import { SellerNameWithTooltip, formatSellerSalesCount } from "./SellerNameWithTooltip";
import { getSellerDisplayData } from "@/lib/sellerDisplay";
import { WatchlistStarButton } from "./WatchlistStarButton";
import { WhyDealHint } from "./WhyDealHint";
import { SellerSeenBadge } from "./SellerSeenBadge";
import { TooltipPopover } from "./TooltipPopover";
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
import { persistMarketPreference } from "../lib/marketPreferenceClient";
import {
  discountClass,
  formatCurrency,
  formatUSD,
  formatDiscount,
  getEndsAtDisplay,
  formatScore,
  formatMarket,
  getConfidenceLabel,
  scoreClass,
  formatFreshness,
} from "../lib/dealFormatting";
import type { DealConfidence } from "../lib/dealScore";
import {
  getConfidenceBadgeClass,
  getConfidenceDisplayText,
  CONFIDENCE_TOOLTIP,
} from "../lib/dealConfidence";
import { buildDealViewModel, type DealViewModel } from "../lib/dealViewModel";

import { DEFAULT_MARKET, getMarketLabel, normalizeMarketCode } from "../lib/markets";
import { compareStrictBestDiscountValues } from "../lib/dealSort";
import {
  getColumnsByVariant,
  type ColumnSpec,
  type ColumnKey,
} from "../lib/tableColumns";

const TOP_DEAL_DISCOUNT = 15;
const TOP_DEAL_SAMPLE_SIZE = 20;
const PAGE_SIZE = 50;
const MARKET_PRIORITY: string[] = ["US", "CA", "GB", "AU"];

function getMarketRank(market: string | null | undefined): number {
  const normalized = normalizeMarketCode(market ?? null);
  const effective =
    normalized === "all"
      ? normalizeMarketCode(DEFAULT_MARKET)
      : normalized;
  const idx = MARKET_PRIORITY.indexOf(effective);
  return idx === -1 ? MARKET_PRIORITY.length : idx;
}

function dedupeDealsByListing(deals: Deal[]): Deal[] {
  const map = new Map<string, Deal>();
  for (const deal of deals) {
    const key = (deal.listingId ?? String(deal.id)).toString();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, deal);
      continue;
    }
    const existingRank = getMarketRank(existing.market);
    const nextRank = getMarketRank(deal.market);
    if (nextRank < existingRank) {
      map.set(key, deal);
      continue;
    }
    if (nextRank === existingRank) {
      const existingTotal = existing.totalPriceCad ?? Number.POSITIVE_INFINITY;
      const nextTotal = deal.totalPriceCad ?? Number.POSITIVE_INFINITY;
      if (nextTotal < existingTotal) {
        map.set(key, deal);
      }
    }
  }
  return Array.from(map.values());
}

function renderEndsValue(value: string | null | undefined): JSX.Element {
  const display = getEndsAtDisplay(value);
  return (
    <TooltipPopover content={display.tooltip}>
      {display.label}
    </TooltipPopover>
  );
}

function renderSellerSalesBadge(
  salesCount: number | null | undefined,
): JSX.Element | null {
  const formatted = formatSellerSalesCount(salesCount);
  if (!formatted) {
    return null;
  }
  return (
    <span className="flex items-center gap-1 whitespace-nowrap text-[11px] text-slate-500">
      <span aria-hidden="true">⭐</span>
      <span>{formatted} sales</span>
    </span>
  );
}

function getSeenMarketLabel(value: string | null | undefined): string {
  if (!value) return "All markets";
  const normalized = normalizeMarketCode(value);
  if (normalized === "all") return "All markets";
  return getMarketLabel(normalized);
}

function renderSellerSeenBadge(
  count: number | null | undefined,
  windowDays: number | null | undefined,
  marketValue: string | null | undefined,
): JSX.Element | null {
  return (
    <SellerSeenBadge
      count={count}
      windowDays={windowDays}
      marketLabel={getSeenMarketLabel(marketValue)}
    />
  );
}

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

// Note: DealViewModel is now imported from lib/dealViewModel.ts
// This ensures consistent field names and derivation logic across all tables

type ConfidenceFilterKey = "all" | "high" | "medium" | "low";

type HeaderSortKey = "total" | "historic" | "discount" | "ends" | "card";

type HeaderSort = {
  key: HeaderSortKey | null;
  dir: "asc" | "desc";
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
  priceConfFilter: ConfidenceFilterKey;
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
  priceConfFilter: "all",
};

type DealsTableVariant = "default" | "newest";

interface DealsTableProps {
  deals: Deal[];
  isAdmin?: boolean;
  initialApiMeta?: DealsApiMeta | null;
  page?: number;
  totalPages?: number;
  variant?: DealsTableVariant;
}

export default function DealsTable({
  deals,
  isAdmin = false,
  initialApiMeta = null,
  variant = "default",
}: DealsTableProps) {
  const [viewState, setViewState] = useState<DealsViewState>({
    ...defaultState,
    marketKey: initialApiMeta?.market ?? defaultState.marketKey,
  });
  const [headerSort, setHeaderSort] = useState<HeaderSort>({
    key: null,
    dir: "desc",
  });
  const serverMode = Boolean(initialApiMeta);
  const [remoteMeta, setRemoteMeta] = useState<DealsApiMeta | null>(
    initialApiMeta ?? null,
  );
  const [remoteDeals, setRemoteDeals] = useState<Deal[]>(deals);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const isNewestVariant = variant === "newest";

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

  const handleMarketChange = (next: MarketFilterKey) => {
    updateState(
      (prev) => ({
        ...prev,
        marketKey: next,
      }),
      { resetPage: true },
    );
    void persistMarketPreference(next);
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
  const referenceKey = useMemo(
    () =>
      baseDeals
        .map((deal) => deal.listingId ?? String(deal.id))
        .join("|"),
    [baseDeals],
  );
  const dedupedDeals = useMemo(
    () => dedupeDealsByListing(baseDeals),
    [baseDeals],
  );
  const referenceTime = useMemo(
    () => ({
      stamp: Date.now(),
      key: referenceKey,
    }),
    [referenceKey],
  ).stamp;

  // Use buildDealViewModel() as the single source of truth for derived values
  // This ensures consistency with tableColumns.tsx and other table variants
  const viewModels = useMemo<DealViewModel[]>(() => {
    return dedupedDeals.map((deal) =>
      buildDealViewModel(deal, {
        computeScore: true,
        referenceTime,
      })
    );
  }, [dedupedDeals, referenceTime]);

  const filteredDeals = useMemo(() => {
    const normalizedSet = viewState.setFilter.trim().toLowerCase();
    const minDiscountTarget = viewState.minDiscountPercent ?? null;
    const minPriceTarget = viewState.minPrice ?? null;
    const maxPriceTarget = viewState.maxPrice ?? null;

    return viewModels.filter((vm) => {
      const { deal, discountPercent: discount, totalUsd: price } = vm;

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

      // Price confidence filter
      if (viewState.priceConfFilter !== "all") {
        const confLabel = vm.priceConfidenceLabel ?? "low";
        if (confLabel !== viewState.priceConfFilter) {
          return false;
        }
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
    
    // Header sort overrides dropdown sort
    if (headerSort.key) {
      const key = headerSort.key;
      const dir = headerSort.dir;
      list.sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;
        
        // Get values based on sort key
        switch (key) {
          case "total":
            aVal = a.totalUsd ?? Infinity;
            bVal = b.totalUsd ?? Infinity;
            break;
          case "historic":
            aVal = a.historicUsd ?? Infinity;
            bVal = b.historicUsd ?? Infinity;
            break;
          case "discount":
            aVal = a.discountPercent ?? Infinity;
            bVal = b.discountPercent ?? Infinity;
            break;
          case "ends":
            aVal = a.endsAtMs ?? Infinity;
            bVal = b.endsAtMs ?? Infinity;
            break;
          case "card":
            aVal = a.cardSortKey;
            bVal = b.cardSortKey;
            break;
          default:
            aVal = 0;
            bVal = 0;
        }
        
        // Compare
        let cmp = 0;
        if (typeof aVal === "number" && typeof bVal === "number") {
          cmp = aVal - bVal;
        } else {
          cmp = String(aVal).localeCompare(String(bVal));
        }
        
        // Apply direction
        if (dir === "desc") cmp = -cmp;
        
        // Stable sort: tie-break by cardSortKey then listing ID
        if (cmp === 0) {
          cmp = a.cardSortKey.localeCompare(b.cardSortKey);
          if (cmp === 0) {
            cmp = a.deal.id - b.deal.id;
          }
        }
        
        return cmp;
      });
      return { sortedDeals: list, showNoDiscountNotice: false };
    }
    
    // Use dropdown sort
    const sortKey = viewState.sortBy || "best-discount";
    if (isNewestVariant && sortKey === "best-discount") {
      const hasDiscounted = list.some(
        (vm) => vm.discountPercent != null && vm.discountPercent < 0,
      );
      if (hasDiscounted) {
        list.sort((a, b) =>
          compareStrictBestDiscountValues(a.discountPercent, b.discountPercent),
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
  }, [filteredDeals, viewState.sortBy, isNewestVariant, headerSort]);

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

  // Build column spec lookup from tableColumns.tsx
  // This ensures header labels and base formatting come from the single source of truth
  const columnSpecs = useMemo(() => {
    const specs = getColumnsByVariant(variant);
    const map = new Map<ColumnKey, ColumnSpec>();
    for (const spec of specs) {
      map.set(spec.key, spec);
    }
    return map;
  }, [variant]);

  // Helper to get header label from spec, with fallback
  const getHeaderLabel = (key: ColumnKey, fallback: string): string => {
    return columnSpecs.get(key)?.headerLabel ?? fallback;
  };

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

  // Handler for clicking sortable headers
  const handleHeaderSort = (key: HeaderSortKey) => {
    setHeaderSort((prev) => {
      if (prev.key === key) {
        // Toggle direction
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      // First click: descending for numeric columns (best values first)
      // For discount: most negative (best deals) first
      // For ends: soonest first
      const defaultDir = key === "card" ? "asc" : "desc";
      return { key, dir: defaultDir };
    });
  };

  // Helper to render sort arrow
  const SortArrow = ({ colKey }: { colKey: HeaderSortKey }) => {
    if (headerSort.key !== colKey) {
      return null; // No arrow when not active
    }
    return (
      <span className="ml-1 inline-block">
        {headerSort.dir === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="mb-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Sort by
            </span>
            <select
              className={inputClasses}
              value={viewState.sortBy}
              onChange={(event) => {
                updateState(
                  (prev) => ({
                    ...prev,
                    sortBy: event.target.value as SortOption,
                  }),
                  { resetPage: true },
                );
                // Clear header sort when using dropdown
                setHeaderSort({ key: null, dir: "desc" });
              }}
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
            <TooltipPopover
              content="Indicates how reliable recent pricing data is based on sales volume and consistency"
              triggerClassName="text-xs font-semibold uppercase text-slate-500"
            >
              Data reliability
            </TooltipPopover>
            <select
              className={inputClasses}
              value={viewState.priceConfFilter}
              onChange={(event) =>
                updateState(
                  (prev) => ({
                    ...prev,
                    priceConfFilter: event.target.value as ConfidenceFilterKey,
                  }),
                  { resetPage: true },
                )
              }
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Med</option>
              <option value="low">Low</option>
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
                handleMarketChange(
                  event.target.value as MarketFilterKey,
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
          <span>Top deals only (&gt;= 15% off &amp; &gt;= 20 sales)</span>
        </label>
      </div>

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
                      {getHeaderLabel("card", "Card")}
                    </th>
                    <th 
                      className={`${colClass("total", variant)} whitespace-nowrap px-3 py-2 text-right cursor-pointer hover:bg-slate-100 select-none`}
                      onClick={() => handleHeaderSort("total")}
                    >
                      <TooltipPopover
                        content="Click to sort by Total USD"
                        triggerClassName="inline-flex items-center gap-0"
                      >
                        <>
                          <span>{getHeaderLabel("total", "Total USD")}</span>
                          <SortArrow colKey="total" />
                        </>
                      </TooltipPopover>
                    </th>
                    <th 
                      className={`${colClass("historic", variant)} whitespace-nowrap px-3 py-2 text-right cursor-pointer hover:bg-slate-100 select-none`}
                      onClick={() => handleHeaderSort("historic")}
                    >
                      <TooltipPopover
                        content="Click to sort by Historic USD"
                        triggerClassName="inline-flex items-center gap-0"
                      >
                        <>
                          <span>{getHeaderLabel("historic", "Historic USD")}</span>
                          <SortArrow colKey="historic" />
                        </>
                      </TooltipPopover>
                    </th>
                    <th 
                      className={`${colClass("discount", variant)} px-3 py-2 text-right cursor-pointer hover:bg-slate-100 select-none`}
                      onClick={() => handleHeaderSort("discount")}
                    >
                      <TooltipPopover
                        content="Click to sort by Discount"
                        triggerClassName="inline-flex items-center gap-0"
                      >
                        <>
                          <span>{getHeaderLabel("discount", "Discount")}</span>
                          <SortArrow colKey="discount" />
                        </>
                      </TooltipPopover>
                    </th>
                    {!isNewestVariant && variant !== "default" ? (
                      <th className={`${colClass("score", variant)} px-3 py-2 text-right`}>Score</th>
                    ) : null}
                    {variant !== "default" ? (
                      <th
                        className={`${colClass("confidence", variant)} whitespace-nowrap px-3 py-2 ${isNewestVariant ? "text-center" : "text-left"}`}
                      >
                        <TooltipPopover
                          content="Indicates how reliable recent pricing data is based on sales volume and consistency"
                          triggerClassName="inline-flex items-center"
                        >
                          {getHeaderLabel("priceConf", "Data reliability")}
                        </TooltipPopover>
                      </th>
                    ) : null}
                    <th className={`${colClass("seller", variant)} px-3 py-2 text-left`}>
                      {getHeaderLabel("seller", "Seller")}
                    </th>
                    <th className={`${colClass("market", variant)} px-3 py-2 text-left`}>
                      {getHeaderLabel("market", "Market")}
                    </th>
                    <th 
                      className={`${colClass("ends", variant)} px-3 py-2 text-left cursor-pointer hover:bg-slate-100 select-none`}
                      onClick={() => handleHeaderSort("ends")}
                    >
                      <TooltipPopover
                        content="Click to sort by Ends"
                        triggerClassName="inline-flex items-center gap-0"
                      >
                        <>
                          <span>{getHeaderLabel("ends", "Ends")}</span>
                          <SortArrow colKey="ends" />
                        </>
                      </TooltipPopover>
                    </th>
                    {isAdmin ? (
                      <th className="px-3 py-2 text-left">Admin</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serverMode && remoteLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={`loading-${idx}`} className="animate-pulse">
                        <td className="px-3 py-4" colSpan={100}>
                          <div className="flex items-center gap-2.5">
                            <div className="h-16 w-16 rounded bg-slate-200" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-3/4 rounded bg-slate-200" />
                              <div className="h-3 w-1/2 rounded bg-slate-200" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    currentSlice.map((vm) => {
                      const cardId = vm.deal.card?.id ?? vm.deal.cardId ?? null;
                      const cardName =
                        vm.deal.card?.name ??
                        vm.deal.cardName ??
                        vm.deal.title ??
                        null;
                      const setName =
                        vm.deal.card?.setName ?? vm.deal.setName ?? null;
                      const sellerSalesBadge = renderSellerSalesBadge(
                        vm.deal.sellerFeedbackCount,
                      );
                      const sellerSeenBadge = renderSellerSeenBadge(
                        vm.deal.sellerSeenDealCount,
                        vm.deal.sellerSeenWindowDays,
                        vm.deal.sellerSeenMarket ?? viewState.marketKey,
                      );
                      return (
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
                            <div className="flex min-w-0 flex-1 items-start gap-2">
                              <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <CardIdentityBlock
                                  identity={buildCardIdentityFromDeal(vm.deal)}
                                  primaryHref={vm.affiliateUrl}
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
                              <WatchlistStarButton
                                cardId={cardId ?? undefined}
                                cardName={cardName ?? undefined}
                                setName={setName ?? null}
                                className="flex-shrink-0"
                              />
                            </div>
                          </div>
                        </td>
                      <td className={`${colClass("total", variant)} px-3 py-4 align-middle text-right`}>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-base font-semibold">
                            {formatUSD(vm.totalUsd)}
                          </span>
                          {vm.whyDeal ? (
                            <WhyDealHint
                              label={vm.whyDeal.label}
                              tooltip={vm.whyDeal.tooltip}
                              className="text-xs text-slate-500"
                            />
                          ) : null}
                          {formatFreshness(vm.deal.updatedAt) && (
                            <span className="text-xs text-slate-500">
                              {formatFreshness(vm.deal.updatedAt)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`${colClass("historic", variant)} px-3 py-4 align-middle text-right text-base text-slate-600`}>
                        {formatUSD(vm.historicUsd)}
                      </td>
                      <td
                        className={`${colClass("discount", variant)} ${discountClass(
                          vm.discountPercent,
                        )} whitespace-nowrap px-3 py-4 align-middle text-right text-base font-semibold`}
                      >
                        {formatDiscount(vm.discountPercent)}
                      </td>
                      {!isNewestVariant && variant !== "default" ? (
                        <td className={`${colClass("score", variant)} px-3 py-4 align-middle text-right text-base`}>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`${scoreClass(vm.score)} font-semibold`}>
                              {formatScore(vm.score)}
                            </span>
                            <TooltipPopover
                              content={CONFIDENCE_TOOLTIP}
                              triggerClassName={`rounded-full px-2 py-0.5 text-xs font-semibold ${getConfidenceBadgeClass(
                                vm.priceConfidenceLabel,
                              )}`}
                            >
                              {getConfidenceDisplayText(vm.priceConfidenceLabel)}
                            </TooltipPopover>
                          </div>
                        </td>
                      ) : null}
                      {variant !== "default" ? (
                        <td className={`${colClass("confidence", variant)} px-3 py-4 align-middle`}>
                          <ConfidenceChip
                            weightLabel={vm.priceConfidenceLabel}
                            sampleSize={vm.sampleSize}
                            center={isNewestVariant}
                          />
                        </td>
                      ) : null}
                      <td className={`${colClass("seller", variant)} px-3 py-4 align-middle text-left text-sm text-slate-700`}>
                        <div className="flex min-w-0 items-start gap-2">
                          <div className="min-w-0">
                            <span
                              className={`flex min-w-0 items-center gap-1 ${
                                isNewestVariant ? "max-w-[100px]" : ""
                              }`}
                            >
                              <SellerNameWithTooltip
                                seller={getSellerDisplayData({
                                  username: vm.deal.sellerUsername,
                                  storeName: vm.deal.sellerStoreName,
                                  feedbackCount: vm.deal.sellerFeedbackCount,
                                  feedbackPercent: vm.deal.sellerPositivePercent,
                                })}
                                className="truncate text-slate-600"
                              />
                              {vm.trustedSeller ? (
                                <TrustedBadge className="flex-none" />
                              ) : null}
                            </span>
                            {sellerSalesBadge || sellerSeenBadge ? (
                              <div className="mt-0.5 space-y-0.5">
                                {sellerSalesBadge}
                                {sellerSeenBadge}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className={`${colClass("market", variant)} px-3 py-4 align-middle text-left text-sm text-slate-600${
                        isNewestVariant ? " whitespace-normal break-words" : ""
                      }`}>
                        <TooltipPopover
                          content={formatMarket(vm.deal.market).label}
                          triggerClassName="inline-flex items-center gap-1"
                        >
                          <MarketFlag market={vm.deal.market ?? DEFAULT_MARKET} />
                          <span>{formatMarket(vm.deal.market).compactLabel}</span>
                        </TooltipPopover>
                      </td>
                      <td className={`${colClass("ends", variant)} whitespace-normal px-3 py-4 align-middle text-left text-sm text-slate-600`}>
                      {renderEndsValue(vm.deal.endsAt)}
                      </td>
                      {isAdmin ? (
                        <td className="px-3 py-4 align-middle text-sm">
                          <AdminDealActions
                            listingId={
                              vm.deal.listingId
                                ? Number(vm.deal.listingId)
                                : vm.deal.id
                            }
                            sellerUsername={vm.deal.sellerUsername}
                            isAdmin={isAdmin}
                          />
                        </td>
                      ) : null}
                    </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 sm:hidden">
            {currentSlice.map((vm) => {
              const cardId = vm.deal.card?.id ?? vm.deal.cardId ?? null;
              const cardName =
                vm.deal.card?.name ??
                vm.deal.cardName ??
                vm.deal.title ??
                null;
              const setName = vm.deal.card?.setName ?? vm.deal.setName ?? null;
              const sellerSalesBadge = renderSellerSalesBadge(
                vm.deal.sellerFeedbackCount,
              );
              const sellerSeenBadge = renderSellerSeenBadge(
                vm.deal.sellerSeenDealCount,
                vm.deal.sellerSeenWindowDays,
                vm.deal.sellerSeenMarket ?? viewState.marketKey,
              );
              return (
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
                    <div className="flex flex-1 items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <CardIdentityBlock
                          identity={buildCardIdentityFromDeal(vm.deal)}
                          primaryHref={vm.affiliateUrl}
                          showListingTitle={isNewestVariant}
                          showViewCardLink={false}
                        />
                      </div>
                      <WatchlistStarButton
                        cardId={cardId ?? undefined}
                        cardName={cardName ?? undefined}
                        setName={setName ?? null}
                      />
                    </div>
                  </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-base">
                  <div>
                    <p className="text-slate-500">{getHeaderLabel("total", "Total USD")}</p>
                    <p className="text-base font-semibold text-slate-900">
                      {formatUSD(vm.totalUsd)}
                    </p>
                    {vm.whyDeal ? (
                      <WhyDealHint
                        label={vm.whyDeal.label}
                        tooltip={vm.whyDeal.tooltip}
                        className="text-xs text-slate-500"
                      />
                    ) : null}
                    {formatFreshness(vm.deal.updatedAt) && (
                      <p className="text-xs text-slate-500">
                        {formatFreshness(vm.deal.updatedAt)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-slate-500">{getHeaderLabel("historic", "Historic USD")}</p>
                    <p className="text-base">{formatUSD(vm.historicUsd)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{getHeaderLabel("discount", "Discount")}</p>
                    <p className={`${discountClass(vm.discountPercent)} text-base`}>
                      {formatDiscount(vm.discountPercent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Score</p>
                    <div className="flex flex-col gap-1">
                      <p className={`${scoreClass(vm.score)} text-base`}>
                        {formatScore(vm.score)}
                      </p>
                      <TooltipPopover
                        content={CONFIDENCE_TOOLTIP}
                        triggerClassName={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getConfidenceBadgeClass(
                          vm.priceConfidenceLabel,
                        )}`}
                      >
                        {getConfidenceDisplayText(vm.priceConfidenceLabel)}
                      </TooltipPopover>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>
                    Confidence: {getConfidenceLabel(vm.sampleSize)}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1">
                      <span className="text-slate-500">Seller:</span>
                      <SellerNameWithTooltip
                        seller={getSellerDisplayData({
                          username: vm.deal.sellerUsername,
                          storeName: vm.deal.sellerStoreName,
                          feedbackCount: vm.deal.sellerFeedbackCount,
                          feedbackPercent: vm.deal.sellerPositivePercent,
                        })}
                        className="text-slate-600"
                      />
                      {vm.trustedSeller ? <TrustedBadge className="flex-none" /> : null}
                    </span>
                    {sellerSalesBadge || sellerSeenBadge ? (
                      <div className="space-y-0.5">
                        {sellerSalesBadge}
                        {sellerSeenBadge}
                      </div>
                    ) : null}
                  </div>
                  <TooltipPopover content={formatMarket(vm.deal.market).label}>
                    Market: {formatMarket(vm.deal.market).compactLabel}
                  </TooltipPopover>
                  {vm.trustedSeller ? (
                    <span className="inline-flex items-center gap-1">
                      <TrustedBadge />
                      Trusted
                    </span>
                  ) : null}
                  {(() => {
                    const endsDisplay = getEndsAtDisplay(vm.deal.endsAt);
                    return (
                      <TooltipPopover content={endsDisplay.tooltip}>
                        Ends {endsDisplay.label}
                      </TooltipPopover>
                    );
                  })()}
                </div>

                {isAdmin ? (
                  <div className="mt-3">
                    <AdminDealActions
                      listingId={
                        vm.deal.listingId
                          ? Number(vm.deal.listingId)
                          : vm.deal.id
                      }
                      sellerUsername={vm.deal.sellerUsername}
                      isAdmin={isAdmin}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
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
    const left = a.discountPercent ?? Infinity;
    const right = b.discountPercent ?? Infinity;
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
    const left = a.totalUsd ?? Infinity;
    const right = b.totalUsd ?? Infinity;
    return left - right;
  },
  "price-high-low": (a, b) => {
    const left = a.totalUsd ?? -Infinity;
    const right = b.totalUsd ?? -Infinity;
    return right - left;
  },
  "historic-high-low": (a, b) => {
    const left = a.historicUsd ?? -Infinity;
    const right = b.historicUsd ?? -Infinity;
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
