import type { Deal } from "../types/deal";

export function applyWatchedCardIdsToDeals(
  deals: Deal[],
  watchedCardIds: ReadonlySet<number>
): void {
  for (const deal of deals) {
    const cardId = deal.cardId ?? null;
    if (cardId == null) continue;
    deal.isWatched = watchedCardIds.has(cardId);
  }
}
