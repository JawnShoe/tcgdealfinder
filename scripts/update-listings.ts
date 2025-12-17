import { pathToFileURL } from "url";

import { query } from "../lib/db";
import {
  fetchEbayListings,
  NormalizedListing,
  normalizeCondition,
  fetchEbayItemDetail,
  type EbayItemDetail,
  findBannedTitleKeyword,
} from "../lib/ebay";
import { computeDiscountPercent } from "../lib/pricing";
import {
  extractCollectorNumber,
  normalizeCollectorNumber,
  shouldRejectCollectorNumber,
  type CollectorNumberConfidence,
  type CollectorNumberResult,
} from "../lib/collectorNumber";
import {
  DEFAULT_MARKET,
  getExpectedCurrency,
  type MarketCode,
  normalizeMarketCode,
  SUPPORTED_MARKETS,
} from "../lib/markets";
import {
  ensureListingsIntegrityColumns,
  LISTINGS_INTEGRITY_MISSING_MESSAGE,
} from "../lib/schema";
import { fetchStorefrontInfo } from "../lib/ebayStorefront";

type SearchConfigRow = {
  card_id: number;
  name: string;
  set_name: string;
  card_number: string;
  collector_number_raw: string | null;
  collector_number_norm: string | null;
  collector_number_confidence: CollectorNumberConfidence | null;
  condition_bucket: string;
  search_query: string;
  market: string;
};

const AUTO_BLACKLIST_MIN_TOTAL = 20;
const AUTO_BLACKLIST_MIN_RATIO = 0.7;
const cardIdCache = new Map<string, number>();
const GRADE_SUFFIX: Record<string, string> = {
  psa_10: `"PSA 10"`,
  psa_9: `"PSA 9"`,
  bgs_10: `"BGS 10"`,
  bgs_95: `"BGS 9.5"`,
  bgs_9: `"BGS 9"`,
  cgc_10: `"CGC 10"`,
  cgc_95: `"CGC 9.5"`,
  cgc_9: `"CGC 9"`,
};
const detailCache = new Map<string, Promise<EbayItemDetail | null>>();
const detailSemaphore = createSemaphore(5);

const ACCESSORY_PHRASES = {
  hard: [
    "card not included",
    "no card included",
    "case only",
    "empty case",
  ],
  contextual: [
    "toploader",
    "top loader",
    "binder",
    "sleeves",
    "deck box",
    "playmat",
    "display stand",
    "card case",
  ],
};
const ACCESSORY_CONTEXT = [
  "case",
  "holder",
  "storage",
  "accessory",
  "not included",
];

export function detectMarketCurrencyMismatch(
  listingCurrency: string | null | undefined,
  market: MarketCode,
): string | null {
  if (!listingCurrency) return null;
  const normalized = listingCurrency.toUpperCase();
  const expected = getExpectedCurrency(market);
  if (normalized === expected) {
    return null;
  }
  return `market=${market} expected=${expected} price=${normalized}`;
}

type GradeInfo = {
  grader: string | null;
  gradeValue: string | null;
  bucket: string | null;
  source: "specifics" | "title" | "none";
};

type IntegrityStatus = "OK" | "REVIEW";

type IntegrityResult = {
  status: IntegrityStatus;
  reason: string | null;
  score: number | null;
};

function isGradedBucketName(bucket: string | null | undefined): boolean {
  if (!bucket) return false;
  const normalized = bucket.toLowerCase();
  return (
    normalized.startsWith("psa_") ||
    normalized.startsWith("bgs_") ||
    normalized.startsWith("cgc_")
  );
}

function isRawBucket(bucket: string | null | undefined): boolean {
  if (!bucket) return false;
  return bucket.toLowerCase().startsWith("raw");
}

function computeIntegrityStatus(options: {
  conditionBucket: string | null | undefined;
  totalPriceCad: number | null;
  totalPriceUsd: number | null;
  historicPriceCad: number | null;
}): IntegrityResult {
  const { conditionBucket, totalPriceCad, totalPriceUsd, historicPriceCad } =
    options;
  let status: IntegrityStatus = "OK";
  let reason: string | null = null;
  let score: number | null = null;

  const comparablePrice =
    totalPriceUsd ?? totalPriceCad ?? null;
  const comparableHistoric = historicPriceCad ?? null;

  const eligibleForFloorCheck =
    comparablePrice != null &&
    comparablePrice > 0 &&
    comparableHistoric != null &&
    comparableHistoric > 0 &&
    !isGradedBucketName(conditionBucket) &&
    isRawBucket(conditionBucket);

  if (eligibleForFloorCheck) {
    const ratio = comparablePrice! / comparableHistoric!;
    if (ratio < 0.35) {
      status = "REVIEW";
      reason = "price_floor_violation";
      score = Math.round(ratio * 100);
    }
  }

  return { status, reason, score };
}

