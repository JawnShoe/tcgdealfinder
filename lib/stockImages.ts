/**
 * Stock image resolution for card visuals.
 * Uses PokémonTCG.io catalog images when available with safe fallbacks.
 */

import { query } from "./db";

export type StockImageResult = {
  url: string;
  source: "pokemontcg";
} | null;

// Simple in-memory cache to avoid repeated DB lookups
const imageCache = new Map<string, StockImageResult>();

/**
 * Subset prefix mappings for special set variants.
 * Maps card number prefixes to their corresponding subset set suffixes.
 */
const SUBSET_MAPPINGS: Record<string, string> = {
  'SV': 'Shiny Vault',
  'TG': 'Trainer Gallery',
  'GG': 'Galarian Gallery',
};

/**
 * Extract subset suffix from card number if it matches a known pattern.
 * Returns null if no subset pattern detected.
 */
function getSubsetSuffix(cardNumber: string | null): string | null {
  if (!cardNumber) return null;
  
  const normalized = cardNumber.trim().toUpperCase();
  
  for (const [prefix, suffix] of Object.entries(SUBSET_MAPPINGS)) {
    if (normalized.startsWith(prefix)) {
      return suffix;
    }
  }
  
  return null;
}

/**
 * Normalize card number for matching.
 * Handles formats like "186/196" -> "186", "SV107/SV122" -> "SV107", "TG12" -> "TG12"
 */
function normalizeCardNumber(num: string | null | undefined): string | null {
  if (!num) return null;
  
  let normalized = num.trim();
  
  // If contains slash, take left side only
  if (normalized.includes('/')) {
    normalized = normalized.split('/')[0].trim();
  }
  
  // Uppercase for consistency
  return normalized.toUpperCase();
}

/**
 * Normalize set name for matching.
 * Collapses whitespace and ensures case-insensitive comparison.
 */
function normalizeSetName(name: string | null | undefined): string | null {
  if (!name) return null;
  
  return name
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .toLowerCase();
}

/**
 * Normalize card name for matching.
 * Strips common variant suffixes like "Alt Art", "Full Art", "Rainbow Rare", etc.
 * This allows "Lugia V Alt Art" to match "Lugia V" in the catalog.
 */
function normalizeCardName(name: string | null | undefined): string | null {
  if (!name) return null;
  
  let normalized = name.trim();
  
  // Remove common variant suffixes (case-insensitive)
  const suffixes = [
    ' Alt Art',
    ' Full Art', 
    ' Rainbow Rare',
    ' Secret Rare',
    ' Hyper Rare',
    ' Ultra Rare',
    ' Promo',
    ' Radiant',
    ' Shiny'
  ];
  
  for (const suffix of suffixes) {
    const pattern = new RegExp(suffix + '$', 'i');
    normalized = normalized.replace(pattern, '');
  }
  
  return normalized.trim();
}

/**
 * Get the stock image URL for a card using normalized matching.
 * Uses a safe lookup by normalized set name + card name + normalized number.
 * Returns null if no confident match exists.
 */
