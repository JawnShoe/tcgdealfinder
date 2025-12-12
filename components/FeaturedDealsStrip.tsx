import Image from "next/image";
import Link from "next/link";

import type { Deal } from "@/types/deal";
import {
  formatCurrency,
  formatDiscount,
  getConfidenceLabel,
} from "@/lib/dealFormatting";

type FeaturedDealsStripProps = {
  deals: Deal[];
};

type FeaturedView = {
  deal: Deal;
  price: number | null;
  discount: number | null;
  discountMagnitude: number;
};

export default function FeaturedDealsStrip({
  deals,
}: FeaturedDealsStripProps) {
  const featured = buildFeaturedDeals(deals);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 lg:px-8">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
          Featured
        </p>
        <h2 className="text-lg font-semibold text-slate-900">
          Top opportunities right now
        </h2>
        <p className="text-sm text-slate-600">
          Highest-discount listings across every market. Refreshed whenever new
          deals arrive.
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
                className="min-w-[250px] flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:min-w-0"
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
                    <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                      {deal.card?.name ?? deal.cardName ?? deal.title}
                    </p>
                    <p className="line-clamp-1 text-xs text-slate-500">
                      {deal.card?.setName ?? deal.setName ?? "Unknown set"}
                    </p>
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

                <div className="mt-4 grid gap-1 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Confidence</span>
                    <span className="text-slate-900">
                      {getConfidenceLabel(deal.sampleSize ?? null)}
                    </span>
                  </div>
                  {deal.sampleSize ? (
                    <div className="flex justify-between">
                      <span>Sample size</span>
                      <span className="text-slate-900">{deal.sampleSize}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span>Market</span>
                    <span className="text-slate-900">{deal.market}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <a
                    href={deal.url}
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
