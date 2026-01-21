import { queryRebuild } from "../db";
import {
  DbListingRow,
  ListingDomain,
  mapDbRowToListingDomain,
} from "./listingMapper";
import { isRebuildDbConfigured } from "./dataAvailability";
import { ensureRebuildCardsLanguageColumn } from "./schema";

const LISTING_ID_PATTERN = /^v1\|\d+\|0$/;

export async function getRebuildListingById(
  listingId: string | number
): Promise<ListingDomain | null> {
  if (!isRebuildDbConfigured()) {
    return null;
  }
  const normalizedId = normalizeListingId(listingId);
  const numericId = parseNumericId(listingId);
  const hasCardLanguage = await ensureRebuildCardsLanguageColumn();

  const result = await queryRebuild<DbListingRow>(
    `
      SELECT
        l.card_id,
        ${hasCardLanguage ? "c.language" : "NULL"} as card_language,
        l.listing_id,
        l.title,
        l.url,
        l.ends_at,
        l.total_price_cad,
        l.total_usd,
        l.total_native,
        l.currency,
        l.price_native,
        l.discount_percent,
        l.condition_raw,
        l.shipping_known,
        l.seller,
        l.seller_username,
        l.seller_feedback_count,
        l.seller_positive_percent,
        l.source,
        l.market,
        (to_jsonb(l) ->> 'deal_confidence_weight') as deal_confidence_weight,
        l.integrity_status,
        l.integrity_reason,
        l.snapshot_at,
        l.ingested_at,
        l.updated_at,
        l.created_at
      FROM listings l
      LEFT JOIN cards c ON c.id = l.card_id
      WHERE l.listing_id = $1 OR l.id = $2
      LIMIT 1;
    `,
    [normalizedId, numericId ?? -1]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return mapDbRowToListingDomain(row, new Date());
}

function normalizeListingId(input: string | number): string {
  const trimmed = String(input).trim();
  if (!trimmed) return trimmed;
  if (LISTING_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }
  const directNumeric = trimmed.match(/^\d{9,}$/);
  if (directNumeric) {
    return `v1|${directNumeric[0]}|0`;
  }
  return trimmed;
}

function parseNumericId(input: string | number): number | null {
  const numeric = Number(input);
  return Number.isFinite(numeric) ? numeric : null;
}
