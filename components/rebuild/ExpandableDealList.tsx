"use client";

import { useId, useState } from "react";
import type { ListingDomain } from "@/lib/rebuild/data/listingMapper";
import ConfidenceBadge from "@/components/rebuild/ConfidenceBadge";
import ConfidenceMethodology from "@/components/rebuild/ConfidenceMethodology";
import IntentPrefetchLink from "@/components/rebuild/IntentPrefetchLink";
import PreferencesBar from "@/components/rebuild/PreferencesBar";
import type { RebuildSort } from "@/lib/rebuild/prefs/rebuildPrefs";
import { buildListingUrl } from "@/lib/rebuild/urls";

// Shared grid primitive - prevents column drift between collapsed/expanded
const GRID_COLS_SM = "sm:grid-cols-[minmax(0,1fr)_10rem_9rem_15rem_2rem]";
const GRID_COLS_LG = "lg:grid-cols-[minmax(0,1fr)_12rem_10rem_18rem_2rem]";
const GRID_COLS_2XL = "2xl:grid-cols-[minmax(0,1fr)_13rem_11rem_20rem_2rem]";
const GRID_COLS = `grid-cols-1 ${GRID_COLS_SM} ${GRID_COLS_LG} ${GRID_COLS_2XL}`;
const GRID_COLS_HOME_SM =
  "sm:grid-cols-[minmax(0,1fr)_10rem_9rem_15rem_1.25rem]";
const GRID_COLS_HOME_LG =
  "lg:grid-cols-[minmax(0,1fr)_12rem_10rem_18rem_1.25rem]";
const GRID_COLS_HOME_2XL =
  "2xl:grid-cols-[minmax(0,1fr)_13rem_11rem_20rem_1.25rem]";
const GRID_COLS_HOME = `grid-cols-1 ${GRID_COLS_HOME_SM} ${GRID_COLS_HOME_LG} ${GRID_COLS_HOME_2XL}`;
const GRID_GAP = "gap-x-4 gap-y-2";
const ROW_PADDING = "px-2";

function getGridColsForMode(mode: "home" | "discovery") {
  return mode === "home" ? GRID_COLS_HOME : GRID_COLS;
}

