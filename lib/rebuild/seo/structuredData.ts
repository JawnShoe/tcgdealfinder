import type { ListingDomain } from "@/lib/rebuild/data/listingMapper";
import { buildListingCanonicalUrl } from "./canonical";

type StructuredDataObject = Record<string, unknown>;

function compactObject<T extends StructuredDataObject>(input: T): T {
  const entries = Object.entries(input).filter(
    ([, value]) => value !== undefined && value !== null
  );
  return Object.fromEntries(entries) as T;
}

function toAvailability(value: string | null): string | undefined {
  if (!value) return undefined;
  if (value.toLowerCase().includes("in stock")) {
    return "https://schema.org/InStock";
  }
  return undefined;
}

export function buildListingJsonLd(
  listing: ListingDomain
): StructuredDataObject {
  const hasOfferPrice =
    listing.price.amount != null && Boolean(listing.price.currency);
  const offer: StructuredDataObject = {
    "@type": "Offer",
    url: listing.url ?? undefined,
    priceCurrency: hasOfferPrice ? listing.price.currency : undefined,
    price: hasOfferPrice ? listing.price.amount.toFixed(2) : undefined,
    availability: toAvailability(listing.availability),
  };

  const offerCompact = compactObject(offer);
  const hasOfferFields = hasOfferPrice && Object.keys(offerCompact).length > 1;

  const product: StructuredDataObject = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    sku: listing.listingId,
    url: buildListingCanonicalUrl(listing.listingId),
    offers: hasOfferFields ? offerCompact : undefined,
  };

  return compactObject(product);
}
