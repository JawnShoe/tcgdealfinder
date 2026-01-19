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
  basePath?: "/discovery" | "/rebuild/discovery";
  includeDefaultPreset?: boolean;
  filters?: DiscoveryFilters;
};

export function buildDiscoveryUrl({
  preset,
  basePath = "/discovery",
  includeDefaultPreset = false,
  filters,
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
    if (serialized.minConfidence)
      params.set("minConfidence", serialized.minConfidence);
    if (serialized.seller) params.set("seller", serialized.seller);
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function buildListingUrl({ id }: { id: string }): string {
  return `/rebuild/listing/${encodeURIComponent(id)}`;
}