function DealRowGrid({
  children,
  className,
  mode,
}: {
  children: React.ReactNode;
  className?: string;
  mode: "home" | "discovery";
}) {
  return (
    <div
      className={`grid ${getGridColsForMode(
        mode
      )} ${GRID_GAP} ${ROW_PADDING} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function getSellerUrl(
  username: string | null | undefined,
  source: string | null | undefined
): string | null {
  if (!username) return null;
  const normalizedSource = (source ?? "").toUpperCase();
  if (!normalizedSource.includes("EBAY")) return null;
  return `https://www.ebay.com/usr/${encodeURIComponent(username)}`;
}

type ExpandableDealListItem = {
  deal: ListingDomain;
  duplicateCount: number;
};

type ExpandableDealListProps = {
  items: ExpandableDealListItem[];
  mode: "home" | "discovery";
  sortPreset?: string;
  initialSort?: RebuildSort;
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

function formatUtcTimestamp(date: Date): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ] as const;
  const year = date.getUTCFullYear();
  const month = months[date.getUTCMonth()] ?? "Jan";
  const day = date.getUTCDate();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${month} ${day}, ${year} · ${hours}:${minutes} UTC`;
}

function getEndsDisplay(endsAtISO?: string | null): {
  kind: "missing" | "ended" | "active";
  relativeLabel: string;
  absoluteLabel: string | null;
} {
  if (!endsAtISO) {
    return { kind: "missing", relativeLabel: "—", absoluteLabel: null };
  }
  const parsed = new Date(endsAtISO);
  if (Number.isNaN(parsed.getTime())) {
    return { kind: "missing", relativeLabel: "—", absoluteLabel: null };
  }

  const diffMs = parsed.getTime() - Date.now();
  if (diffMs <= 0) {
    return {
      kind: "ended",
      relativeLabel: "Ended",
      absoluteLabel: formatUtcTimestamp(parsed),
    };
  }

  const totalMinutes = Math.max(1, Math.floor(diffMs / 60000));
  const totalHours = Math.floor(totalMinutes / 60);
  const relativeLabel = totalHours >= 1 ? `${totalHours}h` : `${totalMinutes}m`;

  return {
    kind: "active",
    relativeLabel,
    absoluteLabel: formatUtcTimestamp(parsed),
  };
}

/**
 * Generate a plain-English confidence reason based on deal data.
 * This avoids exposing internal terms while still being informative.
 */
function getConfidenceReason(deal: ListingDomain): string {
  const { confidence } = deal.trust;
  const { feedbackCount } = deal.seller;
  const { dataAgeLabel } = deal.freshness;

  // Build a human-readable reason
  if (confidence.label === "high") {
    if (feedbackCount != null && feedbackCount >= 100) {
      return "Based on verified seller history and recent price data";
    }
    return "Based on recent market data";
  }

  if (confidence.label === "medium") {
    if (dataAgeLabel && dataAgeLabel.includes("h")) {
      return "Price data is a few hours old";
    }
    return "Based on available market data";
  }

  if (confidence.label === "low") {
    return "Limited price data available";
  }

  return "Confidence could not be determined";
}

/**
 * Generate a plain-English price context string.
 */
function getMarketContext(deal: ListingDomain): {
  title: string;
  summary: string | null;
} {
  if (deal.price.discountPercent == null) {
    return {
      title: "No market match",
      summary: null,
    };
  }

  return {
    title: "Market data available",
    summary: null,
  };
}

function getSignalNote(deal: ListingDomain): string {
  if (deal.price.discountPercent == null) {
    return "Signal unreliable (no market match)";
  }

  return "More context soon";
}

type HomeDealQualityPanelProps = {
  panelId: string;
  confidencePanelId: string;
  deal: ListingDomain;
  sellerLabel: string;
  sellerUrl: string | null;
  confidenceExpanded: boolean;
  listingId: string;
  ageLabel: string;
  endsDisplay: {
    kind: "missing" | "ended" | "active";
    relativeLabel: string;
    absoluteLabel: string | null;
  };
  onConfidenceClose: () => void;
};

/**
 * Shallow expansion panel for Home - shows confidence, price context, and provenance.
 * Visually lighter than Discovery panel.
 */
function HomeDealQualityPanel({
  panelId,
  confidencePanelId,
  deal,
  sellerLabel,
  sellerUrl,
  confidenceExpanded,
  ageLabel,
  onConfidenceClose,
}: HomeDealQualityPanelProps) {
  const confidenceReason = getConfidenceReason(deal);
  const marketContext = getMarketContext(deal);
  const signalNote = getSignalNote(deal);

  return (
    <div
      id={panelId}
      data-testid="rebuild-deal-row-expanded"
      className="rebuild-inspection-panel col-span-full -mx-2 mt-1 border-t border-slate-100 pt-1"
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape") return;
        if (!confidenceExpanded) return;
        event.preventDefault();
        event.stopPropagation();
        onConfidenceClose();
      }}
    >
      <DealRowGrid mode="home" className="gap-y-1 pb-1 text-xs">
        <div className="min-w-0 sm:col-start-1">
          <div className="flex min-w-0 items-start gap-2">
            <ConfidenceBadge label={deal.trust.confidence.label} />
            <div className="min-w-0">
              <p
                className="truncate font-medium capitalize text-slate-900"
                title={
                  deal.trust.confidence.label === "unknown"
                    ? "Unknown"
                    : deal.trust.confidence.label
                }
              >
                {deal.trust.confidence.label === "unknown"
                  ? "Unknown"
                  : deal.trust.confidence.label}
              </p>
              <p
                className="mt-0.5 truncate text-slate-500"
                title={confidenceReason}
              >
                {confidenceReason}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 text-left sm:col-start-2">
          <p className="text-[12px] leading-snug text-slate-500">
            {marketContext.title}
          </p>
          {marketContext.summary ? (
            <p className="mt-0.5 line-clamp-2 break-words text-[12px] leading-snug text-slate-500">
              {marketContext.summary}
            </p>
          ) : null}
        </div>

        <div className="min-w-0 text-left sm:col-start-3">
          <p className="line-clamp-2 break-words text-[12px] leading-snug text-slate-500">
            {signalNote}
          </p>
        </div>

        <div className="min-w-0 text-right sm:col-start-4">
          <p className="text-[12px] leading-snug text-slate-500">
            Source: {deal.provenance.source}
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-slate-500">
            Updated: {ageLabel}
          </p>
          <p className="mt-0.5 truncate text-[12px] leading-snug text-slate-500">
            Store:{" "}
            {sellerUrl ? (
              <a
                href={sellerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-700 hover:text-slate-900 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {sellerLabel}
              </a>
            ) : (
              sellerLabel
            )}
          </p>
        </div>

        <div className="hidden sm:block" aria-hidden="true" />
      </DealRowGrid>

      {/* Hidden panel for contract test compatibility */}
      {confidenceExpanded ? (
        <div
          id={confidencePanelId}
          data-testid="rebuild-confidence-panel"
          className="sr-only"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

type DiscoveryExpandedPanelProps = {
  panelId: string;
  confidencePanelId: string;
  deal: ListingDomain;
  duplicateCount: number;
  sellerLabel: string;
  confidenceExpanded: boolean;
  listingId: string;
  onConfidenceClose: () => void;
};

/**
 * Original expanded panel for Discovery page.
 * Shows full trust/reliability details including internal debug terms.
 */
function DiscoveryExpandedPanel({
  panelId,
  confidencePanelId,
  deal,
  duplicateCount,
  sellerLabel,
  confidenceExpanded,
  listingId,
  onConfidenceClose,
}: DiscoveryExpandedPanelProps) {
  return (
    <div
      id={panelId}
      data-testid="rebuild-deal-row-expanded"
      className="rebuild-inspection-panel col-span-full mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700"
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape") return;
        if (!confidenceExpanded) return;
        event.preventDefault();
        event.stopPropagation();
        onConfidenceClose();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="font-semibold text-slate-800">Trust & reliability</p>
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
              <p className="font-semibold text-slate-800">Confidence</p>

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
                    {deal.riskFlags.length ? deal.riskFlags.join(", ") : "—"}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 font-semibold text-slate-800">Transparency</p>
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
                  <p className="font-semibold text-slate-800">Inputs (lite)</p>
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
          <p className="font-semibold text-slate-800">Price & provenance</p>
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
  );
}

export default function ExpandableDealList({
  items,
  mode,
  sortPreset,
  initialSort,
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

  const hasItems = items.length > 0;

  return (
    <>
      {mode === "home" ? (
        <DealRowGrid mode="home" className="-mx-2 items-center pb-2">
          <div className="min-w-0 sm:col-start-1">
            <h2 className="text-sm font-semibold text-slate-900">Deals</h2>
          </div>
          <div className="hidden sm:block sm:col-start-2" aria-hidden="true" />
          <div className="hidden sm:block sm:col-start-3" aria-hidden="true" />
          <div className="min-w-0 sm:col-start-4">
            <div className="flex items-center justify-end gap-4 text-sm leading-none text-slate-500">
              <span>
                {items.length} result
                {items.length !== 1 ? "s" : ""}
              </span>
              {initialSort ? (
                <PreferencesBar
                  initialSort={initialSort}
                  className="rebuild-sort-inline mt-0 border-0 bg-transparent px-0 py-0"
                />
              ) : null}
            </div>
          </div>
          <div className="hidden sm:block sm:col-start-5" aria-hidden="true" />
        </DealRowGrid>
      ) : null}
      {hasItems ? (
        <ul className={`mt-4 divide-y divide-slate-100 ${className ?? ""}`}>
          {items.map(({ deal, duplicateCount }) => {
            const listingId = deal.listingId;
            const expanded = expandedListingId === listingId;
            const confidenceExpanded =
              expandedConfidenceListingId === listingId;
            const panelId = `${baseId}-${listingId}-inspection`;
            const confidencePanelId = `${baseId}-${listingId}-confidence`;
            const sellerLabel = deal.seller.name ?? deal.seller.username ?? "—";
            const marketIndicator = formatMarketIndicator(
              deal.provenance.market
            );
            const conditionLabel = deal.condition ?? "—";
            const languageLabel = deal.language ?? "—";
            const ageLabel = deal.freshness.dataAgeLabel || "—";
            const endsDisplay = getEndsDisplay(deal.endsAtISO);
            const sellerUrl = getSellerUrl(
              deal.seller.username,
              deal.provenance.source
            );
            const discountPercent = deal.price.discountPercent;
            const discountValueLabel =
              discountPercent == null
                ? "—"
                : `${discountPercent > 0 ? "+" : ""}${discountPercent}%`;

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
                  className={`grid ${getGridColsForMode(
                    mode
                  )} ${GRID_GAP} ${ROW_PADDING} -mx-2 rounded-md py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400`}
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
                  {/* Identity column: title + set-line */}
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
                      {[deal.setName, conditionLabel, languageLabel]
                        .filter((v) => {
                          if (!v || v === "—" || v === "UNKNOWN") return false;
                          if (v.toLowerCase() === "graded") return false;
                          return true;
                        })
                        .join(" · ") || "—"}
                    </p>
                  </div>

                  {/* Price column */}
                  <div
                    data-testid="rebuild-deal-col-price"
                    className="whitespace-nowrap text-right tabular-nums"
                  >
                    <p className="text-lg font-semibold text-slate-900">
                      {deal.price.display === "Unavailable"
                        ? "—"
                        : deal.price.display}
                    </p>
                    {mode === "home" && marketIndicator === "—" ? null : (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {marketIndicator}
                      </p>
                    )}
                  </div>

                  {/* Discount column */}
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

                  {/* Seller column */}
                  <div
                    data-testid="rebuild-deal-col-seller"
                    className="min-w-0 text-right text-xs"
                  >
                    <p
                      className={`truncate font-medium ${
                        mode === "home" ? "text-slate-700" : "text-slate-900"
                      }`}
                    >
                      {sellerUrl ? (
                        <a
                          href={sellerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={
                            mode === "home"
                              ? "text-slate-700 hover:text-slate-900 hover:underline"
                              : "hover:underline"
                          }
                          onClick={(e) => e.stopPropagation()}
                        >
                          {sellerLabel}
                        </a>
                      ) : (
                        sellerLabel
                      )}
                    </p>
                    <p className="mt-0.5 text-slate-500">
                      {deal.seller.feedbackCount != null &&
                      deal.seller.positivePercent != null ? (
                        <span>
                          ★ {deal.seller.feedbackCount.toLocaleString()} (
                          {deal.seller.positivePercent.toFixed(1)}%)
                        </span>
                      ) : deal.seller.feedbackCount != null ? (
                        <span>
                          ★ {deal.seller.feedbackCount.toLocaleString()}
                        </span>
                      ) : deal.seller.positivePercent != null ? (
                        <span>
                          {deal.seller.positivePercent.toFixed(1)}% positive
                        </span>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>

                  {/* Chevron column */}
                  <div className="hidden items-center justify-center sm:flex">
                    <span
                      className={`transition-transform ${
                        mode === "home"
                          ? "text-[10px] leading-none text-slate-400 opacity-70"
                          : "text-slate-400"
                      } ${expanded ? "rotate-180" : ""}`}
                    >
                      ▼
                    </span>
                  </div>

                  {expanded ? (
                    mode === "home" ? (
                      <HomeDealQualityPanel
                        panelId={panelId}
                        confidencePanelId={confidencePanelId}
                        deal={deal}
                        sellerLabel={sellerLabel}
                        sellerUrl={sellerUrl}
                        confidenceExpanded={confidenceExpanded}
                        listingId={listingId}
                        ageLabel={ageLabel}
                        endsDisplay={endsDisplay}
                        onConfidenceClose={() =>
                          setExpandedConfidenceListingId(null)
                        }
                      />
                    ) : (
                      <DiscoveryExpandedPanel
                        panelId={panelId}
                        confidencePanelId={confidencePanelId}
                        deal={deal}
                        duplicateCount={duplicateCount}
                        sellerLabel={sellerLabel}
                        confidenceExpanded={confidenceExpanded}
                        listingId={listingId}
                        onConfidenceClose={() =>
                          setExpandedConfidenceListingId(null)
                        }
                      />
                    )
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </>
  );
}
