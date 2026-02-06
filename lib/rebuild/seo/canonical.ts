import {
  DEFAULT_REBUILD_SORT,
  parseRebuildPrefs,
  serializeRebuildPrefs,
} from "@/lib/rebuild/prefs/rebuildPrefs";
import { buildAbsoluteUrl } from "./siteUrl";

type RebuildSearchParams =
  | URLSearchParams
  | { [key: string]: string | string[] | undefined }
  | undefined;

export function buildCanonicalUrl(path: string): string {
  return buildAbsoluteUrl(path);
}

export function buildDiscoveryCanonicalUrl(
  searchParams: RebuildSearchParams
): string {
  const prefsResult = parseRebuildPrefs(normalizeSearchParams(searchParams));
  const prefs =
    prefsResult.kind === "ok"
      ? prefsResult.prefs
      : { sort: DEFAULT_REBUILD_SORT };
  const canonicalParams = serializeRebuildPrefs(prefs);
  const query = canonicalParams.toString();
  const path = query ? `/discovery?${query}` : "/discovery";
  return buildAbsoluteUrl(path);
}

export function buildListingCanonicalUrl(listingId: string): string {
  return buildAbsoluteUrl(`/listing/${encodeURIComponent(listingId)}`);
}

function normalizeSearchParams(
  input: RebuildSearchParams
): Record<string, string | string[] | undefined> {
  if (!input) {
    return {};
  }
  if (!(input instanceof URLSearchParams)) {
    return input;
  }

  const normalized: Record<string, string | string[] | undefined> = {};
  input.forEach((value, key) => {
    const existing = normalized[key];
    if (existing === undefined) {
      normalized[key] = value;
      return;
    }
    if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      normalized[key] = [existing, value];
    }
  });

  return normalized;
}
