const FALLBACK_SITE_URL = "https://tcg-deal-finder.local";

function normalizeSiteUrl(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `https://${value}`;
}

export function getRebuildSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.VERCEL_URL;
  if (!configured) {
    return FALLBACK_SITE_URL;
  }
  return normalizeSiteUrl(configured);
}

export function buildAbsoluteUrl(path: string): string {
  return new URL(path, getRebuildSiteUrl()).toString();
}
