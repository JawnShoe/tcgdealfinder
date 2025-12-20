/**
 * Centralized blacklist module for filtering fake/non-card items
 * Applies to all markets: US/CA/UK/AU
 * 
 * This module works in conjunction with BANNED_TITLE_KEYWORDS in lib/ebay.ts
 * which is used during ingestion. This module provides:
 * 1. Additional categorized keywords for reporting
 * 2. Query-side filtering as a safety net
 * 3. Batch processing utilities for cleanup scripts
 * 4. Card-aware contradiction filtering (variant_contradiction)
 * 5. Soft exclusion for non-card merchandise (blankets, plush, posters, etc.)
 *    - Does NOT delete from DB, just hides from card-deal surfaces
 * 6. Database-backed overrides (ALLOW, HARD_BLOCK, SOFT_EXCLUDE)
 *    - Checked FIRST before any rules
 *    - Highest precedence for debug/manual intervention
 */

import { BANNED_TITLE_KEYWORDS, cleanTitle } from "./ebay";
import { query } from "./db";
import type { ListingOverride, OverrideType } from "./schema";

// =============================================================================
// OVERRIDE CACHE
// =============================================================================

// Cache overrides in memory for 60 seconds to avoid DB hit on every listing
let overrideCache: Map<string, ListingOverride> = new Map();
let overrideCacheTimestamp = 0;
const OVERRIDE_CACHE_TTL = 60_000; // 60 seconds

/**
 * Fetch all active overrides from DB (cached for 60s)
 */
async function getOverridesCache(): Promise<Map<string, ListingOverride>> {
  const now = Date.now();
  
  // Return cached if still fresh
  if (now - overrideCacheTimestamp < OVERRIDE_CACHE_TTL) {
    return overrideCache;
  }
  
  try {
    const result = await query<ListingOverride>(
      `SELECT * FROM listing_overrides
       WHERE expires_at IS NULL OR expires_at > NOW()`,
      []
    );
    
    const newCache = new Map<string, ListingOverride>();
    for (const row of result.rows) {
      newCache.set(row.listing_id, row);
    }
    
    overrideCache = newCache;
    overrideCacheTimestamp = now;
    
    return newCache;
  } catch (error) {
    console.error("Error fetching overrides cache:", error);
    // Return existing cache on error
    return overrideCache;
  }
}

/**
 * Check if a listing has an override.
 * Returns null if no override exists.
 */
export async function checkListingOverride(listingId: string): Promise<ListingOverride | null> {
  const cache = await getOverridesCache();
  return cache.get(listingId) ?? null;
}

/**
 * Invalidate the override cache (call after creating/deleting overrides)
 */
export function invalidateOverrideCache(): void {
  overrideCacheTimestamp = 0;
}

// =============================================================================
// RE-EXPORT FOR CONVENIENCE
// =============================================================================

export { BANNED_TITLE_KEYWORDS } from "./ebay";

// =============================================================================
// KEYWORD DENYLISTS
// =============================================================================

/**
 * Replica/fake card keywords
 * Note: "proxy" is handled specially since we use -proxy in search
 */
export const REPLICA_KEYWORDS = [
  // English
  "replica",
  "repro",
  "reproduction",
  "bootleg",
  "fake",
  "counterfeit",
  "unofficial",
  "custom made",
  "fan made",
  "homemade",
  // Italian/Spanish/Common international
  "carta replica",
  "replica carta",
  "carta prox",
  "falsa",
  "imitazione",
  "imitacion",
  "falso",
  "falsificacion",
  "contrefacon",
  "faux",
] as const;

/**
 * Non-card materials (acrylic, metal, etc.)
 */
export const NON_CARD_MATERIAL_KEYWORDS = [
  "acrylic",
  "metal card",
  "metal pokemon",
  "stainless",
  "stainless steel",
  "aluminum",
  "aluminium",
  "alloy",
  "tin card",
  "steel card",
  "gold metal",
  "silver metal",
  "gold plated",
  "silver plated",
  "brass",
  "copper card",
  "iron card",
] as const;

/**
 * Display cases, holders, storage - not actual cards
 */
export const DISPLAY_CASE_KEYWORDS = [
  "display case",
  "display stand",
  "display holder",
  "card case",
  "card holder",
  "card stand",
  "card frame",
  "slab case",
  "slab holder",
  "slab stand",
  "magnetic holder",
  "magnetic case",
  "one touch",
  "one-touch",
  "toploader",
  "top loader",
  "binder",
  "album",
  "storage box",
  "storage case",
  "card box",
  "deck box",
  "portfolio",
  "card sleeve",
  "penny sleeve",
  "card protector",
  "protective case",
  // These alone are risky but combined with other signals
  "acrylic case",
  "acrylic display",
  "acrylic frame",
  "acrylic holder",
  "acrylic stand",
] as const;

