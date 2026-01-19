import {
  DEFAULT_REBUILD_SORT,
  type Preset,
} from "@/lib/rebuild/prefs/rebuildPrefs";

type BuildDiscoveryUrlInput = {
  preset: Preset;
  basePath?: "/discovery" | "/rebuild/discovery";
  includeDefaultPreset?: boolean;
};

export function buildDiscoveryUrl({
  preset,
  basePath = "/discovery",
  includeDefaultPreset = false,
}: BuildDiscoveryUrlInput): string {
  const params = new URLSearchParams();
  if (includeDefaultPreset || preset !== DEFAULT_REBUILD_SORT) {
    params.set("sort", preset);
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function buildListingUrl({ id }: { id: string }): string {
  return `/rebuild/listing/${encodeURIComponent(id)}`;
}
