import { notFound, permanentRedirect } from "next/navigation";

import { resolveListingIdByCardId } from "@/lib/rebuild/data/resolveListingIdByCardId";

type CardPageProps = {
  params: { cardId: string };
};

/**
 * Stage 1 Decommission: /cards/[cardId] -> /rebuild/listing/[id]
 *
 * This legacy route is replaced with a server-side redirect to the rebuild listing.
 * The cardId is resolved to a listing_id via deterministic mapping (lowest listing_id
 * when multiple listings exist for the same card).
 */
export default async function CardRedirectPage({ params }: CardPageProps) {
  const cardId = Number(params.cardId);

  if (!Number.isFinite(cardId) || cardId <= 0) {
    notFound();
  }

  const listingId = await resolveListingIdByCardId(cardId);

  if (!listingId) {
    notFound();
  }

  permanentRedirect(`/rebuild/listing/${encodeURIComponent(listingId)}`);
}
