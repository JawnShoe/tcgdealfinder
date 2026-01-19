import type { ListingDomain } from "@/lib/rebuild/data/listingMapper";

export const ALLOWED_PRESETS = [
  "newest",
  "biggest-discount",
  "endingSoon",
] as const;

export type Preset = (typeof ALLOWED_PRESETS)[number];

export type RebuildSort = Preset;

export type RebuildPrefs = {
  sort: RebuildSort;
};

export const DEFAULT_REBUILD_SORT: RebuildSort = "newest";

export const REBUILD_SORT_OPTIONS: Array<{
  value: RebuildSort;
  label: string;
}> = [
  { value: "newest", label: "Newest" },
  { value: "biggest-discount", label: "Biggest discount" },
  { value: "endingSoon", label: "Ending soon" },
];

export function parsePreset(
  input: string | null
): Preset | { kind: "invalid" } {
  if (input == null || input.trim() === "") {
    return DEFAULT_REBUILD_SORT;
  }

  const normalized = input.trim();
  if (normalized === "ending-soon" || normalized === "endingsoon") {
    return "endingSoon";
  }

  if (ALLOWED_PRESETS.includes(normalized as Preset)) {
    return normalized as Preset;
  }

  return { kind: "invalid" };
}

export function parseRebuildSortValue(
  value: string | null | undefined
): RebuildSort {
  const parsed = parsePreset(value ?? null);
  if (typeof parsed === "string") {
    return parsed;
  }
  throw new Error(`Invalid discovery preset: ${value ?? "null"}`);
}

export type ParseRebuildPrefsResult =
  | { kind: "ok"; prefs: RebuildPrefs }
  | { kind: "invalid_preset" };

export function parseRebuildPrefs(searchParams: {
  [key: string]: string | string[] | undefined;
}): ParseRebuildPrefsResult {
  const rawSort = searchParams.sort;
  const sortValue = Array.isArray(rawSort) ? rawSort[0] : rawSort;
  const presetResult = parsePreset(sortValue ?? null);
  if (typeof presetResult !== "string") {
    return { kind: "invalid_preset" };
  }

  return {
    kind: "ok",
    prefs: {
      sort: presetResult,
    },
  };
}

export function serializeRebuildPrefs(prefs: RebuildPrefs): URLSearchParams {
  const params = new URLSearchParams();
  if (prefs.sort !== DEFAULT_REBUILD_SORT) {
    params.set("sort", prefs.sort);
  }
  return params;
}

export function sortDealsByPrefs(
  deals: ListingDomain[],
  prefs: RebuildPrefs
): ListingDomain[] {
  if (prefs.sort === "biggest-discount") {
    return [...deals].sort((left, right) => {
      const leftDiscount =
        left.price.discountPercent ?? Number.NEGATIVE_INFINITY;
      const rightDiscount =
        right.price.discountPercent ?? Number.NEGATIVE_INFINITY;
      return rightDiscount - leftDiscount;
    });
  }

  return deals;
}