/**
 * Art-only items, not actual playable/collectible cards
 * NOTE: "full art" and "alt art" are LEGITIMATE Pokémon TCG terms - do NOT block!
 */
export const ART_ONLY_KEYWORDS = [
  "art print",
  "artwork only",
  "fan art",
  "fanart",
  "custom art",
  "custom artwork",
  "art extender",
  "extended art custom",
  "altered art",
  "proxy art",
  // NOT "art card" - too many false positives with "Alt Art Card"
  "illustration only",
  "poster",
  "print only",
  "wall art",
  "canvas print",
  "art piece",
  "art reproduction",
] as const;

/**
 * Multi-card lots, bundles, sealed product
 * We want single cards, not lots or sealed
 */
export const NOT_A_SINGLE_CARD_KEYWORDS = [
  // Lots/bundles (some overlap with existing -lot -bundle)
  "lot of",
  "card lot",
  "pokemon lot",
  "bulk lot",
  "collection lot",
  "bundle of",
  "bulk cards",
  "bulk collection",
  "job lot",
  "wholesale",
  "mixed lot",
  "random lot",
  // Sealed product
  "booster pack",
  "booster box",
  "sealed pack",
  "sealed box",
  "sealed case",
  "elite trainer box",
  "etb sealed",
  "blister pack",
  "collection box",
  "premium collection",
  "tin sealed",
  "sealed tin",
  // Accessories sold with card
  "with stand",
  "with case",
  "with holder",
  "with display",
  "with frame",
  "includes case",
  "includes stand",
  "includes holder",
] as const;

/**
 * All denylist keywords combined with their categories
 */
export const ALL_DENYLIST_KEYWORDS: Array<{ keyword: string; category: string }> = [
  ...REPLICA_KEYWORDS.map((k) => ({ keyword: k, category: "replica" })),
  ...NON_CARD_MATERIAL_KEYWORDS.map((k) => ({ keyword: k, category: "non_card_material" })),
  ...DISPLAY_CASE_KEYWORDS.map((k) => ({ keyword: k, category: "display_case" })),
  ...ART_ONLY_KEYWORDS.map((k) => ({ keyword: k, category: "art_only" })),
  ...NOT_A_SINGLE_CARD_KEYWORDS.map((k) => ({ keyword: k, category: "not_single_card" })),
];

// =============================================================================
// SOFT EXCLUSION KEYWORDS (Non-Card Merchandise)
// =============================================================================
// These listings are NOT scams/fakes, just category leakage from eBay search.
// We hide them from card-deal surfaces but do NOT delete from DB.

export type SoftExclusionCategory = "non_card_merch";

/**
 * Keywords that indicate non-card merchandise
 * Conservative list - compound phrases to avoid false positives
 */
export const SOFT_EXCLUSION_KEYWORDS = [
  // Bedding/soft goods
  "blanket",
  "throw blanket",
  "duvet",
  "comforter",
  "bedsheet",
  "pillow",
  "cushion",
  
  // Plush/toys
  "plush",
  "plushie",
  "stuffed",
  "soft toy",
  "teddy",
  
  // Wall/prints (compound to avoid "art" alone)
  // Note: "poster" and "wall art" are also in ART_ONLY_KEYWORDS - that's fine, 
  // hard block takes precedence anyway
  "canvas",
  "wall art",
  "framed print",
  "framed art",
  "wall decor",
  "wall hanging",
  
  // Accessories/gaming
  "playmat",
  "play mat",
  "mousepad",
  "mouse pad",
  "coaster",
  
  // Clothing
  "hoodie",
  "tshirt",
  "t-shirt",
  "t shirt",
  "sweater",
  "jacket",
  "hat",
  "beanie",
  "socks",
  "shirt",
  "shorts",
  "pants",
  "dress",
  "skirt",
  
  // Misc merchandise
  "keychain",
  "key chain",
  "lanyard",
  "pin badge",
  "enamel pin",
  "figure",
  "figurine",
  "statue",
  "action figure",
  "funko",
  "nendoroid",
  "backpack",
  "bag",
  "tote",
  "wallet",
  "phone case",
  "iphone case",
  "mug",
  "cup",
  "tumbler",
  "water bottle",
  "lunch box",
  "lunchbox",
] as const;

export type SoftExclusionResult = {
  excluded: boolean;
  reason?: SoftExclusionCategory;
  hit?: string;
};

// =============================================================================
// ALLOWLIST EXCEPTIONS
// =============================================================================

/**
 * Patterns that indicate a legitimate graded card
 * These can override some blacklist hits but with caution
 */
