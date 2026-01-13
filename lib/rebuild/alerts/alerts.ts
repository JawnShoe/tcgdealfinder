import type { ListingDomain } from "@/lib/rebuild/data/listingMapper";

export type AlertType = "saved_search" | "price_threshold" | "trust_threshold";
export type AlertCurrency = "CAD" | "USD" | "NATIVE";

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

function getListingPrice(
  listing: ListingDomain,
  currency: AlertCurrency
): number | null {
  if (currency === "CAD") {
    return listing.price.totalCad ?? null;
  }
  if (currency === "USD") {
    return listing.price.totalUsd ?? null;
  }
  if (currency === "NATIVE") {
    return listing.price.totalNative ?? null;
  }
  return null;
}

export function evaluatePriceThresholdAlert(
  alert: PriceThresholdAlert,
  listing: ListingDomain
): AlertDecision {
  const gate = getTrustGate(listing);
  if (!gate.eligible) {
    return { shouldFire: false, reasons: gate.reasons };
  }

  const price = getListingPrice(listing, alert.currency);
  if (price == null) {
    return { shouldFire: false, reasons: ["price_unavailable"] };
  }

  if (price > alert.maxPrice) {
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
