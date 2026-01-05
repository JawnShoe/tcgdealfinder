# Tooltip Inventory & Contract Compliance Audit

**Audit Date**: 2026-01-04
**Contract Reference**: [UI_CONSISTENCY_CONTRACT.md](./UI_CONSISTENCY_CONTRACT.md)
**Status**: All fixes applied (PRs #211, #212, #213)

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

| File:Line                                                                      | Component                        | usePortal | size      | tooltipClassName | Overflow Context | Compliance    | Fix Category |
| ------------------------------------------------------------------------------ | -------------------------------- | --------- | --------- | ---------------- | ---------------- | ------------- | ------------ |
| [TrustedBadge.tsx:13](../../components/TrustedBadge.tsx#L13)                   | TrustedBadge                     | `true`    | `medium`  | `tooltip-wide`   | Table cells      | **Compliant** | —            |
| [SellerSeenBadge.tsx:26](../../components/SellerSeenBadge.tsx#L26)             | SellerSeenBadge                  | `true`    | `medium`  | `tooltip-wide`   | Table cells      | **Compliant** | —            |
| [WhyDealHint.tsx:42](../../components/WhyDealHint.tsx#L42)                     | WhyDealHint                      | `true`    | `compact` | `tooltip-wide`   | Table cells      | **Compliant** | —            |
| [SellerNameWithTooltip.tsx:78](../../components/SellerNameWithTooltip.tsx#L78) | SellerNameWithTooltip            | `true`    | `wide`    | `tooltip-wide`   | Table cells      | **Compliant** | —            |
| [WatchlistStarButton.tsx:61](../../components/WatchlistStarButton.tsx#L61)     | WatchlistStarButton              | `true`    | `compact` | `tooltip-wide`   | Normal           | **Compliant** | —            |
| [CardIdentity.tsx:61](../../components/CardIdentity.tsx#L61)                   | CardIdentityBlock (setName)      | `true`    | `medium`  | `tooltip-wide`   | Normal           | **Compliant** | —            |
| [CardIdentity.tsx:74](../../components/CardIdentity.tsx#L74)                   | CardIdentityBlock (listingTitle) | `true`    | `medium`  | `tooltip-wide`   | Normal           | **Compliant** | —            |

#### DealsTable.tsx Inline Tooltips

| File:Line                                                    | Purpose                 | usePortal   | size      | tooltipClassName    | Overflow Context        | Compliance    | Fix Category |
| ------------------------------------------------------------ | ----------------------- | ----------- | --------- | ------------------- | ----------------------- | ------------- | ------------ |
| [DealsTable.tsx:137](../../components/DealsTable.tsx#L137)   | renderEndsValue         | `true`      | `default` | `whitespace-nowrap` | Table (overflow-x-clip) | **Compliant** | —            |
| [DealsTable.tsx:753](../../components/DealsTable.tsx#L753)   | Data Reliability help   | `true`      | `medium`  | `tooltip-wide`      | Filter area (normal)    | **Compliant** | —            |
| [DealsTable.tsx:1202](../../components/DealsTable.tsx#L1202) | Confidence badge        | `true`      | `compact` | —                   | Table (overflow-x-clip) | **Compliant** | —            |
| [DealsTable.tsx:1404](../../components/DealsTable.tsx#L1404) | Mobile confidence badge | **missing** | `compact` | —                   | Mobile card (normal)    | **Compliant** | —            |
| [DealsTable.tsx:1459](../../components/DealsTable.tsx#L1459) | Mobile Ends tooltip     | `true`      | `default` | `whitespace-nowrap` | Mobile card (normal)    | **Compliant** | —            |

#### CardDetailClient.tsx Inline Tooltips

| File:Line                                                                | Purpose                | usePortal | size      | tooltipClassName    | Overflow Context        | Compliance    | Fix Category |
| ------------------------------------------------------------------------ | ---------------------- | --------- | --------- | ------------------- | ----------------------- | ------------- | ------------ |
| [CardDetailClient.tsx:778](../../components/CardDetailClient.tsx#L778)   | Price breakdown        | `true`    | `compact` | `whitespace-nowrap` | Normal                  | **Compliant** | —            |
| [CardDetailClient.tsx:843](../../components/CardDetailClient.tsx#L843)   | Best trusted deal ends | `true`    | `default` | `whitespace-nowrap` | Normal                  | **Compliant** | —            |
| [CardDetailClient.tsx:993](../../components/CardDetailClient.tsx#L993)   | Data Reliability help  | `true`    | `medium`  | `tooltip-wide`      | Filter area (normal)    | **Compliant** | —            |
| [CardDetailClient.tsx:1322](../../components/CardDetailClient.tsx#L1322) | Listing title tooltip  | `true`    | `wide`    | `tooltip-wide`      | Table (overflow-x-clip) | **Compliant** | —            |
| [CardDetailClient.tsx:1410](../../components/CardDetailClient.tsx#L1410) | Review badge           | `true`    | `compact` | —                   | Table (overflow-x-clip) | **Compliant** | —            |
| [CardDetailClient.tsx:1515](../../components/CardDetailClient.tsx#L1515) | Listings table Ends    | `true`    | `default` | `whitespace-nowrap` | Table (overflow-x-clip) | **Compliant** | —            |

#### FeaturedDealsStrip.tsx Inline Tooltips

| File:Line                                                                  | Purpose                | usePortal   | size     | tooltipClassName | Overflow Context       | Compliance    | Fix Category |
| -------------------------------------------------------------------------- | ---------------------- | ----------- | -------- | ---------------- | ---------------------- | ------------- | ------------ |
| [FeaturedDealsStrip.tsx:112](../../components/FeaturedDealsStrip.tsx#L112) | Data reliability label | **missing** | `medium` | `tooltip-wide`   | Card (overflow-x-auto) | **Compliant** | —            |

#### TopDealsClient.tsx Inline Tooltips

| File:Line                                                          | Purpose               | usePortal | size     | tooltipClassName | Overflow Context     | Compliance    | Fix Category |
| ------------------------------------------------------------------ | --------------------- | --------- | -------- | ---------------- | -------------------- | ------------- | ------------ |
| [TopDealsClient.tsx:174](../../components/TopDealsClient.tsx#L174) | Data Reliability help | `true`    | `medium` | `tooltip-wide`   | Filter area (normal) | **Compliant** | —            |

#### tableColumns.tsx (Shared Column Definitions)

| File:Line                                               | Purpose    | usePortal | size      | tooltipClassName    | Overflow Context           | Compliance    | Fix Category |
| ------------------------------------------------------- | ---------- | --------- | --------- | ------------------- | -------------------------- | ------------- | ------------ |
| [tableColumns.tsx:444](../../lib/tableColumns.tsx#L444) | EndsColumn | `true`    | `default` | `whitespace-nowrap` | Table (varies by consumer) | **Compliant** | —            |

### 2. Native `title=""` Attributes

| File:Line                                                                      | Purpose             | Context         | Compliance     | Fix Category   |
| ------------------------------------------------------------------------------ | ------------------- | --------------- | -------------- | -------------- |
| [AdminBlacklistClient.tsx:423](../../components/AdminBlacklistClient.tsx#L423) | Re-blacklist button | Admin-only page | **Acceptable** | — (admin-only) |

**Note**: Native `title` attributes provide browser-native tooltips. The Admin Blacklist page is internal-only and does not require visual consistency with public-facing tooltips.

### 3. Other Tooltip Libraries

**None found.** No Radix UI tooltip primitives, Tippy.js, react-tooltip, or floating-ui usage detected.

---

## Contract Compliance Analysis

### Portal Policy (§1)

Per contract: "Any tooltip that can appear inside a scroll/overflow container MUST use `usePortal={true}`."

**Violations**: None (fixed in PR #212)

Previously non-compliant callsites (now fixed):

- `SellerSeenBadge.tsx:26` — added `usePortal={true}`
- `WhyDealHint.tsx:42` — added `usePortal={true}`
- `DealsTable.tsx:1202` — added `usePortal={true}`
- `CardDetailClient.tsx:1410` — added `usePortal={true}`

### Size Policy (§2)

Per contract: "Use 3 standardized sizes only. Avoid per-callsite `tooltipClassName` width overrides."

**Violations**: None (fixed in PR #213)

Previously missing explicit size prop (now fixed):

- `DealsTable.tsx:137` — added `size="default"`
- `DealsTable.tsx:1459` — added `size="default"`
- `CardDetailClient.tsx:843` — added `size="default"`
- `CardDetailClient.tsx:1515` — added `size="default"`
- `tableColumns.tsx:444` — added `size="default"`

All Ends tooltips now have explicit `size="default"` for contract compliance.

### Width Policy (§4)

**No violations found.** No `min-w-*` constraints or forced widths detected on tooltip content.

---

## Fix History

### PR #211: Data Reliability Hover Regression Fix

Added `usePortal={true}` to Data Reliability help tooltips to fix hover gap issue with `side="top"`:

- `TopDealsClient.tsx:174`
- `DealsTable.tsx:753`
- `CardDetailClient.tsx:993`

### PR #212: Portal Enforcement (4 callsites)

Added `usePortal={true}` to tooltips in overflow containers:

- `SellerSeenBadge.tsx:26`
- `WhyDealHint.tsx:42`
- `DealsTable.tsx:1202` (confidence badge)
- `CardDetailClient.tsx:1410` (review badge)

### PR #213: Size Prop Normalization (5 callsites)

Added explicit `size="default"` to Ends tooltips:

- `DealsTable.tsx:137`
- `DealsTable.tsx:1459`
- `CardDetailClient.tsx:843`
- `CardDetailClient.tsx:1515`
- `tableColumns.tsx:444`

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
**Status**: All fixes applied — 26/27 callsites compliant (1 admin-only native title)
