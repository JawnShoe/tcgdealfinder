# UI Consistency Contract

**Purpose**: Define consistent tooltip behavior, sizing, and overflow rules to prevent regression loops.

**Last Updated**: 2025-12-23
**Status**: LOCKED

---

## 1. Tooltip Portal Policy

**Rule**: Any tooltip that can appear inside a scroll/overflow container MUST use `usePortal={true}`.

**Rationale**: Non-portaled tooltips use `position: absolute` relative to nearest positioned ancestor and are clipped by `overflow-x-clip` / `overflow-y-clip` wrappers.

**Default**: Portal mode should be the default for consistency. Opt-out only for tooltips guaranteed to never appear near overflow boundaries.

### Portaled Tooltips (REQUIRED)

| Component | usePortal | Reason |
|-----------|-----------|---------|
| Ends tooltips (5 locations) | `true` | Inside DealsTable overflow wrappers |
| TrustedBadge | `true` | Inside table cells with overflow-x-clip |
| WhyDealHint | Should be `true` | Can appear in table cells (future-proof) |
| SellerSeenBadge | Should be `true` | Can appear in table cells (future-proof) |

### Portal Behavior

- **Render**: Via `createPortal(tooltipBubble, document.body)` with `position: fixed`
- **Positioning**: Measured via `buttonRef.current.getBoundingClientRect()`
- **Viewport Bounds**: Constrained using measured tooltip width (see §3)
- **Dismiss on Scroll**: Tooltips close on any scroll event (capture phase `addEventListener("scroll", handleScroll, true)`)
- **Reposition on Resize**: Tooltips reposition (not dismiss) on window resize

---

## 2. Tooltip Size Policy

**Rule**: Use 3 standardized sizes only. Avoid per-callsite `tooltipClassName` width overrides unless proven exception.

### Size Definitions

| Size | max-width | w-max | Use Case |
|------|-----------|-------|----------|
| `compact` | 240px | ✓ | Short hints (WhyDealHint: "well below typical price") |
| `medium` | 280px | ✓ | Medium-length descriptions (TrustedBadge, SellerSeenBadge) |
| `wide` | 320px | ✓ | Long explanations (if needed) |
| `default` | 384px (24rem, max-w-sm) | ✗ | Legacy, avoid for new tooltips |

**Key Detail**: `compact`/`medium`/`wide` include `w-max` (content-based width up to max), preventing aggressive wrapping. `default` lacks `w-max`, causing narrow tall columns—avoid unless intentional.

### Current Assignments

| Component | Size | Rationale |
|-----------|------|-----------|
| Ends tooltips | `default` (inherited) | Single-line timestamp, ~160px actual width |
| TrustedBadge | `medium` | ~280px max, prevents tall/skinny wrapping |
| WhyDealHint | `compact` | Short hints, 240px max sufficient |
| SellerSeenBadge | `medium` | ~200px content, medium provides comfortable margin |

---

## 3. Tooltip Positioning Policy (Portal Mode)

**Rule**: Portal tooltips must use **measured tooltip width** for viewport bounds checking, not assumed max-widths.

### Implementation ([components/TooltipPopover.tsx:98-107](../../components/TooltipPopover.tsx))

```typescript
// Measure actual tooltip width if available, otherwise use fallback based on size
const tooltipWidth = tooltipRef.current
  ? tooltipRef.current.getBoundingClientRect().width  // ✅ MEASURED (accurate)
  : size === "wide" ? 320
    : size === "medium" ? 280
    : size === "compact" ? 240
    : 384; // Fallback to size-based max-widths

// Prevent tooltip from extending beyond right edge
if (left + tooltipWidth > viewportWidth) {
  left = Math.max(0, viewportWidth - tooltipWidth);
}

// Prevent tooltip from extending beyond left edge
if (left < 0) {
  left = 0;
}
```

**Why Measured Width?**
- Ends tooltips with `whitespace-nowrap` are ~160px actual width (not 384px max)
- Compact tooltips vary from 100px to 240px depending on content
- Accurate measurement prevents over-conservative clamping (excessive left offset)

**Fallback**: If `tooltipRef.current` unavailable (first render), use size-based max-widths as safe upper bound.

---

## 4. Acceptable Whitespace Definition

**Problem**: "Blank-right space" complaints can refer to two different issues:

### ❌ NOT Acceptable: Forced Min-Width Blank Space

**Symptom**: Large empty area on single-line or first line of tooltip, caused by `min-w-[Npx]` constraint.

**Example** (before fixes):
- `min-w-[220px]` on content that's only ~150px wide → **70px blank-right space** on single line

**Fix**: Remove `min-w-*` constraints. Use `size` prop + `w-max` instead.

### ✅ Acceptable: Normal Multi-Line Whitespace

**Symptom**: Shorter last line after text wrapping, natural consequence of word boundaries.

**Example**:
```
"Trusted seller: 98%+ positive    ← ~240px, fills width
feedback, 20+ ratings"            ← ~150px, 130px blank-right
```

