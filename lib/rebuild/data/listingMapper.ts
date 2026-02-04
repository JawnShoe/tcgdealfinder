export type PricePoint = {
  amount: number | null;
  currency: string | null;
  totalCad: number | null;
  totalUsd: number | null;
  totalNative: number | null;
  canonicalUsdCents?: UsdCents | null;
  discountPercent: number | null;
  display: string;
  deltaDisplay: string;
};

export type Provenance = {
  source: string;
  listingId: string;
  market: string | null;
  fetchedAtISO: string;
  snapshotAtISO: string | null;
  ingestedAtISO: string | null;
  updatedAtISO: string | null;
};

export type SellerSignal = {
  name: string | null;
  username: string | null;
  feedbackCount: number | null;
  positivePercent: number | null;
};

export type Freshness = {
  fetchedAtISO: string;
  dataAgeLabel: string;
  dataAgeSeconds: number | null;
};

export type Reliability = {
  integrityStatus: string | null;
  integrityReason: string | null;
  shippingKnown: boolean | null;
};

export type Confidence = {
  weight: number | null;
  label: "high" | "medium" | "low" | "unknown";
  display: string;
};

export type CardLanguage = "EN" | "JP" | "UNKNOWN";

export type TrustMetadata = {
  confidence: Confidence;
  source: string;
  fetchedAtISO: string;
  dataAgeLabel: string;
};

export type TransparencyLog = {
  sources: string[];
  computedAtISO: string;
  inputs: string[];
  pipelineVersion: string;
};

export type RiskFlag =
  | "MISSING_CONFIDENCE_WEIGHT"
  | "MISSING_SNAPSHOT_AT"
  | "INTEGRITY_FLAGGED"
  | "SHIPPING_UNKNOWN";

export type ListingDomain = {
  listingId: string;
  title: string;
  url: string | null;
  /** Full-size listing image URL when available (integration-provided). */
  imageUrl?: string | null;
  /** Thumbnail listing image URL when available (preferred for small UI slots). */
  thumbnailUrl?: string | null;
  endsAtISO?: string | null;
  price: PricePoint;
  seller: SellerSignal;
  condition: string | null;
  setName: string | null;
  language: CardLanguage;
  availability: string | null;
  provenance: Provenance;
  trust: TrustMetadata;
  trustAssessment: TrustAssessment;
  freshness: Freshness;
  reliability: Reliability;
  transparency: TransparencyLog;
  riskFlags: RiskFlag[];
  /** Intelligence layer signals (Track C3). Optional to avoid breaking consumers. */
  intelligence?: IntelligenceResult;
};

export type DbListingRow = {
  card_id: number | null;
  card_language: string | null;
  set_name: string | null;
  listing_id: string;
  title: string;
  url: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  ends_at?: Date | string | null;
  total_price_cad: string | null;
  total_usd: string | null;
  total_native: string | null;
  currency: string | null;
  price_native: string | null;
  discount_percent: string | null;
  condition_raw: string | null;
  shipping_known: boolean | null;
  seller: string | null;
  seller_username: string | null;
  seller_feedback_count: number | null;
  seller_positive_percent: string | null;
  source: string;
  market: string | null;
  deal_confidence_weight: string | null;
  integrity_status: string | null;
  integrity_reason: string | null;
  snapshot_at: Date | string | null;
  ingested_at: Date | string | null;
  updated_at: Date | string | null;
  created_at: Date | string | null;
};

const PIPELINE_VERSION = "rebuild-db-v1";

