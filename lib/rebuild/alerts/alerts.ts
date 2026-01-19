import type { ListingDomain } from "@/lib/rebuild/data/listingMapper";
import {
  toUsdCentsFromUsdDollars,
  type UsdCents,
} from "@/lib/rebuild/currency/canonical";
import {
  cadCurrencyCode,
  toUsdCentsFromCadDollars,
} from "@/lib/rebuild/currency/cad";

export type AlertType = "saved_search" | "price_threshold" | "trust_threshold";
export type AlertCurrency = typeof cadCurrencyCode | "USD" | "NATIVE";

export type SavedSearchAlert = {
  type: "saved_search";
  query: string;
};

export type PriceThresholdAlert = {
  type: "price_threshold";
  listingId: string;
  maxPrice: number;
  currency: AlertCurrency;
};

export type TrustThresholdAlert = {
  type: "trust_threshold";
  listingId: string;
  minConfidenceWeight: number;
};

export type AlertDefinition =
  | SavedSearchAlert
  | PriceThresholdAlert
  | TrustThresholdAlert;

export type AlertBlockReason =
  | "stale_data"
  | "missing_confidence"
  | "integrity_flagged"
  | "listing_not_found"
  | "price_unavailable"
  | "price_above_threshold"
  | "below_trust_threshold"
  | "query_mismatch";

export type AlertDecision = {
  shouldFire: boolean;
  matchedListingId?: string;
  reasons: AlertBlockReason[];
};

const ALERT_FRESHNESS_SLO_SECONDS = 15 * 60;

type TrustGateResult = {
  eligible: boolean;
  reasons: AlertBlockReason[];
};

function getTrustGate(listing: ListingDomain): TrustGateResult {
  const reasons: AlertBlockReason[] = [];
  const ageSeconds = listing.freshness.dataAgeSeconds;

  if (ageSeconds == null || ageSeconds > ALERT_FRESHNESS_SLO_SECONDS) {
    reasons.push("stale_data");
  }

  if (
    listing.trust.confidence.weight == null ||
    listing.trust.confidence.label === "unknown"
  ) {
    reasons.push("missing_confidence");
  }

  if (listing.riskFlags.includes("INTEGRITY_FLAGGED")) {
    reasons.push("integrity_flagged");
  }

  return { eligible: reasons.length === 0, reasons };
}

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePriceThresholdToUsdCents(
  alert: PriceThresholdAlert,
  listing: ListingDomain
): UsdCents | null {
  if (alert.currency === "USD") {
    return toUsdCentsFromUsdDollars(alert.maxPrice);
  }

  if (alert.currency === cadCurrencyCode) {
    return toUsdCentsFromCadDollars(alert.maxPrice);
  }

  const listingTotalUsd = listing.price.totalUsd;
  const listingTotalNative = listing.price.totalNative;
  if (listingTotalUsd == null || listingTotalNative == null) return null;
  if (!Number.isFinite(listingTotalUsd) || !Number.isFinite(listingTotalNative))
    return null;
  if (listingTotalNative <= 0) return null;

  const rateToUsd = listingTotalUsd / listingTotalNative;
  return toUsdCentsFromUsdDollars(alert.maxPrice * rateToUsd);
}

export function evaluatePriceThresholdAlert(
  alert: PriceThresholdAlert,
  listing: ListingDomain
): AlertDecision {
  const gate = getTrustGate(listing);
  if (!gate.eligible) {
    return { shouldFire: false, reasons: gate.reasons };
  }

  const listingTotalUsd = listing.price.totalUsd;
  if (listingTotalUsd == null) {
    return { shouldFire: false, reasons: ["price_unavailable"] };
  }

  const thresholdUsdCents = normalizePriceThresholdToUsdCents(alert, listing);
  if (thresholdUsdCents == null) {
    return { shouldFire: false, reasons: ["price_unavailable"] };
  }

  const listingUsdCents = toUsdCentsFromUsdDollars(listingTotalUsd);
  if (listingUsdCents > thresholdUsdCents) {
    return { shouldFire: false, reasons: ["price_above_threshold"] };
  }

  return {
    shouldFire: true,
    matchedListingId: listing.listingId,
    reasons: [],
  };
}

export function evaluateTrustThresholdAlert(
  alert: TrustThresholdAlert,
  listing: ListingDomain
): AlertDecision {
  const gate = getTrustGate(listing);
  if (!gate.eligible) {
    return { shouldFire: false, reasons: gate.reasons };
  }

  const weight = listing.trust.confidence.weight;
  if (weight == null || weight < alert.minConfidenceWeight) {
    return { shouldFire: false, reasons: ["below_trust_threshold"] };
  }

  return {
    shouldFire: true,
    matchedListingId: listing.listingId,
    reasons: [],
  };
}

export function evaluateSavedSearchAlert(
  alert: SavedSearchAlert,
  listings: ListingDomain[]
): AlertDecision {
  const query = normalizeQuery(alert.query);
  const matches = listings.filter((listing) =>
    listing.title.toLowerCase().includes(query)
  );

  if (matches.length === 0) {
    return { shouldFire: false, reasons: ["query_mismatch"] };
  }

  const blockedReasons = new Set<AlertBlockReason>();
  for (const listing of matches) {
    const gate = getTrustGate(listing);
    if (gate.eligible) {
      return {
        shouldFire: true,
        matchedListingId: listing.listingId,
        reasons: [],
      };
    }
    gate.reasons.forEach((reason) => blockedReasons.add(reason));
  }

  return {
    shouldFire: false,
    matchedListingId: matches[0]?.listingId,
    reasons: Array.from(blockedReasons),
  };
}
