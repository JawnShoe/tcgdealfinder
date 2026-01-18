"use client";

import Image from "next/image";
import Link from "next/link";

import { TrustedBadge } from "./TrustedBadge";
import { buildAffiliateUrl } from "../lib/affiliateUrl";
import type { Deal } from "../types/deal";
import {
  SellerNameWithTooltip,
  formatSellerSalesCount,
} from "./SellerNameWithTooltip";
import { getSellerDisplayData } from "@/lib/sellerDisplay";
import { CardIdentityBlock, buildCardIdentityFromDeal } from "./CardIdentity";
import {
  discountClass,
  formatDiscount,
  formatMarket,
  formatPriceWithApprox,
} from "../lib/dealFormatting";
import { MarketFlag } from "./MarketFlag";

export type FeaturedDealView = {
  deal: Deal;
  price: number | null;
  discount: number | null;
  score: number | null;
  trustedSeller: boolean;
};

type FeaturedDealsProps = {
  deals: FeaturedDealView[];
};

export function FeaturedDeals({ deals }: FeaturedDealsProps) {
  const deduped = dedupeFeaturedDeals(deals);
  return (
    <div className="panel space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Featured deals today
        </h2>
        <p className="text-sm text-slate-600">
          Top listings ranked by our deal quality score. Discounts, seller
          trust, and data confidence drive placement.
        </p>
      </div>

      {deduped.length === 0 ? (
        <div className="rounded border border-dashed px-4 py-6 text-center text-sm text-slate-500">
          No standout deals hit our featured threshold yet. Check back later or
          browse all deals below.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {deduped.map(({ deal, price, discount, trustedSeller }) => {
            const market = formatMarket(deal.market);
            const salesText = formatSellerSalesCount(
              deal.sellerFeedbackCount ?? null
            );
            return (
              <div
                key={deal.id}
                className="flex flex-col rounded-lg border bg-white p-4 shadow-sm"
              >
                <div className="flex gap-3">
                  {deal.thumbnailUrl ? (
                    <Image
                      src={deal.thumbnailUrl}
                      alt={deal.title}
                      width={72}
                      height={72}
                      className="h-20 w-20 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-md bg-slate-200" />
                  )}
                  <div className="flex-1">
                    <CardIdentityBlock
                      identity={buildCardIdentityFromDeal(deal)}
                      primaryHref={buildAffiliateUrl(deal.url)}
                      showListingTitle
                      showViewCardLink={false}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      {(() => {
                        const { primary, secondary } = formatPriceWithApprox(
                          deal.totalNative,
                          deal.currency,
                          deal.totalUsd
                        );
                        return (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex flex-wrap items-baseline gap-2">
                              <span className="text-base font-semibold text-slate-900">
                                {primary}
                              </span>
                              <span
                                className={`font-medium ${discountClass(discount)}`}
                              >
                                {formatDiscount(discount)}
                              </span>
                            </div>
                            {secondary ? (
                              <span className="text-xs text-slate-500">
                                {secondary}
                              </span>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex-1 text-sm text-slate-600">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs uppercase tracking-wide text-slate-500">
                      Seller
                    </span>
                    <div className="flex flex-col items-end gap-0.5 text-right">
                      <span className="inline-flex items-center gap-1 text-slate-800">
                        <SellerNameWithTooltip
                          seller={getSellerDisplayData({
                            username: deal.sellerUsername,
                            storeName: deal.sellerStoreName,
                            feedbackCount: deal.sellerFeedbackCount,
                            feedbackPercent: deal.sellerPositivePercent,
                          })}
                          className="text-sm text-slate-600"
                        />
                        {trustedSeller && <TrustedBadge />}
                      </span>
                      {salesText ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                          <span aria-hidden="true">⭐</span>
                          <span>{salesText} sales</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-wide text-slate-500">
                      Market
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-800">
                      <span aria-hidden="true">
                        <MarketFlag market={deal.market} />
                      </span>
                      <span aria-hidden="true">{market.compactLabel}</span>
                      <span className="sr-only">{market.label}</span>
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <a
                    href={buildAffiliateUrl(deal.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View listing
                  </a>
                  {deal.listingId && (
                    <Link
                      href={`/rebuild/listing/${encodeURIComponent(deal.listingId)}`}
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Details
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function dedupeFeaturedDeals(deals: FeaturedDealView[]): FeaturedDealView[] {
  const seen = new Set<number>();
  const result: FeaturedDealView[] = [];

  for (const item of deals) {
    const cardId = item.deal.card?.id ?? item.deal.cardId ?? null;
    if (cardId == null) {
      result.push(item);
      continue;
    }
    if (seen.has(cardId)) {
      continue;
    }
    seen.add(cardId);
    result.push(item);
  }

  return result;
}
