import Link from "next/link";

import type { Deal } from "@/types/deal";
import { TooltipPopoverClientOnly } from "./TooltipPopoverClientOnly";

export type CardIdentityInfo = {
  primary: string | null;
  setName: string | null;
  listingTitle: string | null;
  cardId: number | null;
  listingId: string | null;
};

export function buildCardIdentityFromDeal(deal: Deal): CardIdentityInfo {
  const cardName = deal.card?.name ?? deal.cardName ?? null;
  return {
    primary: cardName && cardName.trim().length > 0 ? cardName : deal.title,
    setName: deal.card?.setName ?? deal.setName ?? null,
    listingTitle: deal.title ?? null,
    cardId: deal.card?.id ?? deal.cardId ?? null,
    listingId: deal.listingId ?? null,
  };
}

type CardIdentityBlockProps = {
  identity: CardIdentityInfo;
  primaryHref?: string;
  titleLinkTarget?: string;
  showListingTitle?: boolean;
  showViewCardLink?: boolean;
  className?: string;
};

export function CardIdentityBlock({
  identity,
  primaryHref,
  titleLinkTarget = "_blank",
  showListingTitle = false,
  showViewCardLink = true,
  className = "",
}: CardIdentityBlockProps) {
  const { primary, setName, listingTitle, listingId } = identity;

  return (
    <div
      className={`flex min-w-0 flex-1 flex-col space-y-0.5 leading-snug ${className}`}
    >
      {primaryHref ? (
        <Link
          href={primaryHref}
          target={titleLinkTarget}
          rel="noopener noreferrer"
          className="line-clamp-2 break-normal text-base font-bold text-slate-900 hover:text-slate-700"
        >
          {primary}
        </Link>
      ) : (
        <p className="line-clamp-2 break-normal text-base font-bold text-slate-900">
          {primary}
        </p>
      )}
      {setName ? (
        <TooltipPopoverClientOnly
          content={setName}
          ariaLabel="Set name"
          tooltipClassName="tooltip-wide"
          size="medium"
          usePortal={true}
        >
          <span className="line-clamp-2 break-words text-xs text-slate-500 whitespace-normal">
            {setName}
          </span>
        </TooltipPopoverClientOnly>
      ) : null}
      {showListingTitle && listingTitle ? (
        <TooltipPopoverClientOnly
          content={listingTitle}
          ariaLabel="Listing title"
          tooltipClassName="tooltip-wide"
          size="medium"
          usePortal={true}
        >
          <span className="line-clamp-1 text-xs text-slate-400">
            {listingTitle}
          </span>
        </TooltipPopoverClientOnly>
      ) : null}
      {showViewCardLink && listingId ? (
        <Link
          href={`/rebuild/listing/${encodeURIComponent(listingId)}`}
          className="text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          View listing
        </Link>
      ) : null}
    </div>
  );
}
