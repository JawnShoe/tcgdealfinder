import type { Deal } from "../types/deal";
import {
  computeDiscountPercent,
  getDisplayDiscountPercent,
} from "./pricing";

export function getDealPrice(deal: Deal): number | null {
  if (deal.totalPriceCad != null) {
    return deal.totalPriceCad;
  }
  if (deal.priceCad != null && deal.shippingCad != null) {
    return deal.priceCad + deal.shippingCad;
  }
  if (deal.priceCad != null) {
    return deal.priceCad;
  }
  return null;
}

export function getDealDiscount(deal: Deal): number | null {
  const price = getDealPrice(deal);
  const historic = deal.historicPriceCad;

  if (price != null && historic != null) {
    const raw = computeDiscountPercent(price, historic);
    if (raw != null) {
      return getDisplayDiscountPercent({
        discount_percent: raw,
        seller_feedback_count: deal.sellerFeedbackCount ?? null,
        seller_positive_percent: deal.sellerPositivePercent ?? null,
      });
    }
  }

  const discount = deal.discountPercent;
  if (discount == null) {
    return null;
  }
  const parsed = Number(discount);
  return Number.isFinite(parsed) ? parsed : null;
}