export const GRADED_CARD_INDICATORS = [
  "psa 10",
  "psa 9",
  "psa 8",
  "psa 7",
  "bgs 10",
  "bgs 9.5",
  "bgs 9",
  "cgc 10",
  "cgc 9.5",
  "cgc 9",
  "beckett",
  "gem mint",
] as const;

/**
 * If title matches these patterns, it's likely a real card
 * Used to avoid false positives
 */
export const REAL_CARD_INDICATORS: Array<RegExp | string> = [
  // Set number patterns (e.g., "215/203", "186/196")
  /\d{1,3}\/\d{1,3}/,
  // Common card identifiers
  /\bvmax\b/i,
  /\bvstar\b/i,
  /\bgx\b/i,
  /\bex\b/i,
  /\bfull art\b/i,
  /\bsecret rare\b/i,
  /\balt art\b/i,
  /\balternate art\b/i,
  /\brainbow rare\b/i,
  /\bgold rare\b/i,
  /\billustration rare\b/i,
  /\bspecial art rare\b/i,
  /\bsar\b/i,
] as const;

// =============================================================================
// NORMALIZATION
// =============================================================================

/**
 * Normalize listing text for consistent matching
 * - lowercase
 * - strip punctuation (keep alphanumeric and spaces)
 * - collapse whitespace
 * - basic diacritics handling
 */
export function normalizeListingText(title: string, subtitle?: string): string {
  const combined = subtitle ? `${title} ${subtitle}` : title;
  
  return combined
    .toLowerCase()
    // Normalize common diacritics
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Replace punctuation with spaces (keep alphanumeric)
    .replace(/[^\w\s]/g, " ")
    // Collapse multiple spaces
    .replace(/\s+/g, " ")
    .trim();
}

// =============================================================================
// VARIANT CONTRADICTION DETECTION (Card-aware filter)
// =============================================================================

/**
 * Always-contradictory modifiers that indicate fake/novelty items
 * These block regardless of card context
 */
const HARD_CONTRADICTION_KEYWORDS = [
  "gold",
  "golden",
  "metal",
  "stainless",
  "steel",
  "alloy",
  "acrylic",
  "proxy",
  "replica",
  "repro",
  "carta replica",
  "custom",
  "fan art",
  "fanart",
  "artwork",
  "art extender",
  "display case",
] as const;

/**
 * Card context for variant contradiction checks
 * Generic structure ready for Scrydex integration
 */
export type CardContext = {
  name?: string | null;
  setName?: string | null;
  number?: string | null;
  rarity?: string | null;
};

export type VariantContradictionResult = {
  blocked: boolean;
  reason?: string;
  hit?: string;
  category?: "variant_contradiction";
};

/**
 * Normalize card number for comparison
 * e.g., "186/196" -> "186", "SV107/SV122" -> "SV107"
 */
function normalizeCardNumber(num: string | null | undefined): string | null {
  if (!num) return null;
  // Take part before slash (if present)
  const beforeSlash = num.split("/")[0].trim().toUpperCase();
  return beforeSlash || null;
}

/**
 * Check if card number looks like a secret/alt art printing
 * These are typically numbered higher than the set size (e.g., 215/203)
 * or have special prefixes (SV, GG, TG)
 */
function isSecretOrAltNumber(num: string | null | undefined): boolean {
  if (!num) return false;
  const parts = num.split("/");
  if (parts.length === 2) {
    const cardNum = parseInt(parts[0].replace(/\D/g, ""), 10);
    const setSize = parseInt(parts[1].replace(/\D/g, ""), 10);
    // Secret rare: card number exceeds set size
    if (cardNum > 0 && setSize > 0 && cardNum > setSize) {
      return true;
    }
  }
  // Special prefixes that indicate variant printings
  const upper = num.toUpperCase();
  if (/^(SV|GG|TG|SWSH|SVP)\d+/.test(upper)) {
    return true;
  }
  return false;
}

/**
 * Check if a rarity string indicates a rainbow rare
 */
function isRainbowRarity(rarity: string | null | undefined): boolean {
  if (!rarity) return false;
  const lower = rarity.toLowerCase();
  return lower.includes("rainbow");
}

/**
 * Check for card-aware variant contradictions
 * 
 * Catches scam/novelty listings that slip past keyword blacklist by checking
 * if listing title claims variants that contradict the card's actual rarity.
 * 
 * @param listingTitle - The listing title to check
 * @param card - Optional card context (name, setName, number, rarity)
 * @returns Contradiction result with block status and reason
 */
