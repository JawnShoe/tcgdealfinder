import type { MarketFilterKey } from "./filters";
import { DEFAULT_MARKET_FILTER } from "./filters";

export type DealsViewState = {
  sortBy: string;
  topDealsOnly: boolean;
  conditionKey: string;
  setFilter: string;
  marketKey: MarketFilterKey;
  minDiscountPercent: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  page: number;
  priceConfFilter: string;
};

export const DEFAULT_DEALS_VIEW_STATE: DealsViewState = {
  sortBy: "best-discount",
  topDealsOnly: false,
  conditionKey: "all",
  setFilter: "all",
  marketKey: DEFAULT_MARKET_FILTER,
  minDiscountPercent: null,
  minPrice: null,
  maxPrice: null,
  page: 1,
  priceConfFilter: "all",
};

const SORT_KEYS = new Set([
  "best-discount",
  "best-score",
  "price-low-high",
  "price-high-low",
  "historic-high-low",
  "card-name",
  "time-left",
]);

export function parseDealsViewStateFromSearchParams(
  params: URLSearchParams,
  defaults: DealsViewState = DEFAULT_DEALS_VIEW_STATE,
): DealsViewState {
  const next: DealsViewState = { ...defaults };

  const sort = params.get("sort");
  if (sort && SORT_KEYS.has(sort)) {
    next.sortBy = sort;
  }

  const top = params.get("top");
  if (top === "1") {
    next.topDealsOnly = true;
  }

  const condition = params.get("cond");
  if (condition) {
    next.conditionKey = condition;
  }

  const set = params.get("set");
  if (set) {
    next.setFilter = set;
  }

  const market = params.get("mkt")?.toUpperCase();
  if (market === "EBAY_US" || market === "EBAY_CA") {
    next.marketKey = market;
  }

  const minDisc = parseNumber(params.get("min_disc"));
  if (minDisc != null) {
    next.minDiscountPercent = minDisc;
  }

  const minPrice = parseNumber(params.get("min_price"));
  if (minPrice != null) {
    next.minPrice = minPrice;
  }

  const maxPrice = parseNumber(params.get("max_price"));
  if (maxPrice != null) {
    next.maxPrice = maxPrice;
  }

  const page = parseIntSafe(params.get("page"));
  if (page != null && page > 0) {
    next.page = page;
  }

  return next;
}

export function serializeDealsViewStateToSearchParams(
  state: DealsViewState,
  defaults: DealsViewState = DEFAULT_DEALS_VIEW_STATE,
): URLSearchParams {
  const params = new URLSearchParams();

  if (state.sortBy !== defaults.sortBy) {
    params.set("sort", state.sortBy);
  }
  if (state.topDealsOnly) {
    params.set("top", "1");
  }
  if (state.conditionKey !== defaults.conditionKey) {
    params.set("cond", state.conditionKey);
  }
  if (state.setFilter !== defaults.setFilter) {
    params.set("set", state.setFilter);
  }
  if (state.marketKey !== defaults.marketKey) {
    params.set("mkt", state.marketKey);
  }
  if (state.minDiscountPercent != null) {
    params.set("min_disc", String(state.minDiscountPercent));
  }
  if (state.minPrice != null) {
    params.set("min_price", String(state.minPrice));
  }
  if (state.maxPrice != null) {
    params.set("max_price", String(state.maxPrice));
  }
  if (state.page !== defaults.page) {
    params.set("page", String(state.page));
  }

  return params;
}

function parseNumber(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseIntSafe(raw: string | null): number | null {
  if (!raw) return null;
  const value = parseInt(raw, 10);
  return Number.isFinite(value) ? value : null;
}
