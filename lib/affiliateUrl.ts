/**
 * Centralized eBay affiliate URL builder.
 * 
 * Appends eBay Partner Network (EPN) tracking params when configured.
 * Falls back to original URL if env vars are missing (no broken links).
 * 
 * Environment variables (use NEXT_PUBLIC_ prefix for client-side access):
 * - NEXT_PUBLIC_EBAY_AFFILIATE_CAMPAIGN_ID (campid): Your EPN campaign ID
 * - NEXT_PUBLIC_EBAY_AFFILIATE_CUSTOM_ID (customid): Optional tracking segment
 * 
 * Usage:
 *   import { buildAffiliateUrl } from "@/lib/affiliateUrl";
 *   const url = buildAffiliateUrl(deal.url);
 */

// EPN tracking params per eBay Partner Network spec:
// https://developer.ebay.com/api-docs/buy/static/buy-requirements.html
const EBAY_MKEVT = "1"; // Marketing event type (1 = click)
const EBAY_MKCID = "1"; // Marketing channel (1 = EPN)
const EBAY_MKRID = "711-53200-19255-0"; // Reference ID for US market
const EBAY_TOOLID = "10001"; // Tool ID

/**
 * Get affiliate config from environment.
 * Works both server-side and client-side (with NEXT_PUBLIC_ prefix).
 * Returns null if not configured (graceful fallback).
 */
function getAffiliateConfig(): { campid: string; customid?: string } | null {
  // Try NEXT_PUBLIC_ first (works both client and server)
  // Then fall back to non-prefixed (server-only)
  const campid = 
    process.env.NEXT_PUBLIC_EBAY_AFFILIATE_CAMPAIGN_ID ||
    process.env.EBAY_AFFILIATE_CAMPAIGN_ID;
  
  if (!campid) {
    return null;
  }
  
  const customid =
    process.env.NEXT_PUBLIC_EBAY_AFFILIATE_CUSTOM_ID ||
    process.env.EBAY_AFFILIATE_CUSTOM_ID ||
    undefined;
  
  return { campid, customid };
}

/**
 * Check if a URL is an eBay listing URL.
 */
function isEbayUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("ebay.com") || parsed.hostname.includes("ebay.ca");
  } catch {
    return false;
  }
}

/**
 * Build affiliate-tagged URL for eBay listings.
 * 
 * If affiliate params are not configured (env vars missing),
 * returns the original URL unchanged - no broken links.
 * 
 * Non-eBay URLs are returned unchanged.
 */
export function buildAffiliateUrl(originalUrl: string): string {
  // Don't modify non-eBay URLs
  if (!isEbayUrl(originalUrl)) {
    return originalUrl;
  }

  const config = getAffiliateConfig();
  if (!config) {
    // No affiliate config - return original URL
    return originalUrl;
  }

  try {
    const url = new URL(originalUrl);
    
    // Add EPN tracking params
    url.searchParams.set("mkevt", EBAY_MKEVT);
    url.searchParams.set("mkcid", EBAY_MKCID);
    url.searchParams.set("mkrid", EBAY_MKRID);
    url.searchParams.set("campid", config.campid);
    url.searchParams.set("toolid", EBAY_TOOLID);
    
    if (config.customid) {
      url.searchParams.set("customid", config.customid);
    }

    return url.toString();
  } catch {
    // URL parsing failed - return original
    return originalUrl;
  }
}

/**
 * Check if affiliate tagging is enabled.
 * Useful for conditional UI (e.g., showing "affiliate link" disclosure).
 */
export function isAffiliateEnabled(): boolean {
  return Boolean(process.env.EBAY_AFFILIATE_CAMPAIGN_ID);
}
