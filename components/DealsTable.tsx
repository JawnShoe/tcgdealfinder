\"use client\";

import Image from \"next/image\";
import Link from \"next/link\";
import { useEffect, useMemo, useState } from \"react\";
import { usePathname, useSearchParams } from \"next/navigation\";

import { AdminDealActions } from \"./AdminDealActions\";
import { TrustedBadge } from \"./TrustedBadge\";
import type { Deal } from \"../types/deal\";

import {
  CONDITION_FILTERS,
  type ConditionFilterKey,
  MARKET_FILTERS,
  type MarketFilterKey,
  matchesConditionFilter,
  matchesMarket,
} from \"../lib/filters\";

import {
  discountClass,
  formatCurrency,
  formatDiscount,
  formatEndsAt,
  formatScore,
  getConfidenceLabel,
  scoreClass,
} from \"../lib/dealFormatting\";

import { getDealPrice, getDealDiscount } from \"../lib/dealMath\";

import {
  computeDealScore,
  getDealConfidence,
  isDealTrusted,
  type DealConfidence,
} from \"../lib/dealScore\";

import {
  DEFAULT_DEALS_VIEW_STATE,
  parseDealsViewStateFromSearchParams,
  serializeDealsViewStateToSearchParams,
  type DealsViewState,
} from \"../lib/dealsState\";

import {
  loadDealsViewState,
  saveDealsViewState,
} from \"../lib/dealsStateStorage\";

const TOP_DEAL_DISCOUNT = 15;
const TOP_DEAL_SAMPLE_SIZE = 20;

const SORT_LABEL: Record<SortOption, string> = {
  \"best-discount\": \"Best discount\",
  \"best-score\": \"Best score\",
  \"price-low-high\": \"Price: low to high\",
  \"price-high-low\": \"Price: high to low\",
  \"historic-high-low\": \"Historic price\",
  \"card-name\": \"Card name\",
  \"time-left\": \"Ending soon\",
};

type SortOption =
  | \"best-discount\"
  | \"best-score\"
  | \"price-low-high\"
  | \"price-high-low\"
  | \"historic-high-low\"
  | \"card-name\"
  | \"time-left\";

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

type UrlOverrideFlags = {
  sortBy: boolean;
  topDealsOnly: boolean;
  conditionKey: boolean;
  setFilter: boolean;
  marketKey: boolean;
  minDiscountPercent: boolean;
  minPrice: boolean;
  maxPrice: boolean;
  page: boolean;
};

interface DealsTableProps {
  deals: Deal[];
  page: number;
  totalPages: number;
  isAdmin?: boolean;
  adminSecret?: string;
}

