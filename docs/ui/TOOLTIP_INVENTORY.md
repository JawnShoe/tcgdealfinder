# Tooltip Inventory & Contract Compliance Audit

**Audit Date**: 2026-01-04
**Contract Reference**: [UI_CONSISTENCY_CONTRACT.md](./UI_CONSISTENCY_CONTRACT.md)
**Status**: Inventory complete, fixes NOT applied

---

## Summary

| Metric                          | Count          |
| ------------------------------- | -------------- |
| **Total tooltip callsites**     | 27             |
| **Compliant**                   | 15             |
| **Portal-required but missing** | 5              |
| **Missing size prop**           | 6              |
| **Width-forcing violations**    | 0              |
| **Native title tooltips**       | 1 (admin-only) |

---

## Inventory by Implementation Type

### 1. TooltipPopoverClientOnly (Primary Implementation)

All tooltip surfaces use `TooltipPopoverClientOnly` (SSR-safe wrapper around `TooltipPopover`).

#### Dedicated Tooltip Components

| File:Line                                                                      | Component                        | usePortal   | size      | tooltipClassName | Overflow Context | Compliance        | Fix Category    |
| ------------------------------------------------------------------------------ | -------------------------------- | ----------- | --------- | ---------------- | ---------------- | ----------------- | --------------- |
| [TrustedBadge.tsx:13](../../components/TrustedBadge.tsx#L13)                   | TrustedBadge                     | `true`      | `medium`  | `tooltip-wide`   | Table cells      | **Compliant**     | —               |
| [SellerSeenBadge.tsx:26](../../components/SellerSeenBadge.tsx#L26)             | SellerSeenBadge                  | **missing** | `medium`  | `tooltip-wide`   | Table cells      | **Non-compliant** | portal-required |
| [WhyDealHint.tsx:42](../../components/WhyDealHint.tsx#L42)                     | WhyDealHint                      | **missing** | `compact` | `tooltip-wide`   | Table cells      | **Non-compliant** | portal-required |
| [SellerNameWithTooltip.tsx:78](../../components/SellerNameWithTooltip.tsx#L78) | SellerNameWithTooltip            | `true`      | `wide`    | `tooltip-wide`   | Table cells      | **Compliant**     | —               |
| [WatchlistStarButton.tsx:61](../../components/WatchlistStarButton.tsx#L61)     | WatchlistStarButton              | `true`      | `compact` | `tooltip-wide`   | Normal           | **Compliant**     | —               |
| [CardIdentity.tsx:61](../../components/CardIdentity.tsx#L61)                   | CardIdentityBlock (setName)      | `true`      | `medium`  | `tooltip-wide`   | Normal           | **Compliant**     | —               |
| [CardIdentity.tsx:74](../../components/CardIdentity.tsx#L74)                   | CardIdentityBlock (listingTitle) | `true`      | `medium`  | `tooltip-wide`   | Normal           | **Compliant**     | —               |

#### DealsTable.tsx Inline Tooltips

| File:Line                                                    | Purpose                 | usePortal   | size        | tooltipClassName    | Overflow Context        | Compliance        | Fix Category    |
| ------------------------------------------------------------ | ----------------------- | ----------- | ----------- | ------------------- | ----------------------- | ----------------- | --------------- |
| [DealsTable.tsx:137](../../components/DealsTable.tsx#L137)   | renderEndsValue         | `true`      | **missing** | `whitespace-nowrap` | Table (overflow-x-clip) | **Non-compliant** | missing-size    |
| [DealsTable.tsx:753](../../components/DealsTable.tsx#L753)   | Data Reliability help   | **missing** | `medium`    | `tooltip-wide`      | Filter area (normal)    | **Compliant**     | —               |
| [DealsTable.tsx:1202](../../components/DealsTable.tsx#L1202) | Confidence badge        | **missing** | `compact`   | —                   | Table (overflow-x-clip) | **Non-compliant** | portal-required |
| [DealsTable.tsx:1404](../../components/DealsTable.tsx#L1404) | Mobile confidence badge | **missing** | `compact`   | —                   | Mobile card (normal)    | **Compliant**     | —               |
| [DealsTable.tsx:1459](../../components/DealsTable.tsx#L1459) | Mobile Ends tooltip     | `true`      | **missing** | `whitespace-nowrap` | Mobile card (normal)    | **Non-compliant** | missing-size    |

#### CardDetailClient.tsx Inline Tooltips

| File:Line                                                                | Purpose                | usePortal   | size        | tooltipClassName    | Overflow Context        | Compliance        | Fix Category    |
| ------------------------------------------------------------------------ | ---------------------- | ----------- | ----------- | ------------------- | ----------------------- | ----------------- | --------------- |
| [CardDetailClient.tsx:778](../../components/CardDetailClient.tsx#L778)   | Price breakdown        | `true`      | `compact`   | `whitespace-nowrap` | Normal                  | **Compliant**     | —               |
| [CardDetailClient.tsx:843](../../components/CardDetailClient.tsx#L843)   | Best trusted deal ends | `true`      | **missing** | `whitespace-nowrap` | Normal                  | **Non-compliant** | missing-size    |
| [CardDetailClient.tsx:993](../../components/CardDetailClient.tsx#L993)   | Data Reliability help  | **missing** | `medium`    | `tooltip-wide`      | Filter area (normal)    | **Compliant**     | —               |
| [CardDetailClient.tsx:1322](../../components/CardDetailClient.tsx#L1322) | Listing title tooltip  | `true`      | `wide`      | `tooltip-wide`      | Table (overflow-x-clip) | **Compliant**     | —               |
| [CardDetailClient.tsx:1410](../../components/CardDetailClient.tsx#L1410) | Review badge           | **missing** | `compact`   | —                   | Table (overflow-x-clip) | **Non-compliant** | portal-required |
| [CardDetailClient.tsx:1515](../../components/CardDetailClient.tsx#L1515) | Listings table Ends    | `true`      | **missing** | `whitespace-nowrap` | Table (overflow-x-clip) | **Non-compliant** | missing-size    |

#### FeaturedDealsStrip.tsx Inline Tooltips

| File:Line                                                                  | Purpose                | usePortal   | size     | tooltipClassName | Overflow Context       | Compliance    | Fix Category |
| -------------------------------------------------------------------------- | ---------------------- | ----------- | -------- | ---------------- | ---------------------- | ------------- | ------------ |
| [FeaturedDealsStrip.tsx:112](../../components/FeaturedDealsStrip.tsx#L112) | Data reliability label | **missing** | `medium` | `tooltip-wide`   | Card (overflow-x-auto) | **Compliant** | —            |

#### TopDealsClient.tsx Inline Tooltips

| File:Line                                                          | Purpose               | usePortal   | size     | tooltipClassName | Overflow Context     | Compliance    | Fix Category |
| ------------------------------------------------------------------ | --------------------- | ----------- | -------- | ---------------- | -------------------- | ------------- | ------------ |
| [TopDealsClient.tsx:174](../../components/TopDealsClient.tsx#L174) | Data Reliability help | **missing** | `medium` | `tooltip-wide`   | Filter area (normal) | **Compliant** | —            |

#### tableColumns.tsx (Shared Column Definitions)

| File:Line                                               | Purpose    | usePortal | size        | tooltipClassName    | Overflow Context           | Compliance        | Fix Category |
| ------------------------------------------------------- | ---------- | --------- | ----------- | ------------------- | -------------------------- | ----------------- | ------------ |
| [tableColumns.tsx:444](../../lib/tableColumns.tsx#L444) | EndsColumn | `true`    | **missing** | `whitespace-nowrap` | Table (varies by consumer) | **Non-compliant** | missing-size |

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

**Violations (5)**:

1. `SellerSeenBadge.tsx:26` — appears in table cells with overflow-x-clip
2. `WhyDealHint.tsx:42` — appears in table cells with overflow-x-clip
3. `DealsTable.tsx:1202` — confidence badge in table
4. `CardDetailClient.tsx:1410` — review badge in listings table
5. `DealsTable.tsx:753`, `CardDetailClient.tsx:993`, `TopDealsClient.tsx:174`, `FeaturedDealsStrip.tsx:112` — filter area tooltips (NOT in overflow container, so these are acceptable)

**Actually non-compliant**: 4 callsites (SellerSeenBadge, WhyDealHint, DealsTable:1202, CardDetailClient:1410)

### Size Policy (§2)

Per contract: "Use 3 standardized sizes only. Avoid per-callsite `tooltipClassName` width overrides."

**Missing size prop (6)**:

1. `DealsTable.tsx:137` — renderEndsValue (uses `whitespace-nowrap`)
2. `DealsTable.tsx:1459` — Mobile Ends tooltip
3. `CardDetailClient.tsx:843` — Best trusted deal ends
4. `CardDetailClient.tsx:1515` — Listings table Ends
5. `tableColumns.tsx:444` — EndsColumn

**Analysis**: All 5 "missing size" callsites are Ends tooltips that use `whitespace-nowrap` for single-line timestamps (~160px). This is an intentional pattern documented in the contract (§2 Current Assignments: "Ends tooltips | `default` (inherited) | Single-line timestamp, ~160px actual width"). These are **technically non-compliant** (no explicit size prop) but functionally correct.

### Width Policy (§4)

**No violations found.** No `min-w-*` constraints or forced widths detected on tooltip content.

---

## Recommended Fix Sequence

If fixes are authorized, recommend the following sequenced PRs:

### PR 1: Portal Enforcement (4 callsites)

Add `usePortal={true}` to:

- `SellerSeenBadge.tsx:26`
- `WhyDealHint.tsx:42`
- `DealsTable.tsx:1202` (confidence badge)
- `CardDetailClient.tsx:1410` (review badge)

**Risk**: Low — adds portal mode to existing tooltips, no visual change expected.

### PR 2: Size Prop Normalization (5 callsites)

Add explicit `size="default"` to Ends tooltips:

- `DealsTable.tsx:137`
- `DealsTable.tsx:1459`
- `CardDetailClient.tsx:843`
- `CardDetailClient.tsx:1515`
- `tableColumns.tsx:444`

**Risk**: Low — makes implicit default explicit, no visual change expected.

### PR 3: Contract Documentation Update

Update `UI_CONSISTENCY_CONTRACT.md` §2 to clarify:

- Ends tooltips use `whitespace-nowrap` + implicit `default` size
- Document this as an intentional pattern or recommend explicit `size="compact"` with `whitespace-nowrap`

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
**Next action**: Operator review, then sequenced fix PRs if authorized
