import test from "node:test";
import assert from "node:assert/strict";

import { applyWatchedCardIdsToDeals } from "../../../lib/watchlistEnrichment";
import type { Deal } from "../../../types/deal";

function makeDeal(id: number, cardId: number): Deal {
  return {
    id,
    title: `Deal ${id}`,
    url: `https://example.com/deals/${id}`,
    priceCad: null,
    shippingCad: null,
    totalPriceCad: null,
    totalUsd: null,
    historicPriceCad: null,
    currency: null,
    priceNative: null,
    shippingNative: null,
    totalNative: null,
    discountPercent: null,
    sampleSize: null,
    market: "EBAY_US",
    endsAt: null,
    updatedAt: null,
    thumbnailUrl: null,
    sellerUsername: null,
    card: null,
    condition: null,
    setName: null,
    cardName: null,
    cardId,
  };
}

test("applyWatchedCardIdsToDeals does not change ordering or row count", () => {
  const deals: Deal[] = [makeDeal(101, 1), makeDeal(102, 2), makeDeal(103, 1)];
  const originalOrder = deals.map((deal) => deal.id);

  applyWatchedCardIdsToDeals(deals, new Set([1]));

  assert.deepEqual(
    deals.map((deal) => deal.id),
    originalOrder
  );
  assert.equal(deals.length, 3);

  assert.equal(deals[0].isWatched, true);
  assert.equal(deals[1].isWatched, false);
  assert.equal(deals[2].isWatched, true);
});
