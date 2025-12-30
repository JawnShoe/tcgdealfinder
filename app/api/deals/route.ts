import { NextRequest, NextResponse } from "next/server";
import { runDealsQuery } from "./dealsQuery";
import type { DealsApiSort } from "@/types/dealsApi";
import { normalizeMarketCode } from "@/lib/markets";
import {
  MARKET_COOKIE_NAME,
  getGeoCountryFromRequest,
  resolveMarketPreference,
} from "@/lib/marketPreference";
import { ANON_ID_COOKIE, isValidAnonId } from "@/lib/anonId";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const sortParam = (searchParams.get("sort") ?? "best").toLowerCase();
  const sort: DealsApiSort =
    sortParam === "newest"
      ? "newest"
      : sortParam === "endingsoon" || sortParam === "ending-soon"
        ? "endingSoon"
        : "best";
  const pageParam = Number(searchParams.get("page"));
  const pageSizeParam = Number(searchParams.get("pageSize"));
  const marketParam = searchParams.get("market");
  const cookieMarket = req.cookies.get(MARKET_COOKIE_NAME)?.value ?? null;
  const cookieOwnerId = req.cookies.get(ANON_ID_COOKIE)?.value ?? null;
  const ownerId = isValidAnonId(cookieOwnerId) ? cookieOwnerId : null;
  const geoCountry = getGeoCountryFromRequest(req);
  const resolvedMarket = resolveMarketPreference(cookieMarket, geoCountry);
  const market = normalizeMarketCode(marketParam ?? resolvedMarket);

  const response = await runDealsQuery({
    sort,
    page: Number.isFinite(pageParam) ? pageParam : undefined,
    pageSize: Number.isFinite(pageSizeParam) ? pageSizeParam : undefined,
    market,
    ownerId,
  });

  return NextResponse.json(response);
}
