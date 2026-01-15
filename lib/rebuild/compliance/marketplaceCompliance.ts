import { REBUILD_COMPLIANCE_DISCLOSURE_COPY } from "./disclosure";

export const MARKETPLACE_COMPLIANCE_VERSION = 1 as const;

export const SUPPORTED_MARKETPLACES = [
  "EBAY_US",
  "EBAY_CA",
  "EBAY_GB",
  "EBAY_AU",
] as const;

export type MarketplaceId = (typeof SUPPORTED_MARKETPLACES)[number];

export type MarketplaceCompliance = {
  version: typeof MARKETPLACE_COMPLIANCE_VERSION;
  marketplace: MarketplaceId;
  displayRules: {
    disclosureText: string;
    disclosureRequired: true;
    placement: "near_outbound_link";
    notHoverOnly: true;
    clsSafe: true;
  };
  attributionWindows: {
    modeledBySystem: false;
    notes: string;
  };
  cachingStorageConstraints: {
    outboundClickStorage: {
      urlStoredAs: "origin+pathname";
      stores: readonly string[];
      neverStores: readonly string[];
    };
  };
};

const BASE_EBAY_RULES = {
  version: MARKETPLACE_COMPLIANCE_VERSION,
  displayRules: {
    disclosureText: REBUILD_COMPLIANCE_DISCLOSURE_COPY,
    disclosureRequired: true as const,
    placement: "near_outbound_link" as const,
    notHoverOnly: true as const,
    clsSafe: true as const,
  },
  attributionWindows: {
    modeledBySystem: false as const,
    notes:
      "No in-app attribution window assumptions are applied. Click tracking is recorded for observability; affiliate attribution is handled externally.",
  },
  cachingStorageConstraints: {
    outboundClickStorage: {
      urlStoredAs: "origin+pathname" as const,
      stores: ["listingId", "sanitizedUrl", "requestId", "createdAt"] as const,
      neverStores: [
        "fullQueryString",
        "cookies",
        "authorizationTokens",
        "userIdentifiers",
      ] as const,
    },
  },
} satisfies Omit<MarketplaceCompliance, "marketplace">;

export const MARKETPLACE_COMPLIANCE: Record<
  MarketplaceId,
  MarketplaceCompliance
> = {
  EBAY_US: { ...BASE_EBAY_RULES, marketplace: "EBAY_US" },
  EBAY_CA: { ...BASE_EBAY_RULES, marketplace: "EBAY_CA" },
  EBAY_GB: { ...BASE_EBAY_RULES, marketplace: "EBAY_GB" },
  EBAY_AU: { ...BASE_EBAY_RULES, marketplace: "EBAY_AU" },
};

export function getMarketplaceCompliance(
  marketplace: string | null | undefined
): MarketplaceCompliance | null {
  if (!marketplace) return null;
  return (
    MARKETPLACE_COMPLIANCE[marketplace as MarketplaceId] ??
    (marketplace === "EBAY_UK" ? MARKETPLACE_COMPLIANCE.EBAY_GB : null)
  );
}
