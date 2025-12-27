"use client";

import Image from "next/image";
import type { Deal } from "@/types/deal";
import { MarketFlag } from "./MarketFlag";
import { TrustedBadge } from "./TrustedBadge";
import { SellerNameWithTooltip } from "./SellerNameWithTooltip";
import { TooltipPopoverClientOnly } from "./TooltipPopoverClientOnly";
import { getSellerDisplayData } from "@/lib/sellerDisplay";
import { isDealTrusted } from "@/lib/dealScore";
import {
  formatCurrency,
  formatDiscount,
  formatMarket,
} from "@/lib/dealFormatting";
import { CardIdentityBlock, buildCardIdentityFromDeal } from "./CardIdentity";
import { ConfidenceChip } from "./ConfidenceChip";
import { getConfidenceLabel as getWeightLabel } from "@/lib/dealConfidence";
import { buildAffiliateUrl } from "@/lib/affiliateUrl";

type FeaturedDealsStripProps = {
  deals: Deal[];
};

type FeaturedView = {
  deal: Deal;
  price: number | null;
  discount: number | null;
  discountMagnitude: number;
};

export default function FeaturedDealsStrip({ deals }: FeaturedDealsStripProps) {
  const featured = buildFeaturedDeals(deals);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 sm:px-5 lg:px-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          High confidence picks
        </p>
        <p className="text-sm text-slate-600">
          Largest discounts with verified price history. Updated live.
        </p>
      </div>

      {featured.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
          No featured listings yet. Keep scrolling to view every live deal.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto pb-2 sm:pb-0">
          <div className="flex gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {featured.map(({ deal, price, discount }) => (
              <article
                key={deal.id}
                className="min-w-[250px] flex-1 rounded-xl border border-slate-200 bg-white p-3.5 sm:min-w-0"
              >
                <div className="flex gap-3">
                  {deal.thumbnailUrl ? (
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <Image
                        src={deal.thumbnailUrl}
                        alt={deal.title}
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400">
                      No photo
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <CardIdentityBlock
                      identity={buildCardIdentityFromDeal(deal)}
                      primaryHref={buildAffiliateUrl(deal.url)}
                      showListingTitle
                      showViewCardLink={false}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(price)}
                      </span>
                      <span className="font-semibold text-emerald-600">
                        {formatDiscount(discount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Seller</span>
                  <div className="flex items-center gap-1.5">
                    <SellerNameWithTooltip
                      seller={getSellerDisplayData({
                        username: deal.sellerUsername,
                        storeName: deal.sellerStoreName,
                        feedbackCount: deal.sellerFeedbackCount,
                        feedbackPercent: deal.sellerPositivePercent,
                      })}
                      className="text-slate-900 font-medium"
                    />
                    {isDealTrusted(
                      deal.sellerFeedbackCount,
                      deal.sellerPositivePercent
                    ) && <TrustedBadge />}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <TooltipPopoverClientOnly
                    content="Indicates how reliable recent pricing data is based on sales volume and consistency"
                    triggerClassName="text-slate-600"
                    tooltipClassName="tooltip-wide"
                    size="wide"
                  >
                    Data reliability
                  </TooltipPopoverClientOnly>
                  <ConfidenceChip
                    weightLabel={getWeightLabel(deal.confidenceWeight ?? null)}
                    sampleSize={deal.sampleSize}
                    center={false}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Market</span>
                  <span className="inline-flex items-center gap-1 text-slate-900">
                    <span aria-hidden="true">
                      <MarketFlag market={deal.market} />
                    </span>
                    <span aria-hidden="true">
                      {formatMarket(deal.market).compactLabel}
                    </span>
                    <span className="sr-only">
                      {formatMarket(deal.market).label}
                    </span>
                  </span>
                </div>

                <div className="mt-4">
                  <a
                    href={buildAffiliateUrl(deal.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    View deal
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function buildFeaturedDeals(deals: Deal[]): FeaturedView[] {
  return deals
    .map<FeaturedView>((deal) => {
      const discount = deal.discountPercent ?? null;
      const price = deal.totalPriceCad ?? deal.priceCad ?? null;
      const discountMagnitude =
        discount != null ? Math.abs(discount) : Number.NEGATIVE_INFINITY;

      return {
        deal,
        price,
        discount,
        discountMagnitude,
      };
    })
    .filter((view) => view.discount != null)
    .sort((a, b) => b.discountMagnitude - a.discountMagnitude)
    .slice(0, 6);
}
