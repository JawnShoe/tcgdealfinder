import type { NextRequest } from "next/server";

import { SUPPORTED_MARKETS, type MarketCode } from "./markets";

export type MarketPreference = MarketCode | "all";

export const MARKET_COOKIE_NAME = "market";

const COUNTRY_TO_MARKET: Record<string, MarketCode> = {
  US: "EBAY_US",
  CA: "EBAY_CA",
  AU: "EBAY_AU",
  GB: "EBAY_GB",
};

export function parseMarketPreference(
  value: string | null | undefined
): MarketPreference | null {
  if (!value) return null;
  const upper = value.toUpperCase().trim();
  if (!upper) return null;
  if (upper === "ALL") return "all";
  if (SUPPORTED_MARKETS.includes(upper as MarketCode)) {
    return upper as MarketCode;
  }
  if (upper === "US" || upper === "USA") return "EBAY_US";
  if (upper === "CA" || upper === "CAN" || upper === "CANADA") return "EBAY_CA";
  if (upper === "GB" || upper === "UK") return "EBAY_GB";
  if (upper === "AU" || upper === "AUS" || upper === "AUSTRALIA")
    return "EBAY_AU";
  return null;
}

export function mapCountryToMarket(
  country: string | null | undefined
): MarketCode | null {
  if (!country) return null;
  const upper = country.toUpperCase().trim();
  if (!upper) return null;
  return COUNTRY_TO_MARKET[upper] ?? null;
}

export function resolveMarketPreference(
  cookieValue: string | null | undefined,
  geoCountry: string | null | undefined
): MarketPreference {
  const cookieMarket = parseMarketPreference(cookieValue);
  if (cookieMarket) return cookieMarket;
  const geoMarket = mapCountryToMarket(geoCountry);
  return geoMarket ?? "EBAY_US";
}

export function getGeoCountryFromHeaders(headers: Headers): string | null {
  const vercelCountry = headers.get("x-vercel-ip-country");
  if (vercelCountry) return vercelCountry;
  const cloudflareCountry = headers.get("cf-ipcountry");
  if (cloudflareCountry) return cloudflareCountry;
  return null;
}

export function getGeoCountryFromRequest(req: NextRequest): string | null {
  const direct = (req as unknown as { geo?: { country?: string } }).geo
    ?.country;
  if (direct) return direct;
  return getGeoCountryFromHeaders(req.headers);
}