export function getVariantContradictionReason(args: {
  listingTitle: string;
  card?: CardContext;
}): VariantContradictionResult {
  const { listingTitle, card } = args;
  const normalized = normalizeListingText(listingTitle);
  
  // A) Check hard contradiction keywords (always block)
  for (const keyword of HARD_CONTRADICTION_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (pattern.test(normalized)) {
      return {
        blocked: true,
        reason: "hard_modifier_contradiction",
        hit: keyword,
        category: "variant_contradiction",
      };
    }
  }
  
  // B) Check "rainbow" contradiction (card-aware)
  if (/\brainbow\b/i.test(normalized)) {
    // If we have rarity info, check if it's actually a rainbow card
    if (card?.rarity) {
      if (!isRainbowRarity(card.rarity)) {
        return {
          blocked: true,
          reason: "rainbow_modifier_contradiction",
          hit: "rainbow",
          category: "variant_contradiction",
        };
      }
      // Rarity indicates rainbow - allow
      return { blocked: false };
    }
    
    // No rarity info - use conservative heuristic based on card number
    if (card?.number) {
      const isSecretAlt = isSecretOrAltNumber(card.number);
      const cardNameLower = (card.name ?? "").toLowerCase();
      const nameHasRainbow = cardNameLower.includes("rainbow");
      
      // If it's a secret/alt numbered card and the name doesn't include "rainbow",
      // then claiming "rainbow" in the title is suspicious
      if (isSecretAlt && !nameHasRainbow) {
        return {
          blocked: true,
          reason: "rainbow_modifier_contradiction",
          hit: "rainbow",
          category: "variant_contradiction",
        };
      }
    }
    // No card number or not a secret/alt - don't block (conservative)
  }
  
  return { blocked: false };
}

// =============================================================================
// DECISION FUNCTION
// =============================================================================

export type BlacklistResult = {
  blocked: boolean;
  reason?: string;
  category?: string;
  keyword?: string;
};

/**
 * Check if a listing should be blocked based on title/subtitle
 * Uses the centralized BANNED_TITLE_KEYWORDS from ebay.ts
 * Returns blocking info with reason and category
 * 
 * @param listing - Listing with title and optional subtitle
 * @param card - Optional card context for variant contradiction checks
 */
export function getBlacklistReason(
  listing: {
    title: string;
    subtitle?: string;
  },
  card?: CardContext,
): BlacklistResult {
  const title = cleanTitle(listing.title);
  const subtitle = listing.subtitle ? cleanTitle(listing.subtitle) : "";
  const combined = `${title} ${subtitle}`.trim();
  const normalized = normalizeListingText(listing.title, listing.subtitle);
  
  // Check against BANNED_TITLE_KEYWORDS (the source of truth)
  for (const keyword of BANNED_TITLE_KEYWORDS) {
    if (combined.includes(keyword)) {
      // Determine category based on keyword
      const category = categorizeKeyword(keyword);
      
      // Check allowlist before blocking
      if (shouldAllowDespiteMatch(normalized, category, keyword)) {
        continue; // Skip this match, try next keyword
      }
      
      return {
        blocked: true,
        reason: `Matched "${keyword}"`,
        category,
        keyword,
      };
    }
  }
  
  // Also check our additional categorized keywords for edge cases
  for (const { keyword, category } of ALL_DENYLIST_KEYWORDS) {
    const normalizedKeyword = normalizeListingText(keyword);
    
    // Skip if already in BANNED_TITLE_KEYWORDS
    if (BANNED_TITLE_KEYWORDS.includes(keyword as any)) {
      continue;
    }
    
    // Use word boundary matching for short keywords
    const isShortKeyword = normalizedKeyword.split(" ").length === 1 && normalizedKeyword.length < 6;
    
    let matched = false;
    if (isShortKeyword) {
      const regex = new RegExp(`\\b${escapeRegex(normalizedKeyword)}\\b`, "i");
      matched = regex.test(normalized);
    } else {
      matched = normalized.includes(normalizedKeyword);
    }
    
    if (matched) {
      if (shouldAllowDespiteMatch(normalized, category, keyword)) {
        continue;
      }
      
      return {
        blocked: true,
        reason: `Matched "${keyword}" in ${category}`,
        category,
        keyword,
      };
    }
  }
  
  // Check for variant contradictions (hard keywords always, rainbow only with card context)
  const contradictionResult = getVariantContradictionReason({
    listingTitle: listing.title,
    card,  // undefined if no card context - will only check hard keywords
  });
  if (contradictionResult.blocked) {
    return {
      blocked: true,
      reason: contradictionResult.reason,
      category: contradictionResult.category,
      keyword: contradictionResult.hit,
    };
  }
  
  return { blocked: false };
}

// =============================================================================
// SOFT EXCLUSION FUNCTION
// =============================================================================

