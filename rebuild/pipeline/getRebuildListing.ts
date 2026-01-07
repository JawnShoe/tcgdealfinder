import { getRebuildListingById } from "@/lib/rebuild/data/getRebuildListingById";
import { ListingDomain } from "@/lib/rebuild/data/listingMapper";

type GetRebuildListingInput = {
  id: string | number;
};

export async function getRebuildListing({
  id,
}: GetRebuildListingInput): Promise<ListingDomain | null> {
  return getRebuildListingById(id);
}
