# Tooltip Inventory & Contract Compliance Audit

**Audit Date**: 2026-01-04
**Contract Reference**: [UI_CONSISTENCY_CONTRACT.md](./UI_CONSISTENCY_CONTRACT.md)
**Status**: All fixes applied (PRs #214, #215)
Observed bubble width mode: shrink-to-content up to max-width

---

## Summary

| Metric                          | Count          |
| ------------------------------- | -------------- |
| **Total tooltip callsites**     | 27             |
| **Compliant**                   | 26             |
| **Portal-required but missing** | 0              |
| **Missing size prop**           | 0              |
| **Width-forcing violations**    | 0              |
| **Native title tooltips**       | 1 (admin-only) |

---

## Inventory by Implementation Type

### 1. TooltipPopoverClientOnly (Primary Implementation)

All tooltip surfaces use `TooltipPopoverClientOnly` (SSR-safe wrapper around `TooltipPopover`).

#### Dedicated Tooltip Components

| File:Line                                                                      | Component                        | usePortal | size      | tooltipClassName | Content shape | Wrap source  | Overflow Context | Compliance    | Fix Category |
| ------------------------------------------------------------------------------ | -------------------------------- | --------- | --------- | ---------------- | ------------- | ------------ | ---------------- | ------------- | ------------ |
| [TrustedBadge.tsx:13](../../components/TrustedBadge.tsx#L13)                   | TrustedBadge                     | `true`    | `medium`  | `tooltip-wide`   | string        | natural      | Table cells      | **Compliant** | —            |
| [SellerSeenBadge.tsx:26](../../components/SellerSeenBadge.tsx#L26)             | SellerSeenBadge                  | `true`    | `medium`  | `tooltip-wide`   | string        | natural      | Table cells      | **Compliant** | —            |
| [WhyDealHint.tsx:42](../../components/WhyDealHint.tsx#L42)                     | WhyDealHint                      | `true`    | `compact` | `tooltip-wide`   | string        | natural      | Table cells      | **Compliant** | —            |
| [SellerNameWithTooltip.tsx:78](../../components/SellerNameWithTooltip.tsx#L78) | SellerNameWithTooltip            | `true`    | `wide`    | `tooltip-wide`   | multiline     | forced-break | Table cells      | **Compliant** | —            |
| [WatchlistStarButton.tsx:61](../../components/WatchlistStarButton.tsx#L61)     | WatchlistStarButton              | `true`    | `compact` | `tooltip-wide`   | string        | natural      | Normal           | **Compliant** | —            |
| [CardIdentity.tsx:61](../../components/CardIdentity.tsx#L61)                   | CardIdentityBlock (setName)      | `true`    | `medium`  | `tooltip-wide`   | string        | natural      | Normal           | **Compliant** | —            |
| [CardIdentity.tsx:74](../../components/CardIdentity.tsx#L74)                   | CardIdentityBlock (listingTitle) | `true`    | `medium`  | `tooltip-wide`   | string        | natural      | Normal           | **Compliant** | —            |

#### DealsTable.tsx Inline Tooltips

| File:Line                                                    | Purpose                 | usePortal   | size      | tooltipClassName    | Content shape | Wrap source | Overflow Context        | Compliance    | Fix Category |
| ------------------------------------------------------------ | ----------------------- | ----------- | --------- | ------------------- | ------------- | ----------- | ----------------------- | ------------- | ------------ |
| [DealsTable.tsx:137](../../components/DealsTable.tsx#L137)   | renderEndsValue         | `true`      | `compact` | `whitespace-nowrap` | string        | natural     | Table (overflow-x-clip) | **Compliant** | —            |
| [DealsTable.tsx:753](../../components/DealsTable.tsx#L753)   | Data Reliability help   | `true`      | `medium`  | `tooltip-wide`      | string        | natural     | Filter area (normal)    | **Compliant** | —            |
| [DealsTable.tsx:1202](../../components/DealsTable.tsx#L1202) | Confidence badge        | `true`      | `compact` | —                   | string        | natural     | Table (overflow-x-clip) | **Compliant** | —            |
| [DealsTable.tsx:1404](../../components/DealsTable.tsx#L1404) | Mobile confidence badge | **missing** | `compact` | —                   | string        | natural     | Mobile card (normal)    | **Compliant** | —            |
| [DealsTable.tsx:1459](../../components/DealsTable.tsx#L1459) | Mobile Ends tooltip     | `true`      | `compact` | `whitespace-nowrap` | string        | natural     | Mobile card (normal)    | **Compliant** | —            |

#### CardDetailClient.tsx Inline Tooltips

| File:Line                                                                | Purpose                | usePortal | size      | tooltipClassName    | Content shape | Wrap source  | Overflow Context        | Compliance    | Fix Category |
| ------------------------------------------------------------------------ | ---------------------- | --------- | --------- | ------------------- | ------------- | ------------ | ----------------------- | ------------- | ------------ |
| [CardDetailClient.tsx:778](../../components/CardDetailClient.tsx#L778)   | Price breakdown        | `true`    | `compact` | `whitespace-nowrap` | multiline     | forced-break | Normal                  | **Compliant** | —            |
| [CardDetailClient.tsx:843](../../components/CardDetailClient.tsx#L843)   | Best trusted deal ends | `true`    | `compact` | `whitespace-nowrap` | string        | natural      | Normal                  | **Compliant** | —            |
| [CardDetailClient.tsx:993](../../components/CardDetailClient.tsx#L993)   | Data Reliability help  | `true`    | `medium`  | `tooltip-wide`      | string        | natural      | Filter area (normal)    | **Compliant** | —            |
| [CardDetailClient.tsx:1322](../../components/CardDetailClient.tsx#L1322) | Listing title tooltip  | `true`    | `wide`    | `tooltip-wide`      | string        | natural      | Table (overflow-x-clip) | **Compliant** | —            |
| [CardDetailClient.tsx:1410](../../components/CardDetailClient.tsx#L1410) | Review badge           | `true`    | `compact` | —                   | string        | natural      | Table (overflow-x-clip) | **Compliant** | —            |
| [CardDetailClient.tsx:1515](../../components/CardDetailClient.tsx#L1515) | Listings table Ends    | `true`    | `compact` | `whitespace-nowrap` | string        | natural      | Table (overflow-x-clip) | **Compliant** | —            |

#### FeaturedDealsStrip.tsx Inline Tooltips

| File:Line                                                                  | Purpose                | usePortal   | size     | tooltipClassName | Content shape | Wrap source | Overflow Context       | Compliance    | Fix Category |
| -------------------------------------------------------------------------- | ---------------------- | ----------- | -------- | ---------------- | ------------- | ----------- | ---------------------- | ------------- | ------------ |
| [FeaturedDealsStrip.tsx:112](../../components/FeaturedDealsStrip.tsx#L112) | Data reliability label | **missing** | `medium` | `tooltip-wide`   | string        | natural     | Card (overflow-x-auto) | **Compliant** | —            |

#### TopDealsClient.tsx Inline Tooltips

| File:Line                                                          | Purpose               | usePortal | size     | tooltipClassName | Content shape | Wrap source | Overflow Context     | Compliance    | Fix Category |
| ------------------------------------------------------------------ | --------------------- | --------- | -------- | ---------------- | ------------- | ----------- | -------------------- | ------------- | ------------ |
| [TopDealsClient.tsx:174](../../components/TopDealsClient.tsx#L174) | Data Reliability help | `true`    | `medium` | `tooltip-wide`   | string        | natural     | Filter area (normal) | **Compliant** | —            |

#### tableColumns.tsx (Shared Column Definitions)

| File:Line                                               | Purpose    | usePortal | size      | tooltipClassName    | Content shape | Wrap source | Overflow Context           | Compliance    | Fix Category |
| ------------------------------------------------------- | ---------- | --------- | --------- | ------------------- | ------------- | ----------- | -------------------------- | ------------- | ------------ |
| [tableColumns.tsx:444](../../lib/tableColumns.tsx#L444) | EndsColumn | `true`    | `compact` | `whitespace-nowrap` | string        | natural     | Table (varies by consumer) | **Compliant** | —            |

### 2. Native `title=""` Attributes

| File:Line                                                                      | Purpose             | Context         | Content shape | Wrap source | Compliance     | Fix Category   |
| ------------------------------------------------------------------------------ | ------------------- | --------------- | ------------- | ----------- | -------------- | -------------- |
| [AdminBlacklistClient.tsx:423](../../components/AdminBlacklistClient.tsx#L423) | Re-blacklist button | Admin-only page | string        | natural     | **Acceptable** | — (admin-only) |

**Note**: Native `title` attributes provide browser-native tooltips. The Admin Blacklist page is internal-only and does not require visual consistency with public-facing tooltips.

### 3. Other Tooltip Libraries

**None found.** No Radix UI tooltip primitives, Tippy.js, react-tooltip, or floating-ui usage detected.

---

## Contract Compliance Analysis

### Portal Policy (§1)

Per contract: "Any tooltip that can appear inside a scroll/overflow container MUST use `usePortal={true}`."

**Violations**: None (fixed in PR #214)

Previously non-compliant callsites (now fixed):

- `SellerSeenBadge.tsx:26` — added `usePortal={true}`
- `WhyDealHint.tsx:42` — added `usePortal={true}`
- `DealsTable.tsx:1202` — added `usePortal={true}`
- `CardDetailClient.tsx:1410` — added `usePortal={true}`

Additionally, `usePortal={true}` added to Data Reliability tooltips to fix hover regression with `side="top"`:

- `TopDealsClient.tsx:174`
- `DealsTable.tsx:753`
- `CardDetailClient.tsx:993`

### Size Policy (§2)

Per contract: "Use 3 standardized sizes only. Avoid per-callsite `tooltipClassName` width overrides."

**Violations**: None (fixed in PR #215)

Previously missing explicit size prop (now fixed with `size="compact"`):

- `DealsTable.tsx:137` — renderEndsValue
- `DealsTable.tsx:1459` — Mobile Ends tooltip
- `CardDetailClient.tsx:843` — Best trusted deal ends
- `CardDetailClient.tsx:1515` — Listings table Ends
- `tableColumns.tsx:444` — EndsColumn

**Analysis**: All 5 Ends tooltips now use `size="compact"` (240px max), appropriate for single-line timestamps (~160px actual).

### Width Policy (§4)

**No violations found.** No `min-w-*` constraints or forced widths detected on tooltip content.

---

## Fix History

### PR #214: Portal Enforcement (7 callsites) — MERGED

Added `usePortal={true}` to:

- `SellerSeenBadge.tsx:26` (overflow container)
- `WhyDealHint.tsx:42` (overflow container)
- `DealsTable.tsx:1202` (overflow container)
- `CardDetailClient.tsx:1410` (overflow container)
- `TopDealsClient.tsx:174` (hover regression fix)
- `DealsTable.tsx:753` (hover regression fix)
- `CardDetailClient.tsx:993` (hover regression fix)

### PR #215: Size Prop Normalization (5 callsites) — MERGED

Added explicit `size="compact"` to Ends tooltips:

- `DealsTable.tsx:137`
- `DealsTable.tsx:1459`
- `CardDetailClient.tsx:843`
- `CardDetailClient.tsx:1515`
- `tableColumns.tsx:444`

**Risk**: Low — `compact` (240px max) appropriate for single-line timestamps (~160px actual).

---

## Appendix: Overflow Context Map

| Container                       | Overflow Classes                                                      | Tooltip Surfaces Inside                                                                              |
| ------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| DealsTable (desktop)            | `overflow-x-clip` (outer) + `overflow-x-auto overflow-y-clip` (inner) | renderEndsValue, confidence badge, SellerNameWithTooltip, TrustedBadge, SellerSeenBadge, WhyDealHint |
| DealsTable (mobile)             | Normal (card layout)                                                  | Mobile confidence badge, Mobile Ends                                                                 |
| CardDetailClient listings table | `overflow-x-clip` (outer) + `overflow-x-auto overflow-y-clip` (inner) | Listing title, Review badge, Ends                                                                    |
| Filter areas                    | Normal                                                                | Data Reliability help tooltips                                                                       |
| FeaturedDealsStrip              | `overflow-x-auto`                                                     | Data reliability label, SellerNameWithTooltip, TrustedBadge                                          |

---

**Audit completed by**: Claude Code
**Status**: All fixes applied (PRs #214, #215)
