import type { ListingDomain, RiskFlag } from "@/lib/rebuild/data/listingMapper";

export const TRUST_FRESHNESS_SLO_SECONDS = 15 * 60;

export type TrustFreshnessState = "fresh" | "stale" | "unknown";
export type TrustState = "VERIFIED" | "DEGRADED" | "INSUFFICIENT";
export type TrustDisclosure =
  | "STALE_DATA"
  | "MISSING_CONFIDENCE_WEIGHT"
  | "MISSING_FETCHED_AT"
  | "MISSING_SNAPSHOT_AT"
  | "INTEGRITY_FLAGGED"
  | "SHIPPING_UNKNOWN";

export type TrustAssessment = {
  state: TrustState;
  freshness: TrustFreshnessState;
  disclosures: TrustDisclosure[];
  reasons: string[];
};

export type TrustAssessmentInput = Pick<
  ListingDomain,
  "trust" | "freshness" | "reliability" | "riskFlags"
>;

const RISK_DISCLOSURES: Record<RiskFlag, TrustDisclosure> = {
  MISSING_CONFIDENCE_WEIGHT: "MISSING_CONFIDENCE_WEIGHT",
  MISSING_SNAPSHOT_AT: "MISSING_SNAPSHOT_AT",
  INTEGRITY_FLAGGED: "INTEGRITY_FLAGGED",
  SHIPPING_UNKNOWN: "SHIPPING_UNKNOWN",
};

const DISCLOSURE_REASONS: Record<TrustDisclosure, string> = {
  STALE_DATA: "Data age exceeds the freshness SLO.",
  MISSING_CONFIDENCE_WEIGHT: "Confidence weight missing.",
  MISSING_FETCHED_AT: "Fetched-at timestamp missing.",
  MISSING_SNAPSHOT_AT: "Snapshot timestamp missing.",
  INTEGRITY_FLAGGED: "Integrity status flagged.",
  SHIPPING_UNKNOWN: "Shipping information unknown.",
};

export function deriveTrustAssessment(
  listing: TrustAssessmentInput
): TrustAssessment {
  const disclosures: TrustDisclosure[] = [];

  if (!listing.trust.fetchedAtISO) {
    disclosures.push("MISSING_FETCHED_AT");
  }

  if (listing.trust.confidence.weight == null) {
    disclosures.push("MISSING_CONFIDENCE_WEIGHT");
  }

  for (const flag of listing.riskFlags) {
    const disclosure = RISK_DISCLOSURES[flag];
    if (disclosure && !disclosures.includes(disclosure)) {
      disclosures.push(disclosure);
    }
  }

  let freshness: TrustFreshnessState = "unknown";
  const dataAgeSeconds = listing.freshness.dataAgeSeconds;
  if (dataAgeSeconds != null) {
    freshness =
      dataAgeSeconds > TRUST_FRESHNESS_SLO_SECONDS ? "stale" : "fresh";
    if (freshness === "stale") {
      disclosures.push("STALE_DATA");
    }
  }

  const reasons = disclosures.map((code) => DISCLOSURE_REASONS[code]);

  const hasCriticalMissing =
    disclosures.includes("MISSING_FETCHED_AT") ||
    disclosures.includes("MISSING_CONFIDENCE_WEIGHT");
  const hasDegradedSignal =
    disclosures.includes("STALE_DATA") ||
    disclosures.includes("INTEGRITY_FLAGGED") ||
    disclosures.includes("SHIPPING_UNKNOWN") ||
    disclosures.includes("MISSING_SNAPSHOT_AT");

  let state: TrustState = "VERIFIED";
  if (hasCriticalMissing) {
    state = "INSUFFICIENT";
  } else if (hasDegradedSignal) {
    state = "DEGRADED";
  }

  return {
    state,
    freshness,
    disclosures,
    reasons,
  };
}

export function evaluateTrustInvariants(
  listing: TrustAssessmentInput,
  assessment: TrustAssessment
): string[] {
  const violations: string[] = [];

  if (!listing.trust.fetchedAtISO) {
    violations.push("trust.fetchedAtISO is required for trust surfaces.");
  }

  if (
    listing.trust.confidence.weight == null &&
    listing.trust.confidence.label !== "unknown"
  ) {
    violations.push("Missing confidence weight must yield label 'unknown'.");
  }

  if (
    listing.trust.confidence.weight != null &&
    listing.trust.confidence.label === "unknown"
  ) {
    violations.push("Confidence label must be known when weight is present.");
  }

  if (
    listing.freshness.dataAgeSeconds != null &&
    listing.freshness.dataAgeSeconds > TRUST_FRESHNESS_SLO_SECONDS &&
    !assessment.disclosures.includes("STALE_DATA")
  ) {
    violations.push("Stale data must emit STALE_DATA disclosure.");
  }

  if (
    listing.riskFlags.includes("INTEGRITY_FLAGGED") &&
    assessment.state === "VERIFIED"
  ) {
    violations.push("Integrity-flagged data must not be VERIFIED.");
  }

  if (assessment.state === "VERIFIED" && assessment.disclosures.length > 0) {
    violations.push("VERIFIED trust must not have disclosures.");
  }

  return violations;
}