export function decideCollectorNumberRejection(
  cardCollector: CollectorNumberResult,
  listingCollector: CollectorNumberResult,
): {
  matchEligible: boolean;
  rejectReason: string | null;
  rejectSource: string | null;
  rejectDetail: string | null;
} {
  const decision = shouldRejectCollectorNumber(cardCollector, listingCollector);
  if (decision.reject) {
    return {
      matchEligible: false,
      rejectReason: "collector_number_mismatch",
      rejectSource: "collector_number_check",
      rejectDetail: decision.detail ?? null,
    };
  }
  return {
    matchEligible: true,
    rejectReason: null,
    rejectSource: null,
    rejectDetail: null,
  };
}

async function getBlacklistedSellers(): Promise<Set<string>> {
  const res = await query<{ seller_username: string }>(
    `
      SELECT seller_username
      FROM seller_blacklist;
    `,
  );
  const set = new Set<string>();
  for (const row of res.rows) {
    if (row.seller_username) {
      set.add(row.seller_username.toLowerCase());
    }
  }
  return set;
}

async function logRejectedListing(
  listing: NormalizedListing,
  reason: string,
  detail?: string | null,
): Promise<void> {
  const sellerUsername =
    listing.sellerUsername ?? listing.seller?.toLowerCase() ?? null;

  await query(
    `
      INSERT INTO rejected_listings (
        ebay_item_id,
        seller_username,
        title,
        reason
      )
      VALUES ($1, $2, $3, $4);
    `,
    [
      listing.listingId ?? null,
      sellerUsername,
      listing.title,
      detail ? `${reason} (${detail})` : reason,
    ],
  );
}

