// ARCHIVED: replaced by rebuild lane – do not import
import { DEFAULT_DEALS_VIEW_STATE, type DealsViewState } from "./dealsState";

const STORAGE_KEY = "tcg_deals_view_state_v2";

export function loadDealsViewState(): Partial<DealsViewState> | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed == null) {
      return null;
    }
    return sanitizePartial(parsed as Record<string, unknown>);
  } catch (error) {
    console.warn("Failed to load deals view state", error);
    return null;
  }
}

export function saveDealsViewState(state: DealsViewState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const minimal = buildMinimalState(state);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
  } catch (error) {
    console.warn("Failed to save deals view state", error);
  }
}

function sanitizePartial(
  data: Record<string, unknown>
): Partial<DealsViewState> {
  const partial: Partial<DealsViewState> = {};

  if (typeof data.sortBy === "string") {
    partial.sortBy = data.sortBy;
  }
  if (typeof data.topDealsOnly === "boolean") {
    partial.topDealsOnly = data.topDealsOnly;
  }
  if (typeof data.conditionKey === "string") {
    partial.conditionKey = data.conditionKey;
  }
  if (typeof data.setFilter === "string") {
    partial.setFilter = data.setFilter;
  }
  if (typeof data.marketKey === "string") {
    const upper = data.marketKey.toUpperCase();
    if (upper === "EBAY_US" || upper === "EBAY_CA") {
      partial.marketKey = upper;
    }
  }
  if (typeof data.minDiscountPercent === "number") {
    partial.minDiscountPercent = data.minDiscountPercent;
  }
  if (typeof data.minPrice === "number") {
    partial.minPrice = data.minPrice;
  }
  if (typeof data.maxPrice === "number") {
    partial.maxPrice = data.maxPrice;
  }
  if (typeof data.page === "number" && data.page > 0) {
    partial.page = data.page;
  }
  if (typeof data.priceConfFilter === "string") {
    const valid = ["all", "high", "medium", "low"];
    if (valid.includes(data.priceConfFilter)) {
      partial.priceConfFilter = data.priceConfFilter;
    }
  }

  return partial;
}

function buildMinimalState(state: DealsViewState): Partial<DealsViewState> {
  const minimal: Partial<DealsViewState> = {};
  const defaults = DEFAULT_DEALS_VIEW_STATE;

  if (state.sortBy !== defaults.sortBy) {
    minimal.sortBy = state.sortBy;
  }
  if (state.topDealsOnly !== defaults.topDealsOnly) {
    minimal.topDealsOnly = state.topDealsOnly;
  }
  if (state.conditionKey !== defaults.conditionKey) {
    minimal.conditionKey = state.conditionKey;
  }
  if (state.setFilter !== defaults.setFilter) {
    minimal.setFilter = state.setFilter;
  }
  if (state.marketKey !== defaults.marketKey) {
    minimal.marketKey = state.marketKey;
  }
  if (state.minDiscountPercent !== defaults.minDiscountPercent) {
    minimal.minDiscountPercent = state.minDiscountPercent;
  }
  if (state.minPrice !== defaults.minPrice) {
    minimal.minPrice = state.minPrice;
  }
  if (state.maxPrice !== defaults.maxPrice) {
    minimal.maxPrice = state.maxPrice;
  }
  if (state.page !== defaults.page) {
    minimal.page = state.page;
  }
  if (state.priceConfFilter !== defaults.priceConfFilter) {
    minimal.priceConfFilter = state.priceConfFilter;
  }

  return minimal;
}
