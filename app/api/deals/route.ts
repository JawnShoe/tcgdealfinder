import { NextRequest, NextResponse } from "next/server";
import { runDealsQuery } from "./dealsQuery";
import type { DealsApiSort } from "@/types/dealsApi";

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

  const response = await runDealsQuery({
    sort,
    page: Number.isFinite(pageParam) ? pageParam : undefined,
    pageSize: Number.isFinite(pageSizeParam) ? pageSizeParam : undefined,
  });

  return NextResponse.json(response);
}