export async function getCardStockImageUrl(card: {
  name: string | null;
  setName: string | null;
  cardNumber?: string | null;
}): Promise<StockImageResult> {
  if (!card.name || !card.setName) {
    return null;
  }

  const normalizedSetName = normalizeSetName(card.setName);
  const normalizedNumber = normalizeCardNumber(card.cardNumber);
  const normalizedCardName = normalizeCardName(card.name);
  const subsetSuffix = getSubsetSuffix(normalizedNumber);
  
  const cacheKey = `${normalizedSetName}|${card.name}|${normalizedNumber ?? ""}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey) ?? null;
  }

  try {
    // Query catalog_cards via catalog_sets for the stock image
    // Use normalized matching for set name, card name, and card number
    // Handle subset variants (e.g., "Shining Fates" + SV prefix → "Shining Fates Shiny Vault")
    const setCondition = subsetSuffix 
      ? `(LOWER(REGEXP_REPLACE(cs.name, '\\s+', ' ', 'g')) = $1 OR LOWER(REGEXP_REPLACE(cs.name, '\\s+', ' ', 'g')) = $1 || ' ' || LOWER($4))`
      : `LOWER(REGEXP_REPLACE(cs.name, '\\s+', ' ', 'g')) = $1`;
    
    const params: (string | null)[] = [normalizedSetName, normalizedCardName];
    if (normalizedNumber) {
      params.push(normalizedNumber);
    }
    if (subsetSuffix) {
      params.push(subsetSuffix.toLowerCase());
    }
    
    const result = await query<{ image_url: string; match_count: string }>(
      `
      SELECT 
        cc.image_url,
        COUNT(*) OVER () as match_count
      FROM catalog_cards cc
      JOIN catalog_sets cs ON cs.id = cc.catalog_set_id
      WHERE 
        ${setCondition}
        AND cc.name ILIKE $2
        ${normalizedNumber ? "AND UPPER(SPLIT_PART(cc.number, '/', 1)) = $3" : ""}
        AND cc.image_url IS NOT NULL
      LIMIT 2
      `,
      params
    );

    if (result.rows.length === 0) {
      imageCache.set(cacheKey, null);
      return null;
    }

    // Only use if we have exactly one match (no variant ambiguity)
    const matchCount = parseInt(result.rows[0].match_count, 10);
    if (matchCount > 1 && !normalizedNumber) {
      // Multiple matches without card number = ambiguous, fallback
      imageCache.set(cacheKey, null);
      return null;
    }

    const imageResult: StockImageResult = {
      url: result.rows[0].image_url,
      source: "pokemontcg",
    };
    imageCache.set(cacheKey, imageResult);
    return imageResult;
  } catch (error) {
    // On error, fail gracefully
    console.error("Failed to fetch stock image:", error);
    imageCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Batch fetch stock images for multiple cards using normalized matching.
 * More efficient than individual lookups when loading a page with many cards.
 */
export async function getCardStockImageUrls(cards: Array<{
  cardId: number;
  name: string | null;
  setName: string | null;
  cardNumber?: string | null;
}>): Promise<Map<number, StockImageResult>> {
  const results = new Map<number, StockImageResult>();
  
  // Filter out cards without required data and normalize
  const validCards = cards
    .filter(c => c.name && c.setName)
    .map(c => ({
      ...c,
      normalizedSetName: normalizeSetName(c.setName),
      normalizedCardName: normalizeCardName(c.name),
      normalizedNumber: normalizeCardNumber(c.cardNumber),
      subsetSuffix: getSubsetSuffix(c.cardNumber),
    }));
    
  if (validCards.length === 0) {
    return results;
  }

  try {
    // Build a query that matches all cards at once with normalized matching
    // Handle subset variants for each card
    const cardConditions = validCards.map((card, i) => {
      const setParam = i * 4 + 1;
      const nameParam = i * 4 + 2;
      const numParam = i * 4 + 3;
      const subsetParam = i * 4 + 4;
      
      const numCondition = card.normalizedNumber 
        ? `AND UPPER(SPLIT_PART(cc.number, '/', 1)) = $${numParam}` 
        : "";
      
      const setCondition = card.subsetSuffix
        ? `(LOWER(REGEXP_REPLACE(cs.name, '\\s+', ' ', 'g')) = $${setParam} OR LOWER(REGEXP_REPLACE(cs.name, '\\s+', ' ', 'g')) = $${setParam} || ' ' || LOWER($${subsetParam}))`
        : `LOWER(REGEXP_REPLACE(cs.name, '\\s+', ' ', 'g')) = $${setParam}`;
      
      return `(${setCondition} AND cc.name ILIKE $${nameParam} ${numCondition})`;
    }).join(" OR ");

    const params: (string | null)[] = [];
    for (const card of validCards) {
      params.push(
        card.normalizedSetName, 
        card.normalizedCardName, 
        card.normalizedNumber ?? null,
        card.subsetSuffix ? card.subsetSuffix.toLowerCase() : null
      );
    }

    const result = await query<{ 
      set_name: string; 
      card_name: string; 
      card_number: string | null;
      image_url: string;
    }>(
      `
      WITH matches AS (
        SELECT 
          LOWER(REGEXP_REPLACE(cs.name, '\\s+', ' ', 'g')) as normalized_set_name,
          cs.name as set_name,
          cc.name as card_name,
          cc.number as card_number,
          cc.image_url,
          COUNT(*) OVER (PARTITION BY cs.name, cc.name) as name_matches
        FROM catalog_cards cc
        JOIN catalog_sets cs ON cs.id = cc.catalog_set_id
        WHERE (${cardConditions})
          AND cc.image_url IS NOT NULL
      )
      SELECT set_name, card_name, card_number, image_url
      FROM matches
      WHERE name_matches = 1 OR card_number IS NOT NULL
      `,
      params
    );

    // Build a lookup map from the results using normalized keys
    const imageMap = new Map<string, string>();
    for (const row of result.rows) {
      const normalizedSetName = normalizeSetName(row.set_name);
      const normalizedNumber = normalizeCardNumber(row.card_number);
      const key = `${normalizedSetName}|${row.card_name.toLowerCase()}|${normalizedNumber ?? ""}`;
      imageMap.set(key, row.image_url);
    }

    // Map back to card IDs using normalized keys
    for (const card of validCards) {
      const key = `${card.normalizedSetName}|${card.name!.toLowerCase()}|${card.normalizedNumber ?? ""}`;
      const url = imageMap.get(key);
      if (url) {
        results.set(card.cardId, { url, source: "pokemontcg" });
      }
    }
  } catch (error) {
    console.error("Failed to batch fetch stock images:", error);
  }

  return results;
}

/**
 * Attribution text for PokémonTCG.io image usage.
 */
export const TCGPLAYER_ATTRIBUTION = "Card images via Pokémon TCG API";