async function upsertListing(
  cardId: number,
  market: MarketCode,
  conditionBucket: string,
  listing: NormalizedListing,
  sellerUsername: string | null,
  historicPriceCad: number | null,
  gradeInfo: GradeInfo,
  matchEligible: boolean,
  rejectReason: string | null,
  rejectSource: string | null,
  rejectDetail: string | null,
  collectorNumberRaw: string | null,
  collectorNumberNorm: string | null,
  collectorNumberConfidence: CollectorNumberConfidence,
  collectorNumberSignals: string[],
  detectedCollectorNumber: string | null,
  detectedLanguage: string,
  shippingKnown: boolean,
  shippingSource: string | null,
) {
  // Import FX conversion here to avoid circular deps
  const { convertToUSD } = await import("../lib/fxRates");
  const { getExpectedCurrency } = await import("../lib/markets");
  
  const priceCad =
    listing.priceCad ??
    (listing as any).price ??
    null;
  const shippingCad =
    listing.shippingCad ??
    (listing as any).shipping ??
    null;
  let totalPriceCad =
    listing.totalPriceCad ??
    (listing as any).total ??
    null;
  const thumbnailUrl = listing.imageUrl ?? null;

  if (!shippingKnown) {
    totalPriceCad = null;
  } else if (totalPriceCad == null && priceCad != null && shippingCad != null) {
    totalPriceCad = priceCad + shippingCad;
  }
  
  // Currency handling: Extract from listing or use market default
  const currency = (listing.priceCurrency ?? getExpectedCurrency(market)).toUpperCase();
  
  // Convert to USD for sorting/comparison
  const priceNative = priceCad;
  const shippingNative = shippingCad;
  const totalNative = totalPriceCad;
  
  const conversionResult = await convertToUSD(totalNative, currency);
  const totalUsd = conversionResult?.usd ?? null;
  const fxRateToUsd = conversionResult?.rate ?? null;
  
  if (totalNative != null && totalUsd == null) {
    // Skip this listing if we can't convert to USD (missing FX rate)
    console.warn(`⚠️  Skipping listing ${listing.listingId}: No FX rate for ${currency}`);
    return;
  }

  const normalizedCondition =
    normalizeCondition(listing.conditionRaw) ??
    normalizeCondition(conditionBucket) ??
    conditionBucket;

  const effectiveHistoricPrice = matchEligible ? historicPriceCad : null;
  const normalizedDiscount = matchEligible
    ? computeDiscountPercent(totalPriceCad, effectiveHistoricPrice)
    : null;
  const sellerFeedbackCount =
    listing.sellerFeedbackCount ?? null;
  const sellerPositivePercent =
    listing.sellerPositivePercent ?? null;
  let sellerStoreName = listing.sellerStoreName ?? null;
  let sellerStoreNameSource: string | null = null;
  let sellerStoreNameCheckedAt: Date | null = null;

  if (!sellerStoreName) {
    try {
      const storefront = await fetchStorefrontInfo(
        listing.listingId,
        market as MarketCode,
        sellerUsername,
      );
      if (storefront?.storeName) {
        sellerStoreName = storefront.storeName;
        sellerStoreNameSource = storefront.source;
        sellerStoreNameCheckedAt = new Date();
      }
    } catch (error) {
      console.error(
        `[storefront] Failed to enrich ${listing.listingId}: ${
          (error as Error).message
        }`,
      );
    }
  }
  const integrity = computeIntegrityStatus({
    conditionBucket: normalizedCondition,
    totalPriceCad,
    totalPriceUsd: totalUsd,
    historicPriceCad: effectiveHistoricPrice,
  });

  await query(
    `
    INSERT INTO listings (
      card_id,
      source,
      listing_id,
      title,
      url,
      image_url,
      thumbnail_url,
      price_cad,
      shipping_cad,
      total_price_cad,
      currency,
      price_native,
      shipping_native,
      total_native,
      fx_rate_to_usd,
      total_usd,
      shipping_known,
      shipping_source,
      seller,
      seller_username,
      seller_store_name,
      seller_store_name_source,
      seller_store_name_last_checked_at,
      seller_feedback_count,
      seller_positive_percent,
      condition_raw,
      grader,
      grade_value,
      grade_source,
      market,
      ends_at,
      historic_price_cad,
      discount_percent,
      match_eligible,
      match_reject_reason,
      reject_source,
      detected_collector_number,
      detected_language,
      integrity_status,
      integrity_reason,
      integrity_score,
      created_at,
      updated_at
    )
    VALUES (
      $1,  -- card_id
      'EBAY', -- source
      $2,  -- listing_id
      $3,  -- title
      $4,  -- url
      $5,  -- image_url
      $6,  -- thumbnail_url
      $7,  -- price_cad (keep for backward compat)
      $8,  -- shipping_cad (keep for backward compat)
      $9,  -- total_price_cad (keep for backward compat)
      $10, -- currency
      $11, -- price_native
      $12, -- shipping_native
      $13, -- total_native
      $14, -- fx_rate_to_usd
      $15, -- total_usd
      $16, -- shipping_known
      $17, -- shipping_source
      $18, -- seller
      $19, -- seller_username
      $20, -- seller_store_name
      $21, -- seller_store_name_source
      $22, -- seller_store_name_last_checked_at
      $23, -- seller_feedback_count
      $24, -- seller_positive_percent
      $25, -- condition_raw
      $26, -- grader
      $27, -- grade_value
      $28, -- grade_source
      $29, -- market
      $30, -- ends_at
      $31, -- historic_price_cad
      $32, -- discount_percent
      $33, -- match_eligible
      $34, -- match_reject_reason
      $35, -- reject_source
      $36, -- detected_collector_number
      $37, -- detected_language
      $38, -- integrity_status
      $39, -- integrity_reason
      $40, -- integrity_score
      NOW(),
      NOW()
    )
    ON CONFLICT (listing_id, market) DO UPDATE SET
      card_id = EXCLUDED.card_id,
      title = EXCLUDED.title,
      url = EXCLUDED.url,
      image_url = EXCLUDED.image_url,
      thumbnail_url = EXCLUDED.thumbnail_url,
      price_cad = EXCLUDED.price_cad,
      shipping_cad = EXCLUDED.shipping_cad,
      total_price_cad = EXCLUDED.total_price_cad,
      currency = EXCLUDED.currency,
      price_native = EXCLUDED.price_native,
      shipping_native = EXCLUDED.shipping_native,
      total_native = EXCLUDED.total_native,
      fx_rate_to_usd = EXCLUDED.fx_rate_to_usd,
      total_usd = EXCLUDED.total_usd,
      shipping_known = EXCLUDED.shipping_known,
      shipping_source = EXCLUDED.shipping_source,
      seller = EXCLUDED.seller,
      seller_username = EXCLUDED.seller_username,
      seller_store_name = COALESCE(
        EXCLUDED.seller_store_name,
        listings.seller_store_name
      ),
      seller_store_name_source = CASE
        WHEN EXCLUDED.seller_store_name IS NOT NULL THEN EXCLUDED.seller_store_name_source
        ELSE listings.seller_store_name_source
      END,
      seller_store_name_last_checked_at = COALESCE(
        EXCLUDED.seller_store_name_last_checked_at,
        listings.seller_store_name_last_checked_at
      ),
      seller_feedback_count = EXCLUDED.seller_feedback_count,
      seller_positive_percent = EXCLUDED.seller_positive_percent,
      condition_raw = EXCLUDED.condition_raw,
      grader = EXCLUDED.grader,
      grade_value = EXCLUDED.grade_value,
      grade_source = EXCLUDED.grade_source,
      market = EXCLUDED.market,
      ends_at = EXCLUDED.ends_at,
      historic_price_cad = EXCLUDED.historic_price_cad,
      discount_percent = EXCLUDED.discount_percent,
      match_eligible = EXCLUDED.match_eligible,
      match_reject_reason = EXCLUDED.match_reject_reason,
      reject_source = EXCLUDED.reject_source,
      detected_collector_number = EXCLUDED.detected_collector_number,
      detected_language = EXCLUDED.detected_language,
      integrity_status = EXCLUDED.integrity_status,
      integrity_reason = EXCLUDED.integrity_reason,
      integrity_score = EXCLUDED.integrity_score,
      updated_at = NOW();
  `,
    [
      cardId,
      listing.listingId,
      listing.title,
      listing.url,
      listing.imageUrl ?? null,
      thumbnailUrl,
      priceCad,
      shippingCad,
      totalPriceCad,
      currency,
      priceNative,
      shippingNative,
      totalNative,
      fxRateToUsd,
      totalUsd,
      shippingKnown,
      shippingSource,
      listing.seller ?? null,
      sellerUsername,
      sellerStoreName ?? null,
      sellerStoreNameSource ?? null,
      sellerStoreNameCheckedAt,
      sellerFeedbackCount,
      sellerPositivePercent,
      normalizedCondition,
      gradeInfo.grader,
      gradeInfo.gradeValue,
      gradeInfo.source,
      market,
      listing.endsAt ?? null,
      effectiveHistoricPrice,
      normalizedDiscount,
      matchEligible,
      rejectReason,
      rejectSource,
      detectedCollectorNumber,
      detectedLanguage,
      integrity.status,
      integrity.reason,
      integrity.score,
    ],
  );
}

