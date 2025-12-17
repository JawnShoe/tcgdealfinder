/**
 * Column specifications for all table variants.
 * Single source of truth for headers, widths, and cell rendering.
 */

import Image from "next/image";
import { CardIdentityBlock, buildCardIdentityFromDeal } from "../components/CardIdentity";
import { TrustedBadge } from "../components/TrustedBadge";
import { ConfidenceChip } from "../components/ConfidenceChip";
import { SellerNameWithTooltip } from "../components/SellerNameWithTooltip";
import { getSellerDisplayData } from "./sellerDisplay";
import type { DealViewModel } from "./dealViewModel";
import {
  formatCurrency,
  formatDiscount,
  formatEndsAt,
  formatCondition,
  formatMarket,
  discountClass,
} from "./dealFormatting";
import { MarketFlag } from "../components/MarketFlag";
import { TABLE_TH, TABLE_TH_RIGHT, TABLE_TH_NOWRAP, TABLE_TD, TABLE_TD_RIGHT, NUM_CELL, NUM_CELL_SECONDARY } from "./typography";

export type ColumnKey =
  | "card"
  | "listing"
  | "condition"
  | "total"
  | "historic"
  | "discount"
  | "score"
  | "priceConf"
  | "seller"
  | "market"
  | "ends";

export type ColumnSpec = {
  key: ColumnKey;
  headerLabel: string;
  headerClassName: string;
  cellClassName: string;
  width?: string; // e.g., "w-[280px]" or undefined for flexible
  renderCell: (vm: DealViewModel, options?: RenderOptions) => JSX.Element;
  // Sort metadata (optional, only used by TopDealsClient and CardDetailClient)
  sortable?: boolean;
  sortKey?: keyof DealViewModel;
  defaultDirection?: "asc" | "desc";
};

export type RenderOptions = {
  showListingTitle?: boolean;
  showViewCardLink?: boolean;
  isAdmin?: boolean;
  adminSecret?: string;
};

/**
 * Column definitions (shared building blocks)
 */

