import {
  DEFAULT_REBUILD_SORT,
  type Preset,
} from "@/lib/rebuild/prefs/rebuildPrefs";
import {
  serializeDiscoveryFilters,
  type DiscoveryFilters,
} from "@/lib/rebuild/discovery/discoveryQuery";

type BuildDiscoveryUrlInput = {
  preset: Preset;
  basePath?: "/discovery";
  includeDefaultPreset?: boolean;
  filters?: DiscoveryFilters;
  pagination?: {
    page?: number | null;
    pageSize?: number | null;
  };
};

export function buildDiscoveryUrl({
  preset,
  basePath = "/discovery",
  includeDefaultPreset = false,
  filters,
  pagination,
}: BuildDiscoveryUrlInput): string {
  const params = new URLSearchParams();
  if (includeDefaultPreset || preset !== DEFAULT_REBUILD_SORT) {
    params.set("sort", preset);
  }

  if (filters) {
    const serialized = serializeDiscoveryFilters(filters);
    if (serialized.priceMinCad)
      params.set("minPriceCad", serialized.priceMinCad);
    if (serialized.priceMaxCad)
      params.set("maxPriceCad", serialized.priceMaxCad);
    if (serialized.condition) params.set("condition", serialized.condition);
    if (serialized.language) params.set("lang", serialized.language);
    if (serialized.market) params.set("market", serialized.market);
    if (serialized.minConfidence)
      params.set("minConfidence", serialized.minConfidence);
    if (serialized.seller) params.set("seller", serialized.seller);
  }

  if (pagination) {
    const page =
      pagination.page != null && Number.isFinite(pagination.page)
        ? Math.max(1, Math.trunc(pagination.page))
        : 1;

    const allowedPageSizes = [25, 50, 100] as const;
    const pageSize =
      pagination.pageSize != null && Number.isFinite(pagination.pageSize)
        ? Math.trunc(pagination.pageSize)
        : 25;
    const normalizedPageSize = allowedPageSizes.includes(
      pageSize as (typeof allowedPageSizes)[number]
    )
      ? pageSize
      : 25;

    if (page > 1) params.set("page", String(page));
    if (normalizedPageSize !== 25)
      params.set("pageSize", String(normalizedPageSize));
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function buildListingUrl({ id }: { id: string }): string {
  return `/listing/${encodeURIComponent(id)}`;
}