async function getHistoricalPrice(
  cardId: number,
  market: MarketCode,
): Promise<number | null> {
  // TODO: historical_prices needs market column migration
  // For now, use US-only historical prices
  const res = await query<{ median_price_cad: string }>(
    `
      SELECT median_price_cad
      FROM historical_prices
      WHERE card_id = $1
      LIMIT 1;
    `,
    [cardId],
  );

  const value = res.rows[0]?.median_price_cad;
  return value !== undefined && value !== null ? Number(value) : null;
}

async function main() {
  const hasIntegrityColumns = await ensureListingsIntegrityColumns();
  if (!hasIntegrityColumns) {
    throw new Error(LISTINGS_INTEGRITY_MISSING_MESSAGE);
  }
  console.log("Starting listings update...");
  const blacklistedSellers = await getBlacklistedSellers();
  console.log(
    `Loaded ${blacklistedSellers.size} blacklisted seller(s) into memory.`,
  );
  let accessoryRejects = 0;

  const res = await query<SearchConfigRow>(
    `
    SELECT
      c.id AS card_id,
      c.name,
      c.set_name,
      c.card_number,
      NULL::TEXT AS collector_number_raw,
      NULL::TEXT AS collector_number_norm,
      NULL::TEXT AS collector_number_confidence,
      c.condition_bucket,
      cfg.search_query,
      cfg.market
    FROM card_search_config cfg
    JOIN cards c ON c.id = cfg.card_id
    WHERE cfg.is_active = TRUE;
  `,
  );

  const rows = res.rows;

  if (rows.length === 0) {
    console.log("No active search configs found.");
    return;
  }

  for (const row of rows) {
    console.log(
      `\nProcessing card: ${row.name} (${row.condition_bucket}), query="${row.search_query}"`,
    );

    // Loop through all markets for each search config
    for (const marketCode of SUPPORTED_MARKETS) {
      const market = normalizeMarketCode(marketCode);
      console.log(`  → Fetching ${market} listings...`);
      
      const historicPrice = await getHistoricalPrice(row.card_id, market);
      if (historicPrice !== null) {
        console.log(
          `    Historic price: $${historicPrice.toFixed(2)}`,
        );
      }
      
      const listings = await fetchEbayListings(
        row.search_query,
        market,
      );

      console.log(
        `    Found ${listings.length} listings`,
      );

      let updatedCount = 0;
      const sellerStats = new Map<
        string,
        { total: number; invalid: number }
      >();

    for (const listing of listings) {
      const sellerUsername =
        listing.sellerUsername ??
        listing.seller?.toLowerCase() ??
        null;
      const gradeInfo = await resolveGradeInfo(listing, market);
      const inferredBucket = inferConditionBucket(
        listing,
        row.condition_bucket,
        gradeInfo,
      );
      const targetCardId = await getCardIdForBucket(row, inferredBucket);
      const cardCollector: CollectorNumberResult = {
        raw: row.collector_number_raw ?? row.card_number ?? null,
        norm:
          row.collector_number_norm ??
          normalizeCollectorNumber(row.card_number ?? null),
        confidence:
          row.collector_number_confidence ??
          (row.card_number ? "HIGH" : "NONE"),
        signals: row.collector_number_norm ? ["catalog"] : [],
      };

      const bannedKeyword = findBannedTitleKeyword(listing.title ?? "");
      let listingCollector = extractCollectorNumber({
        title: listing.title ?? "",
        aspects: listing.localizedAspects ?? [],
      });
      if (
        listingCollector.confidence === "NONE" ||
        listingCollector.confidence === "LOW"
      ) {
        const detail = await getListingDetail(listing.listingId, market);
        const mergedAspects = [
          ...(listing.localizedAspects ?? []),
          ...(detail?.localizedAspects ?? []),
        ];
        if (mergedAspects.length > (listing.localizedAspects?.length ?? 0)) {
          listingCollector = extractCollectorNumber({
            title: listing.title ?? "",
            aspects: mergedAspects,
          });
        }
      }
      const detectedCollectorNumber = listingCollector.norm;
      const detectedLanguage = detectListingLanguage(listing.title ?? "");
      const shippingKnownFlag =
        listing.shippingKnown ?? (listing.shippingCad != null);
      const shippingSource = listing.shippingSource ?? null;

      let matchEligible = true;
      let rejectReason: string | null = null;
      let rejectSource: string | null = null;
      let rejectDetail: string | null = null;

      if (bannedKeyword) {
        matchEligible = false;
        rejectReason = `title_keyword:${bannedKeyword}`;
        rejectSource = "title_filter";
      }

      if (matchEligible) {
        const accessoryPhrase = detectAccessoryPhrase(listing.title ?? "");
        if (accessoryPhrase) {
          matchEligible = false;
          rejectReason = "accessory_not_card";
          rejectSource = `title_accessory:${accessoryPhrase}`;
          accessoryRejects += 1;
        }
      }

      if (matchEligible) {
        const currencyDetail = detectMarketCurrencyMismatch(
          listing.priceCurrency ?? null,
          market,
        );
        if (currencyDetail) {
          matchEligible = false;
          rejectReason = "market_currency_mismatch";
          rejectSource = "currency_guard";
          rejectDetail = currencyDetail;
        }
      }

      if (matchEligible && detectedLanguage === "jp") {
        matchEligible = false;
        rejectReason = "language_mismatch";
        rejectSource = "language_filter";
      } else if (matchEligible) {
        const cnOutcome = decideCollectorNumberRejection(
          cardCollector,
          listingCollector,
        );
        if (!cnOutcome.matchEligible) {
          matchEligible = false;
          rejectReason = cnOutcome.rejectReason;
          rejectSource = cnOutcome.rejectSource;
          rejectDetail = cnOutcome.rejectDetail;
        }
      } else if (sellerUsername && blacklistedSellers.has(sellerUsername)) {
        matchEligible = false;
        rejectReason = "seller_blacklisted";
        rejectSource = "seller_filter";
      }

      if (sellerUsername) {
        const stats =
          sellerStats.get(sellerUsername) ?? { total: 0, invalid: 0 };
        stats.total += 1;
        sellerStats.set(sellerUsername, stats);
      }

      try {
        await upsertListing(
          targetCardId,
          market,
          inferredBucket,
          listing,
          sellerUsername,
          historicPrice,
          gradeInfo,
          matchEligible,
          rejectReason,
          rejectSource,
          rejectDetail,
          listingCollector.raw,
          listingCollector.norm,
          listingCollector.confidence,
          listingCollector.signals,
          detectedCollectorNumber,
          detectedLanguage,
          shippingKnownFlag,
          shippingSource,
        );
        if (matchEligible) {
          updatedCount += 1;
        }
      } catch (err) {
        console.error(
          `Failed to upsert listing ${listing.listingId} for ${row.name}:`,
          err,
        );
        continue;
      }

      if (!matchEligible) {
        await logRejectedListing(
          listing,
          rejectReason ?? "match_rejected_unknown",
          rejectDetail,
        );
        if (
          sellerUsername &&
          rejectReason !== "seller_blacklisted"
        ) {
          const stats =
            sellerStats.get(sellerUsername) ?? { total: 0, invalid: 0 };
          stats.invalid += 1;
          sellerStats.set(sellerUsername, stats);
        }
        continue;
      }
    }

      for (const [sellerUsername, stats] of sellerStats) {
        if (
          stats.total >= AUTO_BLACKLIST_MIN_TOTAL &&
          stats.invalid / stats.total >= AUTO_BLACKLIST_MIN_RATIO
        ) {
          await query(
            `
              INSERT INTO seller_blacklist (seller_username)
              VALUES ($1)
              ON CONFLICT (seller_username) DO NOTHING;
            `,
            [sellerUsername],
          );
          if (!blacklistedSellers.has(sellerUsername)) {
            blacklistedSellers.add(sellerUsername);
            console.log(
              `    Auto-blacklisted seller ${sellerUsername}: ${stats.invalid}/${stats.total} listings invalid.`,
            );
          }
        }
      }

      console.log(
        `    ✅ ${market}: Updated ${updatedCount} listings`,
      );
    } // End markets loop
  } // End rows loop

  console.log("Listing update complete.");
  if (accessoryRejects > 0) {
    console.log(
      `[debug] accessory_not_card rejections this run: ${accessoryRejects}`,
    );
  }
}