/**
 * Check if a listing should be soft-excluded as non-card merchandise
 * 
 * This is separate from hard blocking - soft-excluded items:
 * - Are NOT scams/fakes, just category leakage from eBay search
 * - Should be hidden from card-deal surfaces (homepage, /top-deals, etc.)
 * - Should NOT be deleted from DB
 * - Can be shown in other contexts if needed
 * 
 * @param args.title - Listing title
 * @param args.subtitle - Optional listing subtitle
 * @param args.categoryName - Optional eBay category name
 */
export function getSoftExclusionReason(args: {
  title: string;
  subtitle?: string | null;
  categoryName?: string | null;
}): SoftExclusionResult {
  const { title, subtitle, categoryName } = args;
  const normalized = normalizeListingText(title, subtitle ?? undefined);
  
  // Also check category name if available
  const normalizedCategory = categoryName 
    ? normalizeListingText(categoryName) 
    : "";
  const searchText = `${normalized} ${normalizedCategory}`.trim();
  
  for (const keyword of SOFT_EXCLUSION_KEYWORDS) {
    const normalizedKeyword = normalizeListingText(keyword);
    
    // Use word boundary matching for single words, substring for phrases
    const isSingleWord = normalizedKeyword.split(" ").length === 1;
    
    let matched = false;
    if (isSingleWord) {
      const regex = new RegExp(`\\b${escapeRegex(normalizedKeyword)}\\b`, "i");
      matched = regex.test(searchText);
    } else {
      matched = searchText.includes(normalizedKeyword);
    }
    
    if (matched) {
      // Check if this is a false positive for legit cards
      if (shouldAllowSoftExclusionMatch(normalized, keyword)) {
        continue;
      }
      
      return {
        excluded: true,
        reason: "non_card_merch",
        hit: keyword,
      };
    }
  }
  
  return { excluded: false };
}

/**
 * Check if a soft exclusion match should be allowed (false positive protection)
 */
function shouldAllowSoftExclusionMatch(normalizedText: string, keyword: string): boolean {
  // "hat" can appear in legitimate contexts - be conservative
  if (keyword === "hat") {
    // Only exclude if clearly merchandise (e.g., "pokemon hat", "pikachu hat")
    // Allow if it's part of card name context
    if (hasRealCardIndicators(normalizedText)) {
      return true;
    }
  }
  
  // "cap" can be part of card terminology
  if (keyword === "cap") {
    if (hasRealCardIndicators(normalizedText)) {
      return true;
    }
  }
  
  // "figure" might appear in "full art figure" style cards - allow if has card indicators
  if (keyword === "figure" || keyword === "figurine") {
    if (hasRealCardIndicators(normalizedText)) {
      return true;
    }
  }
  
  // "bag" can be part of "booster bag" etc - allow if has card indicators
  if (keyword === "bag" || keyword === "tote") {
    if (hasRealCardIndicators(normalizedText)) {
      return true;
    }
  }
  
  return false;
}

// =============================================================================
// COMBINED EXCLUSION HELPER
// =============================================================================

export type ListingExclusionResult = {
  excluded: boolean;
  hardBlocked: boolean;
  softExcluded: boolean;
  reason?: string;
  category?: string;
  hit?: string;
  overrideType?: OverrideType;
  overrideReason?: string;
};

/**
 * Combined helper to check if a listing should be excluded from card-deal surfaces.
 * 
 * This is the single source of truth for all card-deal surfaces:
 * - Homepage featured deals
 * - /top-deals
 * - /ending-soon
 * - /newest
 * - /cards/[cardId] listings
 * 
 * Precedence order:
 * 0. Database override (ALLOW/HARD_BLOCK/SOFT_EXCLUDE) - HIGHEST PRIORITY
 * 1. Hard block (getBlacklistReason) - fake/scam items
 * 2. Soft exclusion (getSoftExclusionReason) - non-card merchandise
 * 
 * @param listing - Listing to check (include listingId for override support)
 * @param card - Optional card context for variant contradiction checks
 */
