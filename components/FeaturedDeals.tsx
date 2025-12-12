
import Image from "next/image";
import Link from "next/link";

import { TrustedBadge } from "./TrustedBadge";
import type { Deal } from "../types/deal";
import { CardIdentityBlock, buildCardIdentityFromDeal } from "./CardIdentity";
import {
  discountClass,
  formatCurrency,
  formatDiscount,
  formatEndsAt,
  formatScore,
  scoreClass,
} from "../lib/dealFormatting";

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
  return (
    <div className="panel space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Featured deals today
        </h2>
        <p className="text-sm text-slate-600">
          Top listings ranked by our deal quality score. Discounts,
          seller trust, time left, and data confidence all factor in.
        </p>
      </div>

      {deals.length === 0 ? (
        <div className="rounded border border-dashed px-4 py-6 text-center text-sm text-slate-500">
          No standout deals hit our featured threshold yet. Check back
          later or browse all deals below.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {deals.map(({ deal, price, discount, score, trustedSeller }) => (
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
                    primaryHref={deal.url}
                    showListingTitle
                    showViewCardLink={false}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(price)}
                    </span>
                    <span
                      className={`font-medium ${discountClass(discount)}`}
                    >
                      {formatDiscount(discount)}
                    </span>
                    <span
                      className={`rounded-full bg-slate-100 px-2 py-0.5 font-semibold ${scoreClass(
                        score,
                      )}`}
                    >
                      Score {formatScore(score)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex-1 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Ends</span>
                  <span className="text-slate-800">
                    {formatEndsAt(deal.endsAt, { short: true })}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>Market</span>
                  <span className="text-slate-800">{deal.market}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>Seller</span>
                  <span className="inline-flex items-center gap-1 text-slate-800">
                    {deal.sellerUsername ?? "Unknown seller"}
                    {trustedSeller && <TrustedBadge />}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <a
                  href={deal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  View listing
                </a>
                {deal.cardId && (
                  <Link
                    href={`/cards/${deal.cardId}`}
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Card page
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
