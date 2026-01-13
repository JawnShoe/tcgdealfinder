const SITE_NAME = "TCG Deal Finder";

export function buildRebuildTitle(pageLabel: string): string {
  return `Rebuild ${pageLabel} | ${SITE_NAME}`;
}

export function buildListingTitle(listingTitle?: string | null): string {
  if (listingTitle) {
    return `Rebuild Listing - ${listingTitle} | ${SITE_NAME}`;
  }
  return buildRebuildTitle("Listing");
}