export function DealsTable({
  deals,
  page,
  totalPages,
  isAdmin = false,
  adminSecret,
}: DealsTableProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const urlState = useMemo(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? \"\");
    return parseDealsViewStateFromSearchParams(
      params,
      DEFAULT_DEALS_VIEW_STATE,
    );
  }, [searchParams]);

  const urlOverrides = useMemo<UrlOverrideFlags>(() => {
    const params = searchParams ?? new URLSearchParams();
    return {
      sortBy: params.has(\"sort\"),
      topDealsOnly: params.get(\"top\") === \"1\",
      conditionKey: params.has(\"cond\"),
      setFilter: params.has(\"set\"),
      marketKey: params.has(\"mkt\"),
      minDiscountPercent: params.has(\"min_disc\"),
      minPrice: params.has(\"min_price\"),
      maxPrice: params.has(\"max_price\"),
      page: params.has(\"page\"),
    };
  }, [searchParams]);

  const [viewState, setViewState] = useState<DealsViewState>(urlState);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setViewState(urlState);
  }, [urlState]);

  useEffect(() => {
    const saved = loadDealsViewState();
    if (!saved) return;
    setViewState((prev) => mergeStateFromStorage(prev, saved, urlOverrides));
  }, [urlOverrides]);

  useEffect(() => {
    setViewState((prev) => (prev.page === page ? prev : { ...prev, page }));
  }, [page]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    saveDealsViewState(viewState);
    if (typeof window === \"undefined\") {
      return;
    }
    const params = serializeDealsViewStateToSearchParams(viewState);
    if (isAdmin && adminSecret) {
      params.set(\"secret\", adminSecret);
    }
    const basePath = pathname ?? window.location.pathname ?? \"/\";
    const query = params.toString();
    const nextUrl = query ? ${basePath}? : basePath;
    window.history.replaceState(null, \"\", nextUrl);
  }, [viewState, pathname, isMounted, isAdmin, adminSecret]);

  const updateState = (
    producer: (prev: DealsViewState) => DealsViewState,
    options?: { resetPage?: boolean },
  ) => {
    setViewState((prev) => {
      const next = producer(prev);
      if (options?.resetPage && next.page !== 1) {
        return { ...next, page: 1 };
      }
      return next;
    });
  };

  const referenceTime = useMemo(() => Date.now(), [deals]);

  const viewModels = useMemo<DealViewModel[]>(() => {
    return deals.map((deal) => {
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
  }, [deals, referenceTime]);

  const filteredDeals = useMemo(() => {
    const normalizedSet = viewState.setFilter?.toLowerCase?.() ?? \"\";
    const minDiscountTarget = viewState.minDiscountPercent ?? null;
    const minPriceTarget = viewState.minPrice ?? null;
    const maxPriceTarget = viewState.maxPrice ?? null;

    return viewModels.filter((vm) => {
      const { deal, discount, price } = vm;

      if (
        !matchesConditionFilter(
          deal.condition ?? deal.card?.conditionBucket ?? null,
          viewState.conditionKey as ConditionFilterKey,
        )
      ) {
        return false;
      }

      if (!matchesMarket(deal.market, viewState.marketKey as MarketFilterKey)) {
        return false;
      }

      if (
        normalizedSet &&
        normalizedSet !== \"all\" &&
        !(deal.card?.setName ?? deal.setName ?? \"\").toLowerCase().includes(normalizedSet)
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

      if (minPriceTarget != null) {
        if (price == null || price < minPriceTarget) {
          return false;
        }
      }

      if (maxPriceTarget != null) {
        if (price == null || price > maxPriceTarget) {
          return false;
        }
      }

      return true;
    });
  }, [viewModels, viewState]);

  const sortedDeals = useMemo(() => {
    const list = [...filteredDeals];
    const sortKey = (viewState.sortBy as SortOption) || \"best-discount\";
    const comparator = comparators[sortKey] ?? comparators[\"best-discount\"];
    list.sort(comparator);
    return list;
  }, [filteredDeals, viewState.sortBy]);

  const handleSortChange = (value: SortOption) => {
    updateState((prev) => ({ ...prev, sortBy: value }), {
      resetPage: true,
    });
  };

  const handleConditionChange = (key: ConditionFilterKey) => {
    updateState((prev) => ({ ...prev, conditionKey: key }), { resetPage: true });
  };

  const handleMarketChange = (key: MarketFilterKey) => {
    updateState((prev) => ({ ...prev, marketKey: key }), { resetPage: true });
  };

  const handleMinDiscountChange = (value: string) => {
    updateState((prev) => ({ ...prev, minDiscountPercent: parseNumberInput(value) }), {
      resetPage: true,
    });
  };

  const handleMinPriceChange = (value: string) => {
    updateState((prev) => ({ ...prev, minPrice: parseNumberInput(value) }), {
      resetPage: true,
    });
  };

  const handleMaxPriceChange = (value: string) => {
    updateState((prev) => ({ ...prev, maxPrice: parseNumberInput(value) }), {
      resetPage: true,
    });
  };

  const handleSetFilterChange = (value: string) => {
    updateState((prev) => ({ ...prev, setFilter: value }), { resetPage: true });
  };

  const handleTopDealsToggle = (checked: boolean) => {
    updateState((prev) => ({ ...prev, topDealsOnly: checked }), {
      resetPage: true,
    });
  };

  const currentPage = viewState.page || 1;
  const hasDeals = sortedDeals.length > 0;
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  return (
    <section className=\"panel space-y-4\">
      <div className=\"deals-controls space-y-4\">
        <div className=\"flex flex-wrap gap-3 md:gap-4\">
          <label className=\"deal-control min-w-[180px]\">
            <span className=\"deal-control__label\">Sort by</span>
            <select
              className=\"deal-control__select\"
              value={viewState.sortBy}
              onChange={(event) =>
                handleSortChange(event.target.value as SortOption)
              }
            >
              {Object.keys(SORT_LABEL).map((option) => (
                <option key={option} value={option}>
                  {SORT_LABEL[option as SortOption]}
                </option>
              ))}
            </select>
          </label>

          <label className=\"deal-control min-w-[160px]\">
            <span className=\"deal-control__label\">Condition</span>
            <select
              className=\"deal-control__select\"
              value={viewState.conditionKey}
              onChange={(event) =>
                handleConditionChange(event.target.value as ConditionFilterKey)
              }
            >
              {CONDITION_FILTERS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className=\"deal-control min-w-[160px]\">
            <span className=\"deal-control__label\">Market</span>
            <select
              className=\"deal-control__select\"
              value={viewState.marketKey}
              onChange={(event) =>
                handleMarketChange(event.target.value as MarketFilterKey)
              }
            >
              {MARKET_FILTERS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className=\"deal-control min-w-[150px]\">
            <span className=\"deal-control__label\">Min discount (% off)</span>
            <input
              type=\"number\"
              inputMode=\"decimal\"
              className=\"deal-control__input\"
              placeholder=\"15\"
              value={viewState.minDiscountPercent ?? \"\"}
              onChange={(event) => handleMinDiscountChange(event.target.value)}
            />
          </label>

          <label className=\"deal-control min-w-[140px]\">
            <span className=\"deal-control__label\">Min price</span>
            <input
              type=\"number\"
              inputMode=\"decimal\"
              className=\"deal-control__input\"
              placeholder=\"0\"
              value={viewState.minPrice ?? \"\"}
              onChange={(event) => handleMinPriceChange(event.target.value)}
            />
          </label>

          <label className=\"deal-control min-w-[140px]\">
            <span className=\"deal-control__label\">Max price</span>
            <input
              type=\"number\"
              inputMode=\"decimal\"
              className=\"deal-control__input\"
              placeholder=\"1000\"
              value={viewState.maxPrice ?? \"\"}
              onChange={(event) => handleMaxPriceChange(event.target.value)}
            />
          </label>
        </div>

        <div className=\"flex flex-wrap items-end gap-3 md:gap-4\">
          <label className=\"deal-control flex-1 min-w-[220px]\">
            <span className=\"deal-control__label\">Filter by set name</span>
            <input
              type=\"text\"
              className=\"deal-control__input\"
              placeholder=\"Evolving Skies\"
              value={viewState.setFilter ?? \"\"}
              onChange={(event) => handleSetFilterChange(event.target.value)}
            />
          </label>

          <label className=\"flex items-center gap-2 text-sm text-slate-600\">
            <input
              type=\"checkbox\"
              className=\"h-4 w-4 rounded border-slate-300\"
              checked={viewState.topDealsOnly}
              onChange={(event) => handleTopDealsToggle(event.target.checked)}
            />
            <span>Top deals only (= 15% off, = 20 sales)</span>
          </label>
        </div>
      </div>

      {hasDeals ? (
        <>
          <div className=\"hidden sm:block\">
            <table className=\"deals-table w-full text-sm\">
              <thead>
                <tr>
                  <th className=\"px-3 py-2 text-left\">Card</th>
                  <th className=\"px-3 py-2 text-right\">Total</th>
                  <th className=\"px-3 py-2 text-right\">Historic</th>
                  <th className=\"px-3 py-2 text-right\">Discount</th>
                  <th className=\"px-3 py-2 text-right\">Score</th>
                  <th className=\"px-3 py-2 text-left\">Confidence</th>
                  <th className=\"px-3 py-2 text-left\">Seller</th>
                  <th className=\"px-3 py-2 text-left\">Market</th>
                  <th className=\"px-3 py-2 text-left\">Ends</th>
                  {isAdmin ? <th className=\"px-3 py-2 text-left\">Admin</th> : null}
                </tr>
              </thead>
              <tbody>
                {sortedDeals.map((vm) => (
                  <tr key={vm.deal.id}>
                    <td className=\"px-3 py-2 align-top\">
                      <div className=\"flex items-center gap-3\">
                        {vm.deal.thumbnailUrl ? (
                          <Image
                            src={vm.deal.thumbnailUrl}
                            alt={vm.deal.title}
                            width={56}
                            height={56}
                            className=\"h-14 w-14 rounded object-cover\"
                          />
                        ) : (
                          <div className=\"h-14 w-14 rounded bg-slate-200\" />
                        )}
                        <div className=\"space-y-1\">
                          <Link
                            href={vm.deal.url}
                            target=\"_blank\"
                            rel=\"noopener noreferrer\"
                            className=\"font-semibold text-slate-900 hover:underline\"
                          >
                            {vm.deal.title}
                          </Link>
                          <p className=\"text-xs text-slate-500\">
                            {(vm.deal.card?.setName ?? vm.deal.setName ?? \"\") || \"Unknown set\"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className=\"whitespace-nowrap px-3 py-2 text-right font-medium text-slate-900\">
                      {formatCurrency(vm.price)}
                    </td>
                    <td className=\"whitespace-nowrap px-3 py-2 text-right text-slate-700\">
                      {formatCurrency(vm.deal.historicPriceCad)}
                    </td>
                    <td className={\whitespace-nowrap px-3 py-2 text-right font-semibold \\}>
                      {formatDiscount(vm.discount)}
                    </td>
                    <td className={\whitespace-nowrap px-3 py-2 text-right font-semibold \\}>
                      {formatScore(vm.score)}
                    </td>
                    <td className=\"px-3 py-2 text-left text-sm text-slate-600\">
                      {getConfidenceLabel(vm.deal.sampleSize ?? null)}
                    </td>
                    <td className=\"px-3 py-2 text-left text-sm text-slate-700\">
                      <span className=\"inline-flex items-center gap-1\">
                        {vm.deal.sellerUsername ?? \"Unknown\"}
                        {vm.trustedSeller ? <TrustedBadge /> : null}
                      </span>
                    </td>
                    <td className=\"px-3 py-2 text-left text-sm text-slate-600\">
                      {vm.deal.market}
                    </td>
                    <td className=\"whitespace-nowrap px-3 py-2 text-left text-sm text-slate-600\">
                      {formatEndsAt(vm.deal.endsAt)}
                    </td>
                    {isAdmin ? (
                      <td className=\"px-3 py-2 text-sm\">
                        <AdminDealActions deal={vm.deal} />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className=\"space-y-3 sm:hidden\">
            {sortedDeals.map((vm) => (
              <div key={vm.deal.id} className=\"rounded border border-slate-200 bg-white p-3 shadow-sm\">
                <div className=\"flex gap-3\">
                  {vm.deal.thumbnailUrl ? (
                    <Image
                      src={vm.deal.thumbnailUrl}
                      alt={vm.deal.title}
                      width={72}
                      height={72}
                      className=\"h-18 w-18 rounded object-cover\"
                    />
                  ) : (
                    <div className=\"h-18 w-18 rounded bg-slate-200\" />
                  )}
                  <div className=\"flex-1 space-y-1\">
                    <Link
                      href={vm.deal.url}
                      target=\"_blank\"
                      rel=\"noopener noreferrer\"
                      className=\"font-semibold text-slate-900 hover:underline\"
                    >
                      {vm.deal.title}
                    </Link>
                    <p className=\"text-xs text-slate-500\">
                      {(vm.deal.card?.setName ?? vm.deal.setName ?? \"\") || \"Unknown set\"}
                    </p>
                  </div>
                </div>

                <div className=\"mt-3 grid grid-cols-2 gap-3 text-sm\">
                  <div>
                    <p className=\"text-slate-500\">Total</p>
                    <p className=\"font-medium text-slate-900\">{formatCurrency(vm.price)}</p>
                  </div>
                  <div>
                    <p className=\"text-slate-500\">Historic</p>
                    <p>{formatCurrency(vm.deal.historicPriceCad)}</p>
                  </div>
                  <div>
                    <p className=\"text-slate-500\">Discount</p>
                    <p className={discountClass(vm.discount)}>
                      {formatDiscount(vm.discount)}
                    </p>
                  </div>
                  <div>
                    <p className=\"text-slate-500\">Score</p>
                    <p className={scoreClass(vm.score)}>{formatScore(vm.score)}</p>
                  </div>
                </div>

                <div className=\"mt-3 flex flex-wrap gap-2 text-xs text-slate-500\">
                  <span>Confidence: {getConfidenceLabel(vm.deal.sampleSize ?? null)}</span>
                  <span>Seller: {vm.deal.sellerUsername ?? \"Unknown\"}</span>
                  {vm.trustedSeller ? (
                    <span className=\"inline-flex items-center gap-1\">
                      <TrustedBadge />
                      Trusted
                    </span>
                  ) : null}
                  <span>Ends {formatEndsAt(vm.deal.endsAt)}</span>
                </div>

                {isAdmin ? (
                  <div className=\"mt-3\">
                    <AdminDealActions deal={vm.deal} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className=\"text-sm text-slate-600\">
          No deals match your filters. Try adjusting the search criteria.
        </p>
      )}

      <div className=\"flex items-center justify-between pt-2 text-sm text-slate-700\">
        <span>
          Page {currentPage} of {Math.max(totalPages, 1)}
        </span>
        <div className=\"flex gap-2\">
          {prevDisabled ? (
            <span className=\"cursor-not-allowed text-slate-400\">Previous</span>
          ) : (
            <Link
              className=\"text-sky-600 hover:underline\"
              href={buildPageHref(pathname, viewState, currentPage - 1, isAdmin, adminSecret)}
            >
              Previous
            </Link>
          )}
          {nextDisabled ? (
            <span className=\"cursor-not-allowed text-slate-400\">Next</span>
          ) : (
            <Link
              className=\"text-sky-600 hover:underline\"
              href={buildPageHref(pathname, viewState, currentPage + 1, isAdmin, adminSecret)}
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function parseNumberInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildCardSortKey(deal: Deal): string {
  const setName = (deal.card?.setName ?? deal.setName ?? \"\").toLowerCase();
  const number = (deal.card?.cardNumber ?? \"\").toLowerCase();
  const name = (deal.card?.name ?? deal.cardName ?? deal.title ?? \"\").toLowerCase();
  return ${setName}||;
}

function mergeStateFromStorage(
  prev: DealsViewState,
  saved: Partial<DealsViewState>,
  overrides: UrlOverrideFlags,
): DealsViewState {
  const next = { ...prev };
  (Object.keys(saved) as (keyof DealsViewState)[]).forEach((key) => {
    if ((overrides as Record<string, boolean>)[key]) {
      return;
    }
    const value = saved[key];
    if (value !== undefined && value !== null) {
      (next as Record<string, unknown>)[key] = value;
    }
  });
  return next;
}

function buildPageHref(
  pathname: string | null,
  state: DealsViewState,
  page: number,
  isAdmin: boolean,
  adminSecret?: string,
): string {
  const params = serializeDealsViewStateToSearchParams({ ...state, page });
  if (isAdmin && adminSecret) {
    params.set(\"secret\", adminSecret);
  }
  const basePath = pathname ?? \"/\";
  const query = params.toString();
  return query ? ${basePath}? : basePath;
}

const comparators: Record<SortOption, (a: DealViewModel, b: DealViewModel) => number> = {
  \"best-discount\": (a, b) => {
    const left = a.discount ?? Infinity;
    const right = b.discount ?? Infinity;
    return left - right;
  },
  \"best-score\": (a, b) => {
    const left = a.score ?? -Infinity;
    const right = b.score ?? -Infinity;
    return right - left;
  },
  \"price-low-high\": (a, b) => {
    const left = a.price ?? Infinity;
    const right = b.price ?? Infinity;
    return left - right;
  },
  \"price-high-low\": (a, b) => {
    const left = a.price ?? -Infinity;
    const right = b.price ?? -Infinity;
    return right - left;
  },
  \"historic-high-low\": (a, b) => {
    const left = a.deal.historicPriceCad ?? -Infinity;
    const right = b.deal.historicPriceCad ?? -Infinity;
    return right - left;
  },
  \"card-name\": (a, b) => a.cardSortKey.localeCompare(b.cardSortKey),
  \"time-left\": (a, b) => {
    const left = a.endsAtMs ?? Infinity;
    const right = b.endsAtMs ?? Infinity;
    return left - right;
  },
};

export default DealsTable;
