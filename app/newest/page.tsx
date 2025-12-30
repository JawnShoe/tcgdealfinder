import DealsTable from "@/components/DealsTable";
import { runDealsQuery } from "@/app/api/deals/dealsQuery";
import { cookies, headers } from "next/headers";

import { ANON_ID_COOKIE } from "@/lib/anonId";
import {
  MARKET_COOKIE_NAME,
  getGeoCountryFromHeaders,
  resolveMarketPreference,
} from "@/lib/marketPreference";
import { PAGE_TITLE, PAGE_SUBTITLE, TABLE_CONTAINER } from "@/lib/typography";

export default async function NewestListingsPage() {
  const cookieMarket = cookies().get(MARKET_COOKIE_NAME)?.value ?? null;
  const ownerId = cookies().get(ANON_ID_COOKIE)?.value ?? null;
  const geoCountry = getGeoCountryFromHeaders(headers());
  const market = resolveMarketPreference(cookieMarket, geoCountry);
  const initial = await runDealsQuery({
    sort: "newest",
    page: 1,
    market,
    ownerId,
  });

  return (
    <main className="bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-10 space-y-4">
        <div className="space-y-2">
          <h1 className={PAGE_TITLE}>Newest Listings</h1>
          <p className={PAGE_SUBTITLE}>
            Fresh inventory straight from our ingestion pipeline. Some listings
            may be unscored until enough sold data exists.
          </p>
        </div>

        <div className={TABLE_CONTAINER}>
          <DealsTable
            deals={initial.items}
            initialApiMeta={initial}
            variant="newest"
          />
        </div>
      </div>
    </main>
  );
}
