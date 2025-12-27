# DESIGN PHASES — LOCKED PLAN

**Last Updated**: 2025-12-26
**Status**: Phase 1 ACTIVE

---

## Phase 1 — Visual Legitimacy (ACTIVE)

### Goals

- Increase trust and professional credibility
- Improve visual hierarchy and scan speed
- Introduce systemization (tokens, typography)
- ZERO functional, data, or behavioral changes

### Allowed in Phase 1

- Design tokens (colors, typography scale, spacing)
- Logo + favicon
- Button / badge / input visual standardization
- Table visual hierarchy (spacing, weight, alignment only)
- Trust indicators (timestamps, data source disclosure)

### Explicitly NOT Allowed

- Column reordering or removal
- Feature changes
- Navigation changes
- Data logic changes
- Component refactors (logic changes)
- Animations beyond basic hover/focus/skeletons

### Implementation Order (Mandatory)

1. Tokens + typography (CSS-only if possible)
2. Header/footer (logo + trust)
3. Table hierarchy polish
4. Button/badge/input visual standardization

### Verification Requirements

Before PR:

- `npm run lint`
- `npm run build`

Manual smoke test:

- `/` (homepage)
- `/top-deals`
- `/cards/[id]` (any card detail page)
- `/watchlist`

Confirm:

- No behavior changes
- No column movement
- No console warnings

### PR Requirements

- Clear diff summary
- List of visual-only changes
- Explicit confirmation: "No functional or data behavior was modified"

---

## Phase 2 — Layout + Hierarchy (PENDING)

### Goals

- Homepage information architecture improvements
- Table visual refinement
- Card detail page restructure
- Navigation clarity

### Scope (Draft — Not Yet Locked)

- Homepage layout adjustments
- Featured deals vs all deals distinction
- Card detail page section ordering
- Navigation improvements

### Prerequisites

- Phase 1 fully completed and frozen
- User approval of Phase 1 results

---

## Phase 3 — Interactions (PENDING)

### Goals

- Loading states
- Error handling patterns
- Micro-animations (subtle)
- Mobile experience improvements

### Scope (Draft — Not Yet Locked)

- Skeleton loading states for tables/charts
- Retry buttons for failed API calls
- Subtle hover/focus animations
- Mobile-specific refinements

### Prerequisites

- Phase 2 fully completed and frozen
- User approval of Phase 2 results

---

## Cleanup Policy

These documents are **temporary planning artifacts**.

After Phase 1 and Phase 2 are fully completed and frozen:

1. The audit file (`DESIGN_AUDIT_2025-01.md`) should be archived or removed
2. Only final, executed decisions should remain summarized in `PROJECT_SSOT.md`
3. Do not treat these as permanent specs

---

## Escalation Rules

If any of the following is required during Phase 1, **STOP and escalate**:

- Feature changes
- Data logic changes
- Column reorder/removal
- Navigation changes
- Component logic refactors
- Any "while I'm here" cleanup

---

## Audit Reference

Full design audit: `docs/design/DESIGN_AUDIT_2025-01.md`

The audit is **advisory only** — it informs decisions but is not an execution instruction set.