const isCliExecution = (() => {
  if (typeof process === "undefined" || !process.argv?.[1]) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();

if (isCliExecution) {
  main().catch((err) => {
    console.error("Error running listings update:", err);
  });
}

function inferConditionBucket(
  listing: NormalizedListing,
  defaultBucket: string,
  gradeInfo: GradeInfo,
): string {
  if (gradeInfo.bucket) {
    return gradeInfo.bucket;
  }
  const fallback = fallbackGradedBucketFromText(listing);
  if (fallback) {
    return fallback;
  }
  return defaultBucket;
}

function fallbackGradedBucketFromText(listing: NormalizedListing): string | null {
  const text = `${listing.title ?? ""} ${listing.conditionRaw ?? ""}`
    .toLowerCase()
    .trim();

  const patterns: { regex: RegExp; bucket: string }[] = [
    { regex: /\bpsa\s*10\b|\bpsa10\b/i, bucket: "psa_10" },
    { regex: /\bpsa\s*9\b|\bpsa9\b/i, bucket: "psa_9" },
    { regex: /\bbgs\s*10\b|\bbeckett\s*10\b/i, bucket: "bgs_10" },
    { regex: /\bbgs\s*9\.?5\b|\bbeckett\s*9\.?5\b/i, bucket: "bgs_95" },
    { regex: /\bbgs\s*9\b|\bbeckett\s*9\b/i, bucket: "bgs_9" },
    { regex: /\bcgc\s*10\b/i, bucket: "cgc_10" },
    { regex: /\bcgc\s*9\.?5\b/i, bucket: "cgc_95" },
    { regex: /\bcgc\s*9\b/i, bucket: "cgc_9" },
  ];

  for (const { regex, bucket } of patterns) {
    if (regex.test(text)) {
      return bucket;
    }
  }

  return null;
}

async function getCardIdForBucket(
  base: SearchConfigRow,
  targetBucket: string,
): Promise<number> {
  if (targetBucket === base.condition_bucket) {
    await ensureSearchConfig(base.card_id, base, targetBucket);
    return base.card_id;
  }

  const cacheKey = `${base.name}|${base.set_name}|${base.card_number}|${targetBucket}`;
  const cached = cardIdCache.get(cacheKey);
  if (cached) {
    await ensureSearchConfig(cached, base, targetBucket);
    return cached;
  }

  const existing = await query<{ id: number }>(
    `
      SELECT id
      FROM cards
      WHERE name = $1 AND set_name = $2 AND card_number = $3 AND condition_bucket = $4
      LIMIT 1;
    `,
    [base.name, base.set_name, base.card_number, targetBucket],
  );

  if (existing.rows[0]) {
    cardIdCache.set(cacheKey, existing.rows[0].id);
    await ensureSearchConfig(existing.rows[0].id, base, targetBucket);
    return existing.rows[0].id;
  }

  const inserted = await query<{ id: number }>(
    `
      INSERT INTO cards (name, set_name, card_number, condition_bucket)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (name, set_name, card_number, condition_bucket)
      DO UPDATE SET updated_at = NOW()
      RETURNING id;
    `,
    [base.name, base.set_name, base.card_number, targetBucket],
  );

  const newId = inserted.rows[0].id;
  cardIdCache.set(cacheKey, newId);
  await ensureSearchConfig(newId, base, targetBucket);
  return newId;
}

async function ensureSearchConfig(
  cardId: number,
  base: SearchConfigRow,
  bucket: string,
): Promise<void> {
  const derivedQuery = deriveSearchQuery(base.search_query, bucket);
  await query(
    `
      INSERT INTO card_search_config (card_id, search_query, market, is_active)
      VALUES ($1, $2, $3, TRUE)
      ON CONFLICT (card_id, search_query, market) DO NOTHING;
    `,
    [cardId, derivedQuery, base.market],
  );
}

function deriveSearchQuery(baseQuery: string, bucket: string): string {
  const suffix = GRADE_SUFFIX[bucket];
  if (!suffix) {
    return baseQuery;
  }
  if (baseQuery.toLowerCase().includes(suffix.replace(/"/g, "").toLowerCase())) {
    return baseQuery;
  }
  return `${baseQuery} ${suffix}`;
}

async function resolveGradeInfo(
  listing: NormalizedListing,
  market: string,
): Promise<GradeInfo> {
  const empty: GradeInfo = {
    grader: null,
    gradeValue: null,
    bucket: null,
    source: "none",
  };
  const fromTitle = detectGradeFromTitle(listing.title ?? "");
  if (!isGradedCandidate(listing)) {
    return fromTitle ?? empty;
  }

  const detail = await getListingDetail(listing.listingId, market);
  const structured = extractGradeFromDetail(detail);
  if (structured) {
    return structured;
  }
  return fromTitle ?? empty;
}

function isGradedCandidate(listing: NormalizedListing): boolean {
  if ((listing.conditionRaw ?? "").toLowerCase().includes("graded")) {
    return true;
  }
  const title = listing.title?.toLowerCase() ?? "";
  return /\b(psa|bgs|beckett|cgc)\b/.test(title);
}

function detectGradeFromTitle(title: string): GradeInfo | null {
  const patterns: Array<{
    regex: RegExp;
    grader: string;
    gradeValue: string;
    bucket: string;
  }> = [
    { regex: /\bpsa\s*10\b|\bpsa10\b/i, grader: "PSA", gradeValue: "10", bucket: "psa_10" },
    { regex: /\bpsa\s*9\b|\bpsa9\b/i, grader: "PSA", gradeValue: "9", bucket: "psa_9" },
    { regex: /\bbgs\s*10\b|\bbeckett\s*10\b/i, grader: "BGS", gradeValue: "10", bucket: "bgs_10" },
    { regex: /\bbgs\s*9\.?5\b|\bbeckett\s*9\.?5\b/i, grader: "BGS", gradeValue: "9.5", bucket: "bgs_95" },
    { regex: /\bbgs\s*9\b|\bbeckett\s*9\b/i, grader: "BGS", gradeValue: "9", bucket: "bgs_9" },
    { regex: /\bcgc\s*10\b/i, grader: "CGC", gradeValue: "10", bucket: "cgc_10" },
    { regex: /\bcgc\s*9\.?5\b/i, grader: "CGC", gradeValue: "9.5", bucket: "cgc_95" },
    { regex: /\bcgc\s*9\b/i, grader: "CGC", gradeValue: "9", bucket: "cgc_9" },
  ];
  for (const pattern of patterns) {
    if (pattern.regex.test(title)) {
      return {
        grader: pattern.grader,
        gradeValue: pattern.gradeValue,
        bucket: pattern.bucket,
        source: "title",
      };
    }
  }
  return null;
}

function detectAccessoryPhrase(title: string | null | undefined): string | null {
  if (!title) return null;
  const normalized = title.toLowerCase();
  for (const phrase of ACCESSORY_PHRASES.hard) {
    if (normalized.includes(phrase)) {
      return phrase;
    }
  }
  const hasContext = ACCESSORY_CONTEXT.some((context) =>
    normalized.includes(context),
  );
  if (!hasContext) {
    return null;
  }
  for (const phrase of ACCESSORY_PHRASES.contextual) {
    if (normalized.includes(phrase)) {
      return phrase;
    }
  }
  return null;
}

type ListingLanguage = "en" | "jp" | "unknown";

function detectListingLanguage(title: string | null | undefined): ListingLanguage {
  if (!title) {
    return "unknown";
  }
  const lower = title.toLowerCase();
  if (
    /\bjapanese\b/.test(lower) ||
    /\bjpn\b/.test(lower) ||
    /\bjp\b/.test(lower) ||
    title.includes("日本語")
  ) {
    return "jp";
  }
  const hasAsciiLetters = /[a-z]/i.test(title);
  const hasNonAscii = /[^\x00-\x7F]/.test(title);
  if (hasAsciiLetters && !hasNonAscii) {
    return "en";
  }
  if (hasAsciiLetters && hasNonAscii) {
    return "unknown";
  }
  return hasNonAscii ? "unknown" : "en";
}

async function getListingDetail(
  listingId: string | undefined,
  market: string,
): Promise<EbayItemDetail | null> {
  if (!listingId) return null;
  if (!detailCache.has(listingId)) {
    detailCache.set(
      listingId,
      detailSemaphore.run(() => fetchEbayItemDetail(listingId, market)),
    );
  }
  return detailCache.get(listingId) ?? null;
}

function extractGradeFromDetail(detail: EbayItemDetail | null): GradeInfo | null {
  if (!detail) return null;
  const graderRaw =
    findDescriptorValue(detail.conditionDescriptors ?? [], "professional grader") ??
    findAspectValue(detail.localizedAspects ?? [], "professional grader");
  const gradeRaw =
    findDescriptorValue(detail.conditionDescriptors ?? [], "grade") ??
    findAspectValue(detail.localizedAspects ?? [], "grade");

  const grader = normalizeGraderName(graderRaw);
  const gradeValue = normalizeGradeValue(gradeRaw);
  if (!grader && !gradeValue) {
    return null;
  }
  const bucket = bucketFromGrade(grader, gradeValue);
  return {
    grader,
    gradeValue,
    bucket,
    source: "specifics",
  };
}

function findDescriptorValue(
  descriptors: Array<{ name?: string; values?: Array<{ content?: string }> }>,
  targetName: string,
): string | null {
  for (const descriptor of descriptors) {
    if (!descriptor.name) continue;
    if (descriptor.name.trim().toLowerCase() === targetName) {
      const value = descriptor.values?.[0]?.content;
      if (value) {
        return value;
      }
    }
  }
  return null;
}

function findAspectValue(
  aspects: Array<{ name?: string; value?: string }>,
  targetName: string,
): string | null {
  for (const aspect of aspects) {
    if (!aspect.name) continue;
    if (aspect.name.trim().toLowerCase() === targetName) {
      if (aspect.value) {
        return aspect.value;
      }
    }
  }
  return null;
}

function normalizeGraderName(raw: string | null): string | null {
  if (!raw) return null;
  const value = raw.toLowerCase();
  if (value.includes("psa")) return "PSA";
  if (value.includes("bgs") || value.includes("beckett")) return "BGS";
  if (value.includes("cgc")) return "CGC";
  return null;
}

function normalizeGradeValue(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  if (cleaned === "95") return "9.5";
  return cleaned;
}

function bucketFromGrade(grader: string | null, gradeValue: string | null): string | null {
  if (!grader || !gradeValue) return null;
  const normalized = gradeValue;
  switch (grader) {
    case "PSA":
      if (normalized === "10") return "psa_10";
      if (normalized === "9") return "psa_9";
      break;
    case "BGS":
      if (normalized === "10") return "bgs_10";
      if (normalized === "9.5") return "bgs_95";
      if (normalized === "9") return "bgs_9";
      break;
    case "CGC":
      if (normalized === "10") return "cgc_10";
      if (normalized === "9.5") return "cgc_95";
      if (normalized === "9") return "cgc_9";
      break;
  }
  return null;
}

function createSemaphore(limit: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  return {
    run<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const execute = async () => {
          active += 1;
          try {
            const result = await fn();
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            active -= 1;
            const next = queue.shift();
            if (next) next();
          }
        };
        if (active < limit) {
          void execute();
        } else {
          queue.push(execute);
        }
      });
    },
  };
}
