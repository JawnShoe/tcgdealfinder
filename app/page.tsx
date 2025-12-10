import type { Deal } from "../types/deal";
import DealsTable from "../components/DealsTable";
import { FeaturedDeals } from "../components/FeaturedDeals";
import type { FeaturedDealView } from "../components/FeaturedDeals";
import { getDealPrice, getDealDiscount } from "../lib/dealMath";
import { computeDealScore, getDealConfidence, isDealTrusted } from "../lib/dealScore";

const PAGE_SIZE = 50;
const FEATURED_SCORE_THRESHOLD = 60;
const MAX_FEATURED_DEALS = 6;

async function fetchDeals(page: number): Promise<{
  deals: Deal[];
  totalCount: number;
}> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const url = new URL(`${baseUrl}/api/deals`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", String(PAGE_SIZE));

  const res = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Failed to load deals:", res.statusText);
    return { deals: [], totalCount: 0 };
  }

  const data = (await res.json()) as {
    deals?: Deal[];
    totalCount?: number;
  };

  return {
    deals: data.deals ?? [],
    totalCount: data.totalCount ?? 0,
  };
}

type SearchParams = Record<string, string | string[] | undefined>;

export default async function HomePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const secretParam = searchParams?.secret;
  const requestedSecret = Array.isArray(secretParam)
    ? secretParam[0]
    : secretParam ?? undefined;
  const adminSecret = process.env.ADMIN_SECRET;
  const isAdmin =
    Boolean(adminSecret) && requestedSecret === adminSecret;

  const pageParam = searchParams?.page;
  const requestedPage = Array.isArray(pageParam)
    ? pageParam[0]
    : pageParam;
  let page = Math.max(Number(requestedPage) || 1, 1);

  let { deals, totalCount } = await fetchDeals(page);
  let totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (totalCount > 0 && page > totalPages) {
    page = totalPages;
    ({ deals, totalCount } = await fetchDeals(page));
    totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  }

  const featuredDeals = buildFeaturedDeals(deals);

  return (
    <main className="page-shell space-y-6 py-6">
      <FeaturedDeals deals={featuredDeals} />
      <DealsTable
        deals={deals}
        page={page}
        totalPages={totalPages}
        isAdmin={isAdmin}
        adminSecret={isAdmin ? requestedSecret : undefined}
      />
    </main>
  );
}

function buildFeaturedDeals(deals: Deal[]): FeaturedDealView[] {
  const referenceTime = Date.now();

  return deals
    .map((deal) => {
      const price = getDealPrice(deal);
      const discount = getDealDiscount(deal);
      const trusted = isDealTrusted(
        deal.sellerFeedbackCount ?? null,
        deal.sellerPositivePercent ?? null,
      );
      const confidence = getDealConfidence(deal.sampleSize ?? null);
      const score = computeDealScore(
        {
          discountPercent: discount,
          isTrustedSeller: trusted,
          endsAt: deal.endsAt,
          confidence,
        },
        referenceTime,
      );

      return {
        deal,
        price,
        discount,
        score,
        trustedSeller: trusted,
      };
    })
    .filter(
      ({ score, discount }) =>
        score != null &&
        score >= FEATURED_SCORE_THRESHOLD &&
        discount != null,
    )
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, MAX_FEATURED_DEALS);
}