**Why Acceptable**: This is how wrapped text works. The alternative (justified text or fixed-width monospace) is visually worse for UI tooltips.

**Rule**: Do NOT churn tooltip sizing to eliminate normal multi-line whitespace. Accept it as expected behavior.

---

## 5. Table Overflow Rules

**Rule**: Prevent page-level horizontal scroll while allowing inner table scrolling.

### Standard Pattern (DealsTable)

```tsx
{/* Visibility wrapper */}
<div className="hidden sm:block">
  {/* Outer: Prevents page-level horizontal scroll */}
  <div className="w-full overflow-x-clip">
    {/* Inner: Allows table horizontal scrolling */}
    <div className="w-full overflow-x-auto overflow-y-clip">
      <table className="min-w-full table-fixed text-sm text-slate-900">
        {/* Table content */}
      </table>
    </div>
  </div>
</div>
```

**Key Classes**:
- **`overflow-x-clip`** (outer): Clips horizontal overflow, prevents page-level scrollbar
- **`overflow-x-auto`** (inner): Allows horizontal scrolling within container
- **`overflow-y-clip`** (inner): Prevents vertical scrollbar from table content

**Consistency**: CardDetailClient listings table (lines 990-991, 1384-1385) now uses same pattern after fix in commit 1ffec42.

---

## 6. Verification Checklist (New Pages / Components)

When adding new tooltips or tables, verify:

### Tooltip Verification

- [ ] **Portal Mode**: Tooltip inside overflow container? → `usePortal={true}` required
- [ ] **Size**: Using standardized size (`compact`/`medium`/`wide`), not custom `tooltipClassName` width?
- [ ] **No Forced Width**: No `min-w-[Npx]` causing blank-right space on single-line content?
- [ ] **Dismiss on Scroll**: Portaled tooltip closes when scrolling?
- [ ] **Viewport Bounds**: Tooltip doesn't extend beyond right/left viewport edges?

### Table Verification

- [ ] **Overflow Pattern**: Using nested `overflow-x-clip` (outer) + `overflow-x-auto` (inner)?
- [ ] **No Page Scroll**: No horizontal scrollbar at page level?
- [ ] **Inner Scroll OK**: Table scrolls horizontally within container when content exceeds width?

### Edge Case Testing

Test tooltips at:
- [ ] **Table edges**: First/last columns
- [ ] **Near right viewport edge**: Trigger ~100px from right edge
- [ ] **Mobile viewports**: 320px, 375px, 768px widths
- [ ] **While scrolling**: Tooltip dismisses on scroll?

---

## 7. Intentional Divergences (Allowed Differences)

Some components intentionally deviate from defaults for valid UX reasons:

| Component | Divergence | Reason |
|-----------|------------|--------|
| (None currently) | - | - |

**Process**: If adding an intentional divergence, document it here with clear rationale.

---

## 8. Historical Context (Why This Document Exists)

**Regression Loop** (fa56778 → 8e372be → 0ceee7f → 1ffec42 → 1460e88 → 28b8080):

1. **fa56778**: Portal mode introduced for Ends tooltips
2. **8e372be**: Fixed portal visibility (`peer-hover:*` broken)
3. **0ceee7f**: Fixed Ends tooltip spacing (`min-w-[220px]` → `whitespace-nowrap`)
4. **1ffec42**: Fixed scroll persistence + removed non-Ends `min-w` constraints
5. **1460e88**: Fixed WhyDealHint overflow (removed `whitespace-nowrap`) + TrustedBadge tall/skinny (added `size="medium"`) + measured portal positioning
6. **28b8080**: Fixed TrustedBadge clipping (added `usePortal={true}`)

**Root Causes of Loop**:
- Lack of consistent portal policy (some tooltips portaled, others not)
- Ad-hoc width constraints (`min-w-*`) instead of standardized sizes
- Confusion between "forced blank space" (bug) vs "normal multi-line whitespace" (acceptable)

**This Contract**: Prevents future regressions by defining clear, testable rules for tooltip behavior.

---

## 9. References

**Implementation Files**:
- [components/TooltipPopover.tsx](../../components/TooltipPopover.tsx) - Core tooltip component
- [components/TrustedBadge.tsx](../../components/TrustedBadge.tsx) - Portaled medium-sized tooltip
- [components/WhyDealHint.tsx](../../components/WhyDealHint.tsx) - Compact tooltip
- [components/SellerSeenBadge.tsx](../../components/SellerSeenBadge.tsx) - Medium tooltip
- [components/DealsTable.tsx](../../components/DealsTable.tsx) - Table overflow pattern
- [components/CardDetailClient.tsx](../../components/CardDetailClient.tsx) - Listings table overflow

**Documentation**:
- [PROJECT_SSOT.md](../../PROJECT_SSOT.md) - Historical changes log
- [REGRESSION_CHECKLIST.md](../../REGRESSION_CHECKLIST.md) - Testing checklist

---

**Last Reviewed**: 2025-12-23
**Next Review**: When adding new tooltip types or changing TooltipPopover API