export function mapDbRowToListingDomain(
  row: DbListingRow,
  now: Date
): ListingDomain {
  const fetchedAt =
    toDate(row.snapshot_at) ??
    toDate(row.updated_at) ??
    toDate(row.created_at) ??
    now;
  const fetchedAtISO = fetchedAt.toISOString();
  const dataAgeSeconds = Math.max(
    0,
    Math.round((now.getTime() - fetchedAt.getTime()) / 1000)
  );
  const dataAgeLabel = formatAgeLabel(dataAgeSeconds);

  const totalCad = parseNullableNumber(row.total_price_cad);
  const rawTotalUsd = parseNullableNumber(row.total_usd);
  const totalNative = parseNullableNumber(row.total_native);
  const currency = row.currency ?? null;

  const canonicalUsdCents =
    rawTotalUsd != null
      ? toUsdCentsFromUsdDollars(rawTotalUsd)
      : totalCad != null
        ? toUsdCentsFromCadDollars(totalCad)
        : null;
  const totalUsd =
    rawTotalUsd != null
      ? rawTotalUsd
      : canonicalUsdCents != null
        ? toUsdDollarsFromUsdCents(canonicalUsdCents)
        : null;

  const { amount, displayCurrency } = pickDisplayPrice({
    totalUsd,
    totalNative,
    currency,
  });

  const discountPercent = parseNullableNumber(row.discount_percent);
  const deltaDisplay =
    discountPercent == null ? "Unknown" : `${discountPercent}%`;

  const confidenceWeight = parseNullableNumber(row.deal_confidence_weight);
  const clampedWeight = clampConfidenceWeight(confidenceWeight);
  const confidenceLabel = getConfidenceLabel(clampedWeight);
  const confidenceDisplay =
    clampedWeight == null
      ? "Unknown"
      : `${Math.round(clampedWeight * 100)} / 100`;

  const sources = [row.source, row.market].filter((value): value is string =>
    Boolean(value)
  );

  const riskFlags: RiskFlag[] = [];
  if (confidenceWeight == null) {
    riskFlags.push("MISSING_CONFIDENCE_WEIGHT");
  }
  if (!row.snapshot_at) {
    riskFlags.push("MISSING_SNAPSHOT_AT");
  }
  if (row.integrity_status && row.integrity_status !== "OK") {
    riskFlags.push("INTEGRITY_FLAGGED");
  }
  if (row.shipping_known === false || row.shipping_known == null) {
    riskFlags.push("SHIPPING_UNKNOWN");
  }

  const inputs = [
    "Listings totals + currency from listings.",
    "Seller feedback count + positive percent from listings.",
  ];
  if (confidenceWeight != null) {
    inputs.push("deal_confidence_weight from listings.");
  }

  const trust = {
    confidence: {
      weight: clampedWeight,
      label: confidenceLabel,
      display: confidenceDisplay,
    },
    source: row.source,
    fetchedAtISO,
    dataAgeLabel,
  };

  const freshness = {
    fetchedAtISO,
    dataAgeLabel,
    dataAgeSeconds,
  };

  const reliability = {
    integrityStatus: row.integrity_status ?? null,
    integrityReason: row.integrity_reason ?? null,
    shippingKnown: row.shipping_known ?? null,
  };

  const trustAssessment = deriveTrustAssessment({
    trust,
    freshness,
    reliability,
    riskFlags,
  });

  const price = {
    amount,
    currency: displayCurrency,
    totalCad,
    totalUsd,
    totalNative,
    canonicalUsdCents,
    discountPercent,
    display:
      amount != null && displayCurrency
        ? `${amount.toFixed(2)} ${displayCurrency}`
        : "Unavailable",
    deltaDisplay,
  };

  const seller = {
    name: row.seller ?? null,
    username: row.seller_username ?? null,
    feedbackCount: row.seller_feedback_count ?? null,
    positivePercent: parseNullableNumber(row.seller_positive_percent),
  };

  const condition = row.condition_raw ?? null;
  const language = normalizeCardLanguage(row.card_language);

  const intelligence = evaluateIntelligence({
    title: row.title,
    price: { amount, discountPercent },
    seller: { name: seller.name, username: seller.username },
    condition,
  });

  return {
    listingId: row.listing_id,
    title: row.title,
    url: row.url ?? null,
    imageUrl: row.image_url ?? null,
    thumbnailUrl: row.thumbnail_url ?? null,
    endsAtISO: row.ends_at ? toIsoString(row.ends_at) : null,
    price,
    seller,
    condition,
    setName: row.set_name ?? null,
    language,
    availability:
      row.shipping_known === false ? "Shipping unknown" : "In stock",
    provenance: {
      source: row.source,
      listingId: row.listing_id,
      market: row.market ?? null,
      fetchedAtISO,
      snapshotAtISO: toIsoString(row.snapshot_at),
      ingestedAtISO: toIsoString(row.ingested_at),
      updatedAtISO: toIsoString(row.updated_at),
    },
    trust,
    trustAssessment,
    freshness,
    reliability,
    transparency: {
      sources,
      computedAtISO: now.toISOString(),
      inputs,
      pipelineVersion: PIPELINE_VERSION,
    },
    riskFlags,
    intelligence,
  };
}

function normalizeCardLanguage(value: string | null): CardLanguage {
  if (value === "EN") return "EN";
  if (value === "JP") return "JP";
  return "UNKNOWN";
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoString(value: Date | string | null | undefined): string | null {
  const parsed = toDate(value);
  return parsed ? parsed.toISOString() : null;
}

function parseNullableNumber(
  value: number | string | null | undefined
): number | null {
  if (value == null) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function clampConfidenceWeight(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0.2, value));
}

function getConfidenceLabel(
  weight: number | null
): "high" | "medium" | "low" | "unknown" {
  if (weight == null) return "unknown";
  if (weight >= 0.8) return "high";
  if (weight >= 0.55) return "medium";
  return "low";
}

function formatAgeLabel(ageSeconds: number): string {
  if (!Number.isFinite(ageSeconds)) return "unknown";
  if (ageSeconds < 60) return "0m";
  const minutes = Math.floor(ageSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function pickDisplayPrice(values: {
  totalUsd: number | null;
  totalNative: number | null;
  currency: string | null;
}): { amount: number | null; displayCurrency: string | null } {
  if (values.totalNative != null && values.currency) {
    return { amount: values.totalNative, displayCurrency: values.currency };
  }
  if (values.totalUsd != null) {
    return { amount: values.totalUsd, displayCurrency: "USD" };
  }
  return { amount: null, displayCurrency: null };
}
import {
  deriveTrustAssessment,
  type TrustAssessment,
} from "../trust/trustAssessment";
import { evaluateIntelligence, type IntelligenceResult } from "../intelligence";
import {
  toUsdDollarsFromUsdCents,
  toUsdCentsFromUsdDollars,
  type UsdCents,
} from "../currency/canonical";
import { toUsdCentsFromCadDollars } from "../currency/cad";
