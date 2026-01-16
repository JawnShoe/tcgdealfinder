import type { ListingDomain } from "@/lib/rebuild/data/listingMapper";

export type RebuildSort = "newest" | "biggest-discount" | "endingSoon";

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

export function parseRebuildSortValue(
  value: string | null | undefined
): RebuildSort {
  if (value === "biggest-discount") {
    return "biggest-discount";
  }
  if (value === "endingSoon") {
    return "endingSoon";
  }
  return DEFAULT_REBUILD_SORT;
}

export function parseRebuildPrefs(searchParams: {
  [key: string]: string | string[] | undefined;
}): RebuildPrefs {
  const rawSort = searchParams.sort;
  const sortValue = Array.isArray(rawSort) ? rawSort[0] : rawSort;

  return {
    sort: parseRebuildSortValue(sortValue),
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
