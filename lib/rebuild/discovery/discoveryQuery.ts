import type { ListingDomain } from "@/lib/rebuild/data/listingMapper";
import type { CardLanguage } from "@/lib/rebuild/data/listingMapper";
import { parsePreset, type Preset } from "@/lib/rebuild/prefs/rebuildPrefs";
import { toUsdCentsFromCadDollars } from "@/lib/rebuild/currency/cad";
import { toUsdCentsFromUsdDollars } from "@/lib/rebuild/currency/canonical";

export const ALLOWED_CONDITIONS = ["NM", "LP", "MP", "HP", "DMG"] as const;
export type Condition = (typeof ALLOWED_CONDITIONS)[number];

export const ALLOWED_LANGUAGES = ["EN", "JP", "UNKNOWN"] as const;
export type Language = (typeof ALLOWED_LANGUAGES)[number];

export const ALLOWED_CONFIDENCE_THRESHOLDS = ["any", "medium", "high"] as const;
export type ConfidenceThreshold =
  (typeof ALLOWED_CONFIDENCE_THRESHOLDS)[number];

export type DiscoveryFilters = {
  priceMinCad: number | null;
  priceMaxCad: number | null;
  condition: Condition | null;
  language: Language | null;
  minConfidence: ConfidenceThreshold;
  seller: string | null;
};

export type DiscoveryQuery = {
  preset: Preset;
  filters: DiscoveryFilters;
};

export type ParseDiscoveryQueryResult =
  | { kind: "ok"; query: DiscoveryQuery }
  | { kind: "invalid_preset" }
  | { kind: "invalid_filters" };

export const DEFAULT_DISCOVERY_FILTERS: DiscoveryFilters = {
  priceMinCad: null,
  priceMaxCad: null,
  condition: null,
  language: null,
  minConfidence: "any",
  seller: null,
};

type SearchParamsRecord = { [key: string]: string | string[] | undefined };

export function parseDiscoveryQuery(
  searchParams: SearchParamsRecord
): ParseDiscoveryQueryResult {
  const sortRaw = first(searchParams.sort);
  const presetResult = parsePreset(sortRaw);
  if (typeof presetResult !== "string") {
    return { kind: "invalid_preset" };
  }

  const filtersResult = parseDiscoveryFilters(searchParams);
  if (filtersResult.kind !== "ok") {
    return { kind: "invalid_filters" };
  }

  return {
    kind: "ok",
    query: {
      preset: presetResult,
      filters: filtersResult.filters,
    },
  };
}

export function parseDiscoveryQueryFromUrlSearchParams(
  searchParams: URLSearchParams
): ParseDiscoveryQueryResult {
  const record: SearchParamsRecord = {};
  searchParams.forEach((value, key) => {
    const existing = record[key];
    if (existing === undefined) {
      record[key] = value;
      return;
    }
    if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      record[key] = [existing, value];
    }
  });
  return parseDiscoveryQuery(record);
}

export function filterDealsByDiscoveryQuery(
  deals: ListingDomain[],
  query: DiscoveryQuery
): ListingDomain[] {
  const { filters } = query;
  return deals.filter((deal) => matchesFilters(deal, filters));
}

export function serializeDiscoveryFilters(filters: DiscoveryFilters): {
  priceMinCad: string | null;
  priceMaxCad: string | null;
  condition: string | null;
  language: string | null;
  minConfidence: string | null;
  seller: string | null;
} {
  return {
    priceMinCad:
      filters.priceMinCad != null ? String(filters.priceMinCad) : null,
    priceMaxCad:
      filters.priceMaxCad != null ? String(filters.priceMaxCad) : null,
    condition: filters.condition,
    language: filters.language,
    minConfidence:
      filters.minConfidence !== "any" ? filters.minConfidence : null,
    seller: filters.seller,
  };
}

