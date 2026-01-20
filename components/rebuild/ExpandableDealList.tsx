"use client";

import { useId, useMemo, useState } from "react";
import type { ListingDomain } from "@/lib/rebuild/data/listingMapper";
import ConfidenceBadge from "@/components/rebuild/ConfidenceBadge";
import IntentPrefetchLink from "@/components/rebuild/IntentPrefetchLink";
import { buildListingUrl } from "@/lib/rebuild/urls";

type ExpandableDealListItem = {
  deal: ListingDomain;
  duplicateCount: number;
};

type ExpandableDealListProps = {
  items: ExpandableDealListItem[];
  mode: "home" | "discovery";
  className?: string;
};

function shouldIgnoreRowToggle(eventTarget: EventTarget | null): boolean {
  if (!(eventTarget instanceof HTMLElement)) return false;
  return Boolean(eventTarget.closest("a,button,input,select,textarea"));
}

export default function ExpandableDealList({
  items,
  mode,
  className,
}: ExpandableDealListProps) {
  const [expandedListingId, setExpandedListingId] = useState<string | null>(
    null
  );

  const baseId = useId();
  const itemByListingId = useMemo(
    () => new Map(items.map((item) => [item.deal.listingId, item])),
    [items]
  );

  const toggleExpanded = (listingId: string) => {
    setExpandedListingId((current) =>
      current === listingId ? null : listingId
    );
  };

  return (
    <ul className={`mt-4 divide-y divide-slate-100 ${className ?? ""}`}>
      {items.map(({ deal, duplicateCount }) => {
        const listingId = deal.listingId;
        const expanded = expandedListingId === listingId;
        const panelId = `${baseId}-${listingId}-inspection`;
        const sellerLabel =
          deal.seller.name ?? deal.seller.username ?? "Unknown";
        const marketLabel = deal.provenance.market ?? deal.provenance.source;

        return (
          <li key={listingId} className="py-3">
            <div
              data-testid="rebuild-deal-row"
              data-listing-id={listingId}
              role="button"
              tabIndex={0}
              aria-expanded={expanded}
              aria-controls={panelId}
              className="rounded-md px-2 py-2 -mx-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              onClick={(event) => {
                if (shouldIgnoreRowToggle(event.target)) return;
                toggleExpanded(listingId);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  if (shouldIgnoreRowToggle(event.target)) return;
                  event.preventDefault();
                  toggleExpanded(listingId);
                  return;
                }
                if (event.key === "Escape") {
                  if (!expanded) return;
                  event.preventDefault();
                  setExpandedListingId(null);
                }
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <IntentPrefetchLink
                    data-testid="rebuild-deal-row-title"
                    href={buildListingUrl({ id: listingId })}
                    className="text-sm font-medium text-slate-900 hover:text-slate-700"
                  >
                    {deal.title}
                  </IntentPrefetchLink>

                  <p className="mt-1 text-xs text-slate-500">
                    {sellerLabel} at {marketLabel}
                  </p>

                  {mode === "discovery" ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {deal.condition
                        ? `Condition ${deal.condition}`
                        : "Condition unknown"}{" "}
                      · {deal.language} · {deal.freshness.dataAgeLabel}
                    </p>
                  ) : null}

                  {duplicateCount > 0 ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Also seen in {duplicateCount} other market
                      {duplicateCount !== 1 ? "s" : ""}
                    </p>
                  ) : null}
                </div>

                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {deal.price.display}
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      (deal.price.discountPercent ?? 0) < 0
                        ? "text-emerald-700"
                        : "text-slate-500"
                    }`}
                  >
                    {deal.price.deltaDisplay}
                  </p>

                  {mode === "discovery" ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Confidence {deal.trust.confidence.display} ·{" "}
                      {deal.trustAssessment.state.toLowerCase()}
                    </p>
                  ) : null}

                  <ConfidenceBadge label={deal.trust.confidence.label} />
                </div>
              </div>

              {expanded ? (
                <div
                  id={panelId}
                  data-testid="rebuild-deal-row-expanded"
                  className="rebuild-inspection-panel mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="font-semibold text-slate-800">
                        Trust & reliability
                      </p>
                      <p className="mt-1">
                        State:{" "}
                        <span className="font-medium text-slate-900">
                          {deal.trustAssessment.state}
                        </span>
                      </p>
                      <p className="mt-1">
                        Confidence:{" "}
                        <span className="font-medium text-slate-900">
                          {deal.trust.confidence.display}
                        </span>
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-600">
                        {(deal.trustAssessment.reasons.length
                          ? deal.trustAssessment.reasons
                          : ["No additional disclosures."]
                        ).map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="font-semibold text-slate-800">
                        Price & provenance
                      </p>
                      <p className="mt-1">
                        Discount:{" "}
                        <span className="font-medium text-slate-900">
                          {deal.price.discountPercent != null
                            ? `${deal.price.discountPercent}%`
                            : "Unknown"}
                        </span>
                      </p>
                      <p className="mt-1">
                        Source:{" "}
                        <span className="font-medium text-slate-900">
                          {deal.provenance.source}
                        </span>
                      </p>
                      <p className="mt-1">
                        Fetched at:{" "}
                        <span className="font-medium text-slate-900">
                          {deal.provenance.fetchedAtISO}
                        </span>
                      </p>
                      <p className="mt-1">
                        Updated at:{" "}
                        <span className="font-medium text-slate-900">
                          {deal.provenance.updatedAtISO ?? "Unknown"}
                        </span>
                      </p>
                      <p className="mt-1">
                        Seller:{" "}
                        <span className="font-medium text-slate-900">
                          {deal.seller.username ?? sellerLabel}
                        </span>
                      </p>
                      <p className="mt-1">
                        Listing:{" "}
                        <IntentPrefetchLink
                          href={buildListingUrl({ id: listingId })}
                          className="font-medium text-slate-700 underline underline-offset-4 hover:text-slate-900"
                        >
                          Open detail
                        </IntentPrefetchLink>
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
