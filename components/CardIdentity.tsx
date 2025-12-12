import Link from "next/link";

import type { Deal } from "@/types/deal";

export type CardIdentityInfo = {
  primary: string | null;
  setName: string | null;
  listingTitle: string | null;
  cardId: number | null;
};

export function buildCardIdentityFromDeal(deal: Deal): CardIdentityInfo {
  const cardName = deal.card?.name ?? deal.cardName ?? null;
  return {
    primary: cardName && cardName.trim().length > 0 ? cardName : deal.title,
    setName: deal.card?.setName ?? deal.setName ?? null,
    listingTitle: deal.title ?? null,
    cardId: deal.card?.id ?? deal.cardId ?? null,
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
  const { primary, setName, listingTitle, cardId } = identity;

  return (
    <div className={`flex flex-col space-y-0.5 leading-tight ${className}`}>
      {primaryHref ? (
        <Link
          href={primaryHref}
          target={titleLinkTarget}
          rel="noopener noreferrer"
          className="line-clamp-2 break-words text-base font-semibold text-slate-900 hover:text-slate-700"
          title={primary ?? undefined}
        >
          {primary}
        </Link>
      ) : (
        <p
          className="line-clamp-2 break-words text-base font-semibold text-slate-900"
          title={primary ?? undefined}
        >
          {primary}
        </p>
      )}
      {setName ? (
        <p
          className="line-clamp-2 break-words text-xs text-slate-500 whitespace-normal"
          title={setName}
        >
          {setName}
        </p>
      ) : null}
      {showListingTitle && listingTitle ? (
        <p
          className="line-clamp-1 text-xs text-slate-400"
          title={listingTitle}
        >
          {listingTitle}
        </p>
      ) : null}
      {showViewCardLink && cardId ? (
        <Link
          href={`/cards/${cardId}`}
          className="text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          View card page
        </Link>
      ) : null}
    </div>
  );
}