export async function shouldExcludeListingFromCardSurfaces(
  listing: {
    title: string;
    subtitle?: string | null;
    categoryName?: string | null;
    listingId?: string | null;
  },
  card?: CardContext,
): Promise<ListingExclusionResult> {
  // FIRST: Check database override (highest precedence)
  if (listing.listingId) {
    const override = await checkListingOverride(listing.listingId);
    
    if (override) {
      if (override.override_type === "ALLOW") {
        // ALLOW bypasses all exclusions
        return {
          excluded: false,
          hardBlocked: false,
          softExcluded: false,
          overrideType: "ALLOW",
          overrideReason: override.reason ?? undefined,
        };
      } else if (override.override_type === "HARD_BLOCK") {
        // Force hard block
        return {
          excluded: true,
          hardBlocked: true,
          softExcluded: false,
          reason: override.reason ?? "Manual override",
          category: "override",
          hit: "manual_override",
          overrideType: "HARD_BLOCK",
          overrideReason: override.reason ?? undefined,
        };
      } else if (override.override_type === "SOFT_EXCLUDE") {
        // Force soft exclusion
        return {
          excluded: true,
          hardBlocked: false,
          softExcluded: true,
          reason: override.reason ?? "Manual override",
          category: "override",
          hit: "manual_override",
          overrideType: "SOFT_EXCLUDE",
          overrideReason: override.reason ?? undefined,
        };
      }
    }
  }
  
  // SECOND: check hard block (normal rules)
  const hardBlockResult = getBlacklistReason(
    { title: listing.title, subtitle: listing.subtitle ?? undefined },
    card
  );
  
  if (hardBlockResult.blocked) {
    return {
      excluded: true,
      hardBlocked: true,
      softExcluded: false,
      reason: hardBlockResult.reason,
      category: hardBlockResult.category,
      hit: hardBlockResult.keyword,
    };
  }
  
  // THIRD: check soft exclusion (normal rules)
  const softExclusionResult = getSoftExclusionReason({
    title: listing.title,
    subtitle: listing.subtitle,
    categoryName: listing.categoryName,
  });
  
  if (softExclusionResult.excluded) {
    return {
      excluded: true,
      hardBlocked: false,
      softExcluded: true,
      reason: softExclusionResult.reason,
      category: "non_card_merch",
      hit: softExclusionResult.hit,
    };
  }
  
  return {
    excluded: false,
    hardBlocked: false,
    softExcluded: false,
  };
}

/**
 * Categorize a banned keyword for reporting purposes
 */
function categorizeKeyword(keyword: string): string {
  const k = keyword.toLowerCase();
  
  // Replica/fake
  if (["replica", "repro", "reproduction", "bootleg", "counterfeit", "fake", "proxy", "proxi", "proxies", 
       "carta replica", "replica carta", "falsa", "imitazione", "faux", "contrefacon"].some(x => k.includes(x))) {
    return "replica";
  }
  
  // Materials
  if (["metal", "acrylic", "stainless", "aluminum", "aluminium", "alloy", "brass", "copper", "iron", 
       "steel", "tin", "chrome", "chromium", "etched", "engraved", "plated"].some(x => k.includes(x))) {
    return "non_card_material";
  }
  
  // Display/accessories
  if (["display", "case", "holder", "stand", "frame", "slab", "magnetic", "toploader", "binder", 
       "album", "storage", "sleeve", "protector", "portfolio", "deck box"].some(x => k.includes(x))) {
    return "display_case";
  }
  
  // Art only
  if (["art", "custom", "fan", "handmade", "hand made", "illustration", "poster", "canvas", "print"].some(x => k.includes(x))) {
    return "art_only";
  }
  
  // Lots/bundles/sealed
  if (["lot", "bulk", "bundle", "booster", "sealed", "mystery", "wholesale", "collection lot"].some(x => k.includes(x))) {
    return "not_single_card";
  }
  
  return "other";
}

/**
 * Check if a listing should be allowed despite matching a denylist keyword
 */
function shouldAllowDespiteMatch(
  normalizedText: string,
  category: string,
  keyword: string
): boolean {
  // "alt art" and "alternate art" are legitimate card terms, not "altered art"
  if (keyword === "altered art") {
    if (normalizedText.includes("alt art") || normalizedText.includes("alternate art")) {
      // Check it's not actually "altered"
      if (!normalizedText.includes("altered")) {
        return true;
      }
    }
  }
  
  // "Art card" can be legitimate promo cards
  if (keyword === "art card") {
    // If it has set numbers or grading, it's likely legitimate
    if (hasRealCardIndicators(normalizedText)) {
      return true;
    }
  }
  
  // For graded cards, "acrylic" often refers to a bonus accessory, not the card itself
  // e.g., "PSA 10 + Free Acrylic" or "with acrylic stand"
  if (keyword === "acrylic" && hasGradedIndicators(normalizedText)) {
    // Check if it's an accessory mention
    const acrylicContextPatterns = [
      "free acrylic",
      "+ acrylic",
      "plus acrylic",
      "with acrylic",
      "includes acrylic",
      "bonus acrylic",
      "acrylic stand",
      "acrylic holder",
      "acrylic display",
    ];
    for (const pattern of acrylicContextPatterns) {
      if (normalizedText.includes(pattern)) {
        return true; // Allow graded card with accessory
      }
    }
  }
  
  // For display_case category, check if it's actually a card + case combo
  // Usually still want to block these since they're not pure singles
  
  // For graded items, be more lenient with certain keywords
  if (hasGradedIndicators(normalizedText)) {
    // But still block non-card materials and replicas
    if (category === "replica" || category === "non_card_material") {
      // Unless it's an accessory mention (handled above for acrylic)
      if (keyword !== "acrylic") {
        return false;
      }
    }
    // Allow graded cards that might have "holder" in description
    if (keyword === "card holder" || keyword === "slab holder" || keyword === "slab case") {
      // Only if it looks like it's describing the grading slab
      return true;
    }
  }
  
  return false;
}

