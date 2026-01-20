"use client";

import { useId, useState } from "react";
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
  sortPreset?: string;
  className?: string;
};

function shouldIgnoreRowToggle(eventTarget: EventTarget | null): boolean {
  if (!(eventTarget instanceof HTMLElement)) return false;
  return Boolean(eventTarget.closest("a,button,input,select,textarea"));
}

export default function ExpandableDealList({
  items,
  mode,
  sortPreset,
  className,
}: ExpandableDealListProps) {
  const [expandedListingId, setExpandedListingId] = useState<string | null>(
    null
  );

  const baseId = useId();

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
        const sellerLabel = deal.seller.name ?? deal.seller.username ?? "—";
        const marketLabel = deal.provenance.market ?? deal.provenance.source;
        const conditionLabel = deal.condition ?? "—";
        const languageLabel = deal.language ?? "—";
        const ageLabel = deal.freshness.dataAgeLabel || "—";
        const feedbackCountLabel =
          deal.seller.feedbackCount != null
            ? `⭐ ${deal.seller.feedbackCount}+ sales`
            : "—";
        const discountPercent = deal.price.discountPercent;
        const discountValueLabel =
          discountPercent == null
            ? "—"
            : `${discountPercent > 0 ? "+" : ""}${discountPercent}%`;
        const confidenceScoreLabel =
          deal.trust.confidence.display === "Unknown"
            ? "—"
            : deal.trust.confidence.display || "—";

        const emphasis =
          sortPreset === "biggest-discount"
            ? "discount"
            : sortPreset === "endingSoon"
              ? "freshness"
              : sortPreset === "newest"
                ? "freshness"
                : "default";

        return (
          <li key={listingId} className="py-2">
            <div
              data-testid="rebuild-deal-row"
              data-listing-id={listingId}
              data-mode={mode}
              role="button"
              tabIndex={0}
              aria-expanded={expanded}
              aria-controls={panelId}
              className="grid grid-cols-1 rounded-md -mx-2 px-2 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 sm:grid-cols-[minmax(0,1fr)_10rem_9rem_15rem] lg:grid-cols-[minmax(0,1fr)_11rem_10rem_18rem]"
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
              <div className="col-span-full grid grid-cols-1 items-start gap-x-6 gap-y-2 sm:grid-cols-[minmax(0,1fr)_10rem_9rem_15rem] sm:items-center lg:grid-cols-[minmax(0,1fr)_11rem_10rem_18rem]">
                <div
                  data-testid="rebuild-deal-col-identity"
                  className="min-w-0"
                >
                  <IntentPrefetchLink
                    data-testid="rebuild-deal-row-title"
                    href={buildListingUrl({ id: listingId })}
                    className="block truncate text-sm font-medium text-slate-900 hover:text-slate-700"
                  >
                    {deal.title}
                  </IntentPrefetchLink>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {sellerLabel} · {marketLabel} · Condition: {conditionLabel}{" "}
                    · Lang: {languageLabel}
                  </p>
                </div>

                <div
                  data-testid="rebuild-deal-col-price"
                  className="text-right tabular-nums"
                >
                  <p className="text-lg font-semibold text-slate-900">
                    {deal.price.display === "Unavailable"
                      ? "—"
                      : deal.price.display}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">Historic</p>
                  <p className="text-xs text-slate-700">
                    {deal.price.historicDisplay === "Unavailable" ||
                    deal.price.historicDisplay == null
                      ? "—"
                      : deal.price.historicDisplay}
                  </p>
                </div>

                <div
                  data-testid="rebuild-deal-col-discount"
                  className="text-right tabular-nums"
                >
                  <p
                    className={`text-sm font-medium ${
                      discountPercent == null
                        ? "text-slate-400"
                        : discountPercent < 0
                          ? "text-emerald-700"
                          : "text-slate-700"
                    }`}
                  >
                    {discountValueLabel}
                  </p>
                  <p
                    className={`mt-0.5 text-xs ${
                      emphasis === "discount"
                        ? "font-medium text-slate-900"
                        : "text-slate-500"
                    }`}
                  >
                    vs market
                  </p>
                </div>

                <div
                  data-testid="rebuild-deal-col-trust"
                  className="grid gap-y-1 text-xs text-slate-500"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span>Confidence</span>
                    <div className="flex items-center gap-2">
                      <span className="-mt-1">
                        <ConfidenceBadge label={deal.trust.confidence.label} />
                      </span>
                      <span className="text-slate-400">
                        {confidenceScoreLabel}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Trust</span>
                    <span className="text-slate-700">
                      {deal.trustAssessment.state}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Seller</span>
                    <span className="text-slate-700">{feedbackCountLabel}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={
                        emphasis === "freshness"
                          ? "font-medium text-slate-900"
                          : undefined
                      }
                    >
                      Seen
                    </span>
                    <span
                      className={
                        emphasis === "freshness"
                          ? "font-medium text-slate-900"
                          : "text-slate-700"
                      }
                    >
                      {ageLabel}
                    </span>
                  </div>
                </div>
              </div>

              {expanded ? (
                <div
                  id={panelId}
                  data-testid="rebuild-deal-row-expanded"
                  className="rebuild-inspection-panel col-span-full mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700"
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
                            : "—"}
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
                          {deal.provenance.updatedAtISO ?? "—"}
                        </span>
                      </p>
                      <p className="mt-1">
                        Seller:{" "}
                        <span className="font-medium text-slate-900">
                          {deal.seller.username ?? sellerLabel}
                        </span>
                      </p>
                      <p className="mt-1">
                        Also seen in:{" "}
                        <span className="font-medium text-slate-900">
                          {duplicateCount > 0
                            ? `${duplicateCount} other market${
                                duplicateCount !== 1 ? "s" : ""
                              }`
                            : "—"}
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