const CardColumn: ColumnSpec = {
  key: "card",
  headerLabel: "Card",
  headerClassName: `${TABLE_TH}`,
  cellClassName: `${TABLE_TD}`,
  width: "w-[320px] min-w-[320px]",
  renderCell: (vm, options) => {
    // Prefer stock image (TCGplayer) over listing thumbnail
    const imageUrl = vm.stockImageUrl ?? vm.thumbnailUrl;
    return (
      <div className="flex items-start gap-2.5">
        {imageUrl ? (
          <div className="flex h-16 w-16 md:h-12 md:w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white">
            <Image
              src={imageUrl}
              alt={vm.deal.title}
              width={64}
              height={64}
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex h-16 w-16 md:h-12 md:w-12 flex-shrink-0 items-center justify-center rounded border border-dashed border-slate-300 bg-white" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <CardIdentityBlock
            identity={buildCardIdentityFromDeal(vm.deal)}
            primaryHref={vm.affiliateUrl}
            showListingTitle={options?.showListingTitle ?? false}
            showViewCardLink={options?.showViewCardLink ?? true}
          />
          {vm.deal.historicBaselineConfidence === "none" ? (
            <p className="text-xs text-amber-600">
              {baselineBadgeLabel(vm.deal.historicBaselineBucketUsed)}
            </p>
          ) : null}
        </div>
      </div>
    );
  },
};

const CardColumnNarrow: ColumnSpec = {
  ...CardColumn,
  width: "w-[280px] min-w-[280px]",
};

const ListingColumn: ColumnSpec = {
  key: "listing",
  headerLabel: "Listing",
  headerClassName: `${TABLE_TH}`,
  cellClassName: `${TABLE_TD}`,
  width: "w-[320px] min-w-[320px]",
  renderCell: (vm, options) => (
    <div className="flex items-start gap-2.5">
      {vm.thumbnailUrl ? (
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white">
          <Image
            src={vm.thumbnailUrl}
            alt={vm.deal.title}
            width={64}
            height={64}
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded border border-dashed border-slate-300 bg-white" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <a
          href={vm.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-sm font-medium text-slate-900 hover:text-blue-600"
        >
          {vm.deal.title}
        </a>
        <p className="text-xs text-slate-500">
          {formatCondition(vm.conditionLabel)}
        </p>
      </div>
    </div>
  ),
};

const ConditionColumn: ColumnSpec = {
  key: "condition",
  headerLabel: "Condition",
  headerClassName: `${TABLE_TH}`,
  cellClassName: `${TABLE_TD}`,
  renderCell: (vm) => (
    <span className="text-sm text-slate-700">
      {formatCondition(vm.conditionLabel)}
    </span>
  ),
};

const TotalColumn: ColumnSpec = {
  key: "total",
  headerLabel: "Total USD",
  headerClassName: `${TABLE_TH_RIGHT} ${TABLE_TH_NOWRAP}`,
  cellClassName: `${TABLE_TD_RIGHT}`,
  width: "w-[120px]",
  renderCell: (vm) => (
    <span className={NUM_CELL}>{formatCurrency(vm.totalUsd)}</span>
  ),
};

const HistoricColumn: ColumnSpec = {
  key: "historic",
  headerLabel: "Historic USD",
  headerClassName: `${TABLE_TH_RIGHT} ${TABLE_TH_NOWRAP}`,
  cellClassName: `${TABLE_TD_RIGHT}`,
  width: "w-[120px]",
  renderCell: (vm) => (
    <span className={NUM_CELL_SECONDARY}>{formatCurrency(vm.historicUsd)}</span>
  ),
};

const DiscountColumn: ColumnSpec = {
  key: "discount",
  headerLabel: "Discount",
  headerClassName: `${TABLE_TH_RIGHT}`,
  cellClassName: `${TABLE_TD_RIGHT}`,
  renderCell: (vm) => (
    <span className={`${discountClass(vm.discountPercent)} ${NUM_CELL} whitespace-nowrap`}>
      {formatDiscount(vm.discountPercent)}
    </span>
  ),
};

const ScoreColumn: ColumnSpec = {
  key: "score" as ColumnKey,
  headerLabel: "Score",
  headerClassName: `${TABLE_TH_RIGHT}`,
  cellClassName: `${TABLE_TD_RIGHT}`,
  width: "w-[80px]",
  renderCell: (vm) => {
    const scoreClass = vm.score !== null && vm.score >= 80 ? "text-emerald-600" : vm.score !== null && vm.score >= 60 ? "text-slate-900" : "text-slate-600";
    return (
      <span className={`${scoreClass} ${NUM_CELL} font-semibold`}>
        {vm.score !== null ? Math.round(vm.score) : "--"}
      </span>
    );
  },
};

const PriceConfColumn: ColumnSpec = {
  key: "priceConf",
  headerLabel: "Price conf.",
  headerClassName: `${TABLE_TH} ${TABLE_TH_NOWRAP}`,
  cellClassName: `${TABLE_TD}`,
  renderCell: (vm) => (
    <ConfidenceChip
      weightLabel={vm.priceConfidenceLabel}
      sampleSize={vm.sampleSize}
      center={false}
    />
  ),
};

const PriceConfColumnCentered: ColumnSpec = {
  ...PriceConfColumn,
  headerClassName: `${TABLE_TH} ${TABLE_TH_NOWRAP} text-center`,
  cellClassName: `${TABLE_TD} text-center`,
  renderCell: (vm) => (
    <ConfidenceChip
      weightLabel={vm.priceConfidenceLabel}
      sampleSize={vm.sampleSize}
      center={true}
    />
  ),
};

const SellerColumn: ColumnSpec = {
  key: "seller",
  headerLabel: "Seller",
  headerClassName: `${TABLE_TH}`,
  cellClassName: `${TABLE_TD}`,
  width: "w-[160px]",
  renderCell: (vm) => (
    <div className="flex min-w-0 items-center gap-2">
      <SellerNameWithTooltip
        seller={getSellerDisplayData({
          username: vm.deal.sellerUsername,
          storeName: vm.deal.sellerStoreName,
          feedbackCount: vm.deal.sellerFeedbackCount,
          feedbackPercent: vm.deal.sellerPositivePercent,
        })}
        className="truncate max-w-[120px] text-slate-600"
      />
      {vm.trustedSeller ? <TrustedBadge className="flex-none" /> : null}
    </div>
  ),
};

const SellerColumnNarrow: ColumnSpec = {
  ...SellerColumn,
  width: "w-[140px]",
  renderCell: (vm) => (
    <div className="flex min-w-0 items-center gap-2">
      <SellerNameWithTooltip
        seller={getSellerDisplayData({
          username: vm.deal.sellerUsername,
          storeName: vm.deal.sellerStoreName,
          feedbackCount: vm.deal.sellerFeedbackCount,
          feedbackPercent: vm.deal.sellerPositivePercent,
        })}
        className="truncate max-w-[100px] text-slate-600"
      />
      {vm.trustedSeller ? <TrustedBadge className="flex-none" /> : null}
    </div>
  ),
};

const MarketColumn: ColumnSpec = {
  key: "market",
  headerLabel: "Market",
  headerClassName: `${TABLE_TH}`,
  cellClassName: `${TABLE_TD}`,
  renderCell: (vm) => {
    const { code, label } = formatMarket(vm.deal.market);
    return (
      <span title={label} className="flex items-center gap-1">
        <MarketFlag market={vm.deal.market} />
        <span>{code}</span>
      </span>
    );
  },
};

const MarketColumnNarrow: ColumnSpec = {
  ...MarketColumn,
  width: "w-[80px]",
};

const EndsColumn: ColumnSpec = {
  key: "ends",
  headerLabel: "Ends",
  headerClassName: `${TABLE_TH}`,
  cellClassName: `${TABLE_TD}`,
  width: "w-[96px]",
  renderCell: (vm) => (
    <span className="whitespace-normal text-sm text-slate-600">
      {formatEndsAt(vm.deal.endsAt)}
    </span>
  ),
};

/**
 * Variant configurations
 */

export const HomepageColumns: ColumnSpec[] = [
  CardColumn,
  TotalColumn,
  HistoricColumn,
  DiscountColumn,
  SellerColumn,
  MarketColumn,
  EndsColumn,
];

export const NewestColumns: ColumnSpec[] = [
  CardColumnNarrow,
  TotalColumn,
  HistoricColumn,
  DiscountColumn,
  PriceConfColumnCentered,
  SellerColumnNarrow,
  MarketColumnNarrow,
  EndsColumn,
];

export const CardDetailListingsColumns: ColumnSpec[] = [
  ListingColumn,
  { ...TotalColumn, sortable: true, sortKey: "totalUsd", defaultDirection: "asc" },
  { ...HistoricColumn, sortable: true, sortKey: "historicUsd", defaultDirection: "desc" },
  { ...DiscountColumn, sortable: true, sortKey: "discountPercent", defaultDirection: "desc" },
  PriceConfColumnCentered,
  SellerColumn,
  MarketColumn,
  { ...EndsColumn, sortable: true, sortKey: "endsAtMs", defaultDirection: "asc" },
];

export const TopDealsColumns: ColumnSpec[] = [
  CardColumn,
  ConditionColumn,
  { ...TotalColumn, sortable: true, sortKey: "totalUsd", defaultDirection: "asc" },
  { ...HistoricColumn, sortable: true, sortKey: "historicUsd", defaultDirection: "desc" },
  { ...DiscountColumn, sortable: true, sortKey: "discountPercent", defaultDirection: "desc" },
  { ...ScoreColumn, sortable: true, sortKey: "score", defaultDirection: "desc" },
  { ...PriceConfColumnCentered, sortable: true, sortKey: "confidenceWeight", defaultDirection: "desc" },
  SellerColumn,
  MarketColumn,
];

export const EndingSoonColumns: ColumnSpec[] = [
  CardColumn,
  TotalColumn,
  HistoricColumn,
  DiscountColumn,
  SellerColumn,
  MarketColumn,
  EndsColumn,
];

/**
 * Get columns by variant name
 */
export function getColumnsByVariant(variant: string): ColumnSpec[] {
  switch (variant) {
    case "homepage":
    case "default":
      return HomepageColumns;
    case "newest":
      return NewestColumns;
    case "cardDetail":
      return CardDetailListingsColumns;
    case "topDeals":
      return TopDealsColumns;
    case "endingSoon":
      return EndingSoonColumns;
    default:
      return HomepageColumns;
  }
}

/**
 * Helper utilities
 */

function baselineBadgeLabel(bucket: string | null | undefined): string {
  if (bucket) {
    const friendly = bucket
      .split("_")
      .filter(Boolean)
      .map((part) => part.toUpperCase())
      .join(" ");
    return friendly ? `No ${friendly} history` : "No baseline yet";
  }
  return "No baseline yet";
}