/**
 * Check if text contains graded card indicators
 */
function hasGradedIndicators(normalizedText: string): boolean {
  for (const indicator of GRADED_CARD_INDICATORS) {
    if (normalizedText.includes(indicator.toLowerCase())) {
      return true;
    }
  }
  return false;
}

/**
 * Check if text contains real card indicators (set numbers, etc.)
 */
function hasRealCardIndicators(normalizedText: string): boolean {
  for (const pattern of REAL_CARD_INDICATORS) {
    if (pattern instanceof RegExp) {
      if (pattern.test(normalizedText)) {
        return true;
      }
    } else if (normalizedText.includes(pattern.toLowerCase())) {
      return true;
    }
  }
  return false;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// =============================================================================
// EBAY QUERY NEGATIVE KEYWORDS
// =============================================================================

/**
 * Negative keywords to add to eBay search queries
 * These help reduce noise at the API level
 */
export const EBAY_NEGATIVE_KEYWORDS = [
  // Materials
  "-acrylic",
  "-metal",
  "-stainless",
  "-aluminum",
  // Replicas
  "-replica",
  "-\"carta replica\"",
  "-bootleg",
  "-counterfeit",
  // Display/accessories
  "-\"display case\"",
  "-\"display stand\"",
  "-\"art extender\"",
  "-holder",
  "-stand",
  "-frame",
  "-toploader",
  "-binder",
  "-sleeve",
  // Already have these but reinforce
  "-lot",
  "-bundle",
  "-bulk",
  "-proxy",
] as const;

/**
 * Get negative keywords string to append to eBay queries
 */
export function getEbayNegativeKeywordsString(): string {
  return EBAY_NEGATIVE_KEYWORDS.join(" ");
}

// =============================================================================
// BATCH PROCESSING HELPERS
// =============================================================================

export type BlacklistStats = {
  total: number;
  blocked: number;
  byCategory: Record<string, number>;
  topReasons: Array<{ reason: string; count: number }>;
  /** Breakdown of variant_contradiction hits by keyword */
  variantContradictionHits?: Record<string, number>;
};

export type ListingWithCard = {
  id: number | string;
  title: string;
  subtitle?: string;
  card?: CardContext;
};

/**
 * Process a batch of listings and return blocking stats
 * Optionally accepts card context for variant contradiction checks
 */
export function processBlacklistBatch(
  listings: ListingWithCard[]
): {
  allowed: ListingWithCard[];
  blocked: Array<ListingWithCard & BlacklistResult>;
  stats: BlacklistStats;
} {
  const allowed: ListingWithCard[] = [];
  const blocked: Array<ListingWithCard & BlacklistResult> = [];
  const byCategory: Record<string, number> = {};
  const reasonCounts: Record<string, number> = {};
  const variantContradictionHits: Record<string, number> = {};
  
  for (const listing of listings) {
    const result = getBlacklistReason(listing, listing.card);
    
    if (result.blocked) {
      blocked.push({ ...listing, ...result });
      byCategory[result.category ?? "unknown"] = (byCategory[result.category ?? "unknown"] ?? 0) + 1;
      reasonCounts[result.reason ?? "unknown"] = (reasonCounts[result.reason ?? "unknown"] ?? 0) + 1;
      
      // Track variant_contradiction hits separately
      if (result.category === "variant_contradiction" && result.keyword) {
        variantContradictionHits[result.keyword] = (variantContradictionHits[result.keyword] ?? 0) + 1;
      }
    } else {
      allowed.push(listing);
    }
  }
  
  const topReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  
  return {
    allowed,
    blocked,
    stats: {
      total: listings.length,
      blocked: blocked.length,
      byCategory,
      topReasons,
      variantContradictionHits: Object.keys(variantContradictionHits).length > 0 
        ? variantContradictionHits 
        : undefined,
    },
  };
}

/**
 * Print variant_contradiction stats to console
 */
export function printVariantContradictionStats(stats: BlacklistStats): void {
  const vcCount = stats.byCategory["variant_contradiction"] ?? 0;
  console.log(`\n=== Variant Contradiction Stats ===`);
  console.log(`Total blocked by variant_contradiction: ${vcCount}`);
  
  if (stats.variantContradictionHits && Object.keys(stats.variantContradictionHits).length > 0) {
    console.log("\nTop hits:");
    const sorted = Object.entries(stats.variantContradictionHits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    for (const [hit, count] of sorted) {
      console.log(`  ${hit}: ${count}`);
    }
  }
}

// =============================================================================
// COMBINED EXCLUSION STATS (Hard Block + Soft Exclusion)
// =============================================================================

export type CombinedExclusionStats = {
  total: number;
  hardBlocked: number;
  softExcluded: number;
  allowed: number;
  hardBlockByCategory: Record<string, number>;
  softExclusionHits: Record<string, number>;
  /** Sample excluded listings for debugging */
  samples: Array<{
    id: number | string;
    title: string;
    market?: string;
    excluded: "hard" | "soft";
    hit: string;
  }>;
};

export type ListingForExclusion = {
  id: number | string;
  title: string;
  subtitle?: string | null;
  categoryName?: string | null;
  market?: string;
  card?: CardContext;
};

/**
 * Process a batch of listings and return combined exclusion stats
 * Includes both hard blocks and soft exclusions
 */
export async function processCombinedExclusionBatch(
  listings: ListingForExclusion[]
): Promise<{
  allowed: ListingForExclusion[];
  excluded: Array<ListingForExclusion & ListingExclusionResult>;
  stats: CombinedExclusionStats;
}> {
  const allowed: ListingForExclusion[] = [];
  const excluded: Array<ListingForExclusion & ListingExclusionResult> = [];
  const hardBlockByCategory: Record<string, number> = {};
  const softExclusionHits: Record<string, number> = {};
  const samples: CombinedExclusionStats["samples"] = [];
  
  let hardBlocked = 0;
  let softExcluded = 0;
  
  for (const listing of listings) {
    const result = await shouldExcludeListingFromCardSurfaces(
      {
        title: listing.title,
        subtitle: listing.subtitle,
        categoryName: listing.categoryName,
        listingId: String(listing.id),
      },
      listing.card
    );
    
    if (result.excluded) {
      excluded.push({ ...listing, ...result });
      
      if (result.hardBlocked) {
        hardBlocked++;
        hardBlockByCategory[result.category ?? "unknown"] = 
          (hardBlockByCategory[result.category ?? "unknown"] ?? 0) + 1;
        
        // Collect samples (limit to 10 total)
        if (samples.length < 10) {
          samples.push({
            id: listing.id,
            title: listing.title,
            market: listing.market,
            excluded: "hard",
            hit: result.hit ?? "unknown",
          });
        }
      } else if (result.softExcluded) {
        softExcluded++;
        softExclusionHits[result.hit ?? "unknown"] = 
          (softExclusionHits[result.hit ?? "unknown"] ?? 0) + 1;
        
        // Collect samples (limit to 10 total)
        if (samples.length < 10) {
          samples.push({
            id: listing.id,
            title: listing.title,
            market: listing.market,
            excluded: "soft",
            hit: result.hit ?? "unknown",
          });
        }
      }
    } else {
      allowed.push(listing);
    }
  }
  
  return {
    allowed,
    excluded,
    stats: {
      total: listings.length,
      hardBlocked,
      softExcluded,
      allowed: allowed.length,
      hardBlockByCategory,
      softExclusionHits,
      samples,
    },
  };
}

/**
 * Print combined exclusion stats to console
 * Useful for debugging and monitoring
 */
export function printCombinedExclusionStats(stats: CombinedExclusionStats): void {
  console.log(`\n=== Combined Exclusion Stats ===`);
  console.log(`Total listings: ${stats.total}`);
  console.log(`Hard blocked: ${stats.hardBlocked}`);
  console.log(`Soft excluded: ${stats.softExcluded}`);
  console.log(`Allowed: ${stats.allowed}`);
  
  if (Object.keys(stats.hardBlockByCategory).length > 0) {
    console.log("\nHard blocks by category:");
    const sorted = Object.entries(stats.hardBlockByCategory)
      .sort((a, b) => b[1] - a[1]);
    for (const [category, count] of sorted) {
      console.log(`  ${category}: ${count}`);
    }
  }
  
  if (Object.keys(stats.softExclusionHits).length > 0) {
    console.log("\nTop soft exclusion hits:");
    const sorted = Object.entries(stats.softExclusionHits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    for (const [hit, count] of sorted) {
      console.log(`  "${hit}": ${count}`);
    }
  }
  
  if (stats.samples.length > 0) {
    console.log("\nSample excluded listings:");
    for (const sample of stats.samples) {
      const tag = sample.excluded === "hard" ? "[HARD]" : "[SOFT]";
      const market = sample.market ? ` (${sample.market})` : "";
      console.log(`  ${tag} ID ${sample.id}${market}: "${sample.title}" (hit: ${sample.hit})`);
    }
  }
}
