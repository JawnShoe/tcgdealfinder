"use client";

import { useId, useState } from "react";
import type { ListingDomain } from "@/lib/rebuild/data/listingMapper";
import ConfidenceBadge from "@/components/rebuild/ConfidenceBadge";
import ConfidenceMethodology from "@/components/rebuild/ConfidenceMethodology";
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

function formatMarketIndicator(value: string | null | undefined): string {
  if (!value) return "—";
  const normalized = value.trim().toUpperCase();
  if (normalized === "US") return "🇺🇸 US";
  if (normalized === "CA") return "🇨🇦 CA";
  return "—";
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
  const [expandedConfidenceListingId, setExpandedConfidenceListingId] =
    useState<string | null>(null);

  const baseId = useId();

  const closeAllPanels = () => {
    setExpandedListingId(null);
    setExpandedConfidenceListingId(null);
  };

  return (
    <ul className={`mt-4 divide-y divide-slate-100 ${className ?? ""}`}>
      {items.map(({ deal, duplicateCount }) => {
        const listingId = deal.listingId;
        const expanded = expandedListingId === listingId;
        const confidenceExpanded = expandedConfidenceListingId === listingId;
        const panelId = `${baseId}-${listingId}-inspection`;
        const confidencePanelId = `${baseId}-${listingId}-confidence`;
        const sellerLabel = deal.seller.name ?? deal.seller.username ?? "—";
        const marketIndicator = formatMarketIndicator(deal.provenance.market);
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
          <li key={listingId} className="py-1">
            <div
              data-testid="rebuild-deal-row"
              data-listing-id={listingId}
              data-mode={mode}
              role="button"
              tabIndex={0}
              aria-expanded={expanded}
              aria-controls={panelId}
              className="grid grid-cols-1 rounded-md -mx-2 px-2 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 sm:grid-cols-[minmax(0,1fr)_10rem_9rem_15rem] lg:grid-cols-[minmax(0,1fr)_12rem_10rem_18rem] 2xl:grid-cols-[minmax(0,1fr)_13rem_11rem_20rem]"
              onClick={(event) => {
                if (shouldIgnoreRowToggle(event.target)) return;
                setExpandedConfidenceListingId(null);
                setExpandedListingId((current) =>
                  current === listingId ? null : listingId
                );
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  if (shouldIgnoreRowToggle(event.target)) return;
                  event.preventDefault();
                  setExpandedConfidenceListingId(null);
                  setExpandedListingId((current) =>
                    current === listingId ? null : listingId
                  );
                  return;
                }
                if (event.key === "Escape") {
                  if (!expanded) return;
                  event.preventDefault();
                  closeAllPanels();
                }
              }}
            >
              <div className="col-span-full grid grid-cols-1 items-start gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_10rem_9rem_15rem] sm:items-center lg:grid-cols-[minmax(0,1fr)_12rem_10rem_18rem] 2xl:grid-cols-[minmax(0,1fr)_13rem_11rem_20rem]">
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
                    {sellerLabel} ·{" "}
                    <span
                      data-testid="rebuild-market-indicator"
                      className="font-medium text-slate-600"
                    >
                      {marketIndicator}
                    </span>{" "}
                    · Condition: {conditionLabel} · Lang: {languageLabel}
                  </p>
                </div>

                <div
                  data-testid="rebuild-deal-col-price"
                  className="whitespace-nowrap text-right tabular-nums"
                >
                  <p className="text-lg font-semibold text-slate-900">
                    {deal.price.display === "Unavailable"
                      ? "—"
                      : deal.price.display}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">Historic</p>
                  <p className="text-xs text-slate-700">{"—"}</p>
                </div>

                <div
                  data-testid="rebuild-deal-col-discount"
                  className="whitespace-nowrap text-right tabular-nums"
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
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <span className="whitespace-nowrap">Confidence</span>
                    <button
                      type="button"
                      data-testid="rebuild-confidence-button"
                      aria-label={
                        expanded
                          ? "Toggle confidence details"
                          : "Open confidence details"
                      }
                      aria-expanded={expanded && confidenceExpanded}
                      aria-controls={confidencePanelId}
                      className="inline-flex min-w-0 items-center gap-2 rounded-md px-1 py-0.5 text-left hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        if (!expanded) {
                          setExpandedListingId(listingId);
                          setExpandedConfidenceListingId(listingId);
                          return;
                        }

                        setExpandedConfidenceListingId((current) =>
                          current === listingId ? null : listingId
                        );
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Escape") return;
                        if (!expanded || !confidenceExpanded) return;
                        event.preventDefault();
                        event.stopPropagation();
                        setExpandedConfidenceListingId(null);
                      }}
                    >
                      <span className="-mt-1 shrink-0">
                        <ConfidenceBadge label={deal.trust.confidence.label} />
                      </span>
                      <span className="min-w-0 truncate whitespace-nowrap text-slate-400">
                        {confidenceScoreLabel}
                      </span>
                    </button>
                  </div>
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <span className="whitespace-nowrap">Trust</span>
                    {deal.trustAssessment.state === "VERIFIED" ? (
                      <span
                        data-testid="rebuild-trusted-badge"
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                      >
                        <span aria-hidden="true">✓</span>
                        Verified
                      </span>
                    ) : (
                      <span className="min-w-0 truncate text-slate-700">
                        {deal.trustAssessment.state}
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <span className="whitespace-nowrap">Seller</span>
                    <span className="min-w-0 truncate text-slate-700">
                      {feedbackCountLabel}
                    </span>
                  </div>
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <span
                      className={
                        emphasis === "freshness"
                          ? "font-medium text-slate-900"
                          : "whitespace-nowrap"
                      }
                    >
                      Seen
                    </span>
                    <span
                      className={
                        emphasis === "freshness"
                          ? "whitespace-nowrap font-medium text-slate-900"
                          : "min-w-0 truncate whitespace-nowrap text-slate-700"
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
                  onKeyDownCapture={(event) => {
                    if (event.key !== "Escape") return;
                    if (!confidenceExpanded) return;
                    event.preventDefault();
                    event.stopPropagation();
                    setExpandedConfidenceListingId(null);
                  }}
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

                      {confidenceExpanded ? (
                        <div
                          id={confidencePanelId}
                          data-testid="rebuild-confidence-panel"
                          className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                        >
                          <p className="font-semibold text-slate-800">
                            Confidence
                          </p>

                          <dl className="mt-2 grid gap-2">
                            <div className="flex items-start justify-between gap-3">
                              <dt className="text-slate-500">Level</dt>
                              <dd className="text-right font-medium text-slate-900">
                                {deal.trust.confidence.label}
                              </dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <dt className="text-slate-500">Score</dt>
                              <dd className="text-right font-medium text-slate-900">
                                {deal.trust.confidence.display || "—"}
                              </dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <dt className="text-slate-500">Data age</dt>
                              <dd className="text-right font-medium text-slate-900">
                                {deal.trust.dataAgeLabel || "—"}
                              </dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <dt className="text-slate-500">Shipping</dt>
                              <dd className="text-right font-medium text-slate-900">
                                {deal.reliability.shippingKnown == null
                                  ? "—"
                                  : deal.reliability.shippingKnown
                                    ? "Known"
                                    : "Unknown"}
                              </dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <dt className="text-slate-500">Integrity</dt>
                              <dd className="text-right font-medium text-slate-900">
                                {deal.reliability.integrityStatus || "—"}
                              </dd>
                            </div>
                            {deal.reliability.integrityReason ? (
                              <div className="flex items-start justify-between gap-3">
                                <dt className="text-slate-500">Reason</dt>
                                <dd className="min-w-0 max-w-[16rem] truncate text-right font-medium text-slate-900">
                                  {deal.reliability.integrityReason}
                                </dd>
                              </div>
                            ) : null}
                            <div className="flex items-start justify-between gap-3">
                              <dt className="text-slate-500">Risk flags</dt>
                              <dd className="min-w-0 max-w-[16rem] truncate text-right font-medium text-slate-900">
                                {deal.riskFlags.length
                                  ? deal.riskFlags.join(", ")
                                  : "—"}
                              </dd>
                            </div>
                          </dl>

                          <p className="mt-3 font-semibold text-slate-800">
                            Transparency
                          </p>
                          <dl className="mt-2 grid gap-2">
                            <div className="flex items-start justify-between gap-3">
                              <dt className="text-slate-500">Fetched at</dt>
                              <dd className="min-w-0 max-w-[18rem] truncate text-right font-mono text-[11px] text-slate-900">
                                {deal.trust.fetchedAtISO || "—"}
                              </dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <dt className="text-slate-500">Source</dt>
                              <dd className="min-w-0 max-w-[18rem] truncate text-right font-mono text-[11px] text-slate-900">
                                {deal.trust.source || "—"}
                              </dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <dt className="text-slate-500">Pipeline</dt>
                              <dd className="min-w-0 max-w-[18rem] truncate text-right font-mono text-[11px] text-slate-900">
                                {deal.transparency.pipelineVersion || "—"}
                              </dd>
                            </div>
                          </dl>

                          {deal.transparency.inputs.length ? (
                            <div className="mt-3">
                              <p className="font-semibold text-slate-800">
                                Inputs (lite)
                              </p>
                              <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-600">
                                {deal.transparency.inputs.map((input) => (
                                  <li key={input}>{input}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          <p className="mt-3 font-semibold text-slate-800">
                            How confidence is calculated
                          </p>
                          <div className="mt-2 grid gap-2 text-slate-700">
                            <ConfidenceMethodology />
                          </div>
                        </div>
                      ) : null}

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