function parseDiscoveryFilters(
  searchParams: SearchParamsRecord
): { kind: "ok"; filters: DiscoveryFilters } | { kind: "invalid" } {
  const priceMin = parseNullableInt(first(searchParams.minPriceCad));
  const priceMax = parseNullableInt(first(searchParams.maxPriceCad));
  if (priceMin.kind === "invalid" || priceMax.kind === "invalid") {
    return { kind: "invalid" };
  }
  const priceMinCad = priceMin.value;
  const priceMaxCad = priceMax.value;
  if (priceMinCad != null && priceMaxCad != null && priceMinCad > priceMaxCad) {
    return { kind: "invalid" };
  }

  const condition = parseNullableEnum(
    first(searchParams.condition),
    ALLOWED_CONDITIONS
  );
  if (condition.kind === "invalid") {
    return { kind: "invalid" };
  }

  const language = parseNullableEnum(
    first(searchParams.lang),
    ALLOWED_LANGUAGES
  );
  if (language.kind === "invalid") {
    return { kind: "invalid" };
  }

  const minConfidence = parseNullableEnum(
    first(searchParams.minConfidence),
    ALLOWED_CONFIDENCE_THRESHOLDS
  );
  if (minConfidence.kind === "invalid") {
    return { kind: "invalid" };
  }

  const seller = normalizeSeller(first(searchParams.seller));
  if (seller.kind === "invalid") {
    return { kind: "invalid" };
  }

  return {
    kind: "ok",
    filters: {
      ...DEFAULT_DISCOVERY_FILTERS,
      priceMinCad,
      priceMaxCad,
      condition: condition.value,
      language: language.value,
      minConfidence: minConfidence.value ?? "any",
      seller: seller.value,
    },
  };
}

function matchesFilters(
  deal: ListingDomain,
  filters: DiscoveryFilters
): boolean {
  if (filters.priceMinCad != null || filters.priceMaxCad != null) {
    const totalUsd = deal.price.totalUsd;
    if (totalUsd == null) {
      return false;
    }

    const totalUsdCents = toUsdCentsFromUsdDollars(totalUsd);
    const minUsdCents =
      filters.priceMinCad != null
        ? toUsdCentsFromCadDollars(filters.priceMinCad)
        : null;
    const maxUsdCents =
      filters.priceMaxCad != null
        ? toUsdCentsFromCadDollars(filters.priceMaxCad)
        : null;

    if (minUsdCents != null && totalUsdCents < minUsdCents) {
      return false;
    }
    if (maxUsdCents != null && totalUsdCents > maxUsdCents) {
      return false;
    }
  }

  if (filters.condition != null) {
    if (!deal.condition) return false;
    if (deal.condition !== filters.condition) return false;
  }

  if (filters.language != null) {
    if (deal.language !== (filters.language as CardLanguage)) return false;
  }

  if (filters.minConfidence !== "any") {
    const weight = deal.trust.confidence.weight ?? 0;
    const min = filters.minConfidence === "high" ? 0.8 : 0.55;
    if (weight < min) {
      return false;
    }
  }

  if (filters.seller) {
    const needle = filters.seller.toLowerCase();
    const haystacks = [deal.seller.name, deal.seller.username]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());
    if (!haystacks.some((value) => value.includes(needle))) {
      return false;
    }
  }

  return true;
}

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function parseNullableInt(input: string | null):
  | {
      kind: "ok";
      value: number | null;
    }
  | { kind: "invalid" } {
  if (input == null || input.trim() === "") {
    return { kind: "ok", value: null };
  }
  if (!/^\d+$/.test(input.trim())) {
    return { kind: "invalid" };
  }
  const parsed = Number(input.trim());
  if (!Number.isFinite(parsed)) {
    return { kind: "invalid" };
  }
  return { kind: "ok", value: parsed };
}

function parseNullableEnum<const T extends readonly string[]>(
  input: string | null,
  allowed: T
): { kind: "ok"; value: T[number] | null } | { kind: "invalid" } {
  if (input == null || input.trim() === "") {
    return { kind: "ok", value: null };
  }
  const normalized = input.trim();
  if ((allowed as readonly string[]).includes(normalized)) {
    return { kind: "ok", value: normalized as T[number] };
  }
  return { kind: "invalid" };
}

function normalizeSeller(input: string | null):
  | {
      kind: "ok";
      value: string | null;
    }
  | { kind: "invalid" } {
  if (input == null) return { kind: "ok", value: null };
  const trimmed = input.trim();
  if (!trimmed) return { kind: "ok", value: null };
  if (trimmed.length > 80) return { kind: "invalid" };
  return { kind: "ok", value: trimmed };
}
