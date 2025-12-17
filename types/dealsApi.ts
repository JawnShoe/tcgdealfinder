import type { Deal } from "./deal";
import type { MarketCode } from "@/lib/markets";

export type DealsApiSort = "best" | "newest" | "endingSoon";

export type DealsApiConfidence = "high" | "medium" | "low" | "none";

export interface DealsApiMeta {
  sort: DealsApiSort;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  market: MarketCode | "all";
}

export interface DealsApiResponse extends DealsApiMeta {
  items: Deal[];
}
