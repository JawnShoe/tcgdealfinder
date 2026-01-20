# Phase-1 Visual Contract (LOCKED)

Purpose:
Eliminate "vibecoded / AI slop" risk by enforcing a calm, institutional, data-first UI system that scales.

This contract governs all Phase-1 surfaces:

- Discovery (list + card)
- Set pages (discovery w/ locked filter)
- Seller pages
- Detail / expanded rows

## 1. Visual Philosophy (Non-Negotiable)

Core principles

- Interpret less. Show more.
- Calm beats clever.
- Consistency > personality.
- Trust is earned through restraint.
- If a UI choice feels "cool" but not "necessary," it fails this contract.

## 2. Typography Contract

### A. Font usage

- One font family only
- No decorative fonts
- No mixing serif/sans
- Expensive products use boring fonts perfectly.

### B. Type scale (hard limits)

You may only use these semantic roles:

| Role      | Usage                     |
| --------- | ------------------------- |
| Primary   | Price, card name          |
| Secondary | Deal signal, key metadata |
| Tertiary  | Seller, freshness, labels |
| Meta      | Footnotes, provenance     |

Rules

- No ad-hoc font sizes
- No "just one more size"
- Hierarchy is created by weight + spacing, not size chaos

## 3. Color Contract

### A. Color roles (not colors)

You define roles, then map colors once.

Allowed roles:

- text-primary
- text-secondary
- text-muted
- accent-primary (one only)
- state-positive
- state-negative
- border-subtle
- bg-canvas
- bg-surface

Rules

- One accent color only
- State colors used only for meaning
- No gradients as decoration
- Backgrounds are boring on purpose
- If something is colorful, it must earn it.

## 4. Spacing and Density Contract

### A. Spacing is semantic

Spacing communicates grouping, not aesthetics.

Rules

- Equal spacing = equal importance
- Grouped data must be visually grouped
- White space is allowed (and encouraged)
- No "tightening things up" ad-hoc.

### B. Density discipline

- Discovery list = information-dense but calm
- Card view = slightly more breathing room
- Expanded rows = most relaxed spacing
- Density increases only when meaning increases.

## 5. Motion Contract (Critical)

Allowed motion (ONLY these)

- Opacity
- Subtle translate (<= 4px)
- Background position

Forbidden motion

- Height animation
- Width animation
- Layout reflow
- Springy easing
- Attention-seeking motion

Rules

- Motion must never affect layout
- Motion must never convey meaning alone
- Motion must be fast and subtle
- If motion is noticeable, it is wrong.

## 6. Imagery Contract (Card View)

Rules

- One image only
- Fixed aspect ratio
- No carousels
- No zoom
- No hover effects
- Images support recognition, not persuasion.
- If text and trust disappeared, the card must still work.

## 7. Trust Surface Contract

### A. Always visible (collapsed)

- Price
- Deal signal
- Freshness
- Seller identity

### B. Expanded surfaces

- Confidence (explained, not asserted)
- Price context
- Seller detail (if available)
- Provenance / limitations

### C. Resilience label (trust surface)

Placement and SSR requirements:

- MUST render server-side and be visible at first render (no hover-only meaning).
- MUST be present on all rebuild routes that surface trust: `/rebuild`, `/rebuild/discovery`, `/rebuild/listing/[id]`.
- MUST include stable attributes:
  - `data-testid="resilience-label"`
  - `data-tier="<LIVE|CACHED|STALE|PARTIAL|UNAVAILABLE>"`

Copy and state rules:

- MUST display the word "Resilience" plus the tier label (Live/Cached/Stale/Partial/Unavailable).
- MAY display an explanation string only for degraded tiers; explanation MUST be plain text (no hype, no urgency).
- MUST NOT claim certainty when tier is not Live.

Stability rules:

- MUST have stable dimensions in the closed/default state (no layout shift on load/hydration).
- MUST NOT "pop in" additional tier/explanation content after hydration.

A11y rules:

- MUST pass axe color-contrast checks on all tiers.
- MUST NOT use low-opacity text for critical meaning.
- MUST NOT rely on colored text on transparent/light backgrounds for tier meaning.

Language rules

- No hype
- No certainty without evidence
- Always say what is unknown
- Transparency beats confidence early.

## 8. Interaction Contract (Re-affirmed)

| Action          | Result                      |
| --------------- | --------------------------- |
| Card name       | External listing (commit)   |
| Set name        | Discovery w/ set filter     |
| Pokemon name    | Discovery w/ Pokemon filter |
| Seller name     | Seller page                 |
| Row / card body | Expand                      |
| New expand      | Auto-collapse previous      |

No ambiguity. Ever.

## 9. State and Memory Contract

The system should quietly remember:

- List vs card view
- Sort order
- Filters (within session / reasonable persistence)

Never announce this.
Just feel respectful.

## 10. What This Contract Explicitly Forbids

- Gamification
- Urgency language
- "Hot deal" badges
- Decorative UI
- New primitives without doctrine update
- Silent state changes
- Hidden trust information

If it looks like marketing, it does not belong.

## 11. Litmus Test (use this forever)

Before approving any UI change, ask:

"Would this still feel trustworthy if the prices were wrong?"

If the answer is no - it violates the contract.

## 12. Link Migration Log

### 2026-01-18: Stage 4 Slice A - Link Target Updates

All internal links previously pointing to `/cards/*` and `/sets/*` now point to rebuild equivalents:

| Old Target     | New Target                      | Rationale                                        |
| -------------- | ------------------------------- | ------------------------------------------------ |
| `/cards/[id]`  | `/rebuild/listing/[listingId]`  | Listing-centric model; cards are a dimension     |
| `/sets/[slug]` | `/rebuild/discovery` (filtered) | Sets surface via discovery filter, not own route |

Components updated: `CardIdentity`, `FeaturedDeals`, `CardDetailClient`, `AlertsSubscribeClient`, `ExclusionsClient`.

Admin tools (`AdminAlertsClient`, `AlertsToolClient`) now show static "Card ID:" text instead of clickable links (alerts are card-centric; no listingId available).

No user-visible behavior change expected since these components are not currently rendered in active routes. Link targets prepared for future activation.

### 2026-01-18: Stage 4 Slice C - /cards Stubs Deleted

Route stubs for `/cards/*` have been removed. All requests to `/cards/*` now return 404.

| Route            | Previous Behavior                    | New Behavior |
| ---------------- | ------------------------------------ | ------------ |
| `/cards/[id]`    | 308 redirect to `/rebuild/listing/*` | 404          |
| `/cards/invalid` | 404                                  | 404          |

Internal links were already migrated in Slice A (PR #353). This deletion completes the route removal.

### 2026-01-18: Stage 4 Slice D - /sets Stubs Deleted

Route stubs for `/sets/*` have been removed. All requests to `/sets/*` now return 404.

| Route           | Previous Behavior                    | New Behavior |
| --------------- | ------------------------------------ | ------------ |
| `/sets`         | 308 redirect to `/rebuild/discovery` | 404          |
| `/sets/[setId]` | 308 redirect to `/rebuild/discovery` | 404          |

Internal links were already migrated in Slice A (PR #353). This deletion completes the route removal.

### 2026-01-19: Tier 0 - Discovery Preset Validation

Discovery preset parsing is now centralized and rejects unknown values instead of silently falling back to the default preset.

| Route / Param                       | Previous Behavior                          | New Behavior |
| ----------------------------------- | ------------------------------------------ | ------------ |
| `/discovery?sort=<unknown>`         | Rendered default preset (silently coerced) | 404          |
| `/rebuild/discovery?sort=<unknown>` | Rendered default preset (silently coerced) | 404          |

Allowed presets: `newest`, `biggest-discount`, `endingSoon` (aliases: `ending-soon`, `endingsoon`).

### 2026-01-19: Discovery v1 - Filters + Legacy Discovery Deletion

Discovery v1 introduces minimal, data-first filtering controls and tightens legacy discovery decommission behavior.

**User-visible additions (Discovery):**

- Filter controls added: price range (CAD), condition, language, min confidence threshold, seller substring.
- List rows now include a concise trust summary line (confidence 0-100 + trust state) and freshness label; provenance drilldown remains available at the bottom of the page.
- Invalid filter values return a deterministic 404 (Discovery-specific not-found state).

**User-visible behavior changes (Legacy routes):**

| Route          | Previous Behavior                                  | New Behavior |
| -------------- | -------------------------------------------------- | ------------ |
| `/top-deals`   | 308 redirect to `/discovery?sort=biggest-discount` | 404          |
| `/newest`      | 308 redirect to `/discovery?sort=newest`           | 404          |
| `/ending-soon` | 308 redirect to `/discovery?sort=endingSoon`       | 404          |

Inbound navigation now links directly to `/discovery` presets (no legacy route entrypoints).

### 2026-01-20: Discovery v1 - Pagination Controls + Facets Display

Discovery now surfaces pagination controls and server-computed facet counts on `/discovery`.

**User-visible additions (Discovery):**

- Pagination controls render below the results list: Prev/Next buttons, current page display, and page size selector (25/50/100).
- Facets block renders above the results list showing counts for: condition, language, confidence.

**Pagination behavior (Discovery):**

| Param      | Rule                                                     |
| ---------- | -------------------------------------------------------- |
| `page`     | Minimum 1 (default = 1)                                  |
| `pageSize` | Allowed values 25/50/100 only; other values render as 25 |

**New stable selectors (for contract tests):**

- `data-testid="discovery-facets"`
- `data-testid="discovery-pagination"`
- `data-testid="discovery-pagination-prev"`
- `data-testid="discovery-pagination-next"`
- `data-testid="discovery-pagination-page"`
- `data-testid="discovery-pagination-page-size"`

### 2026-01-20: Upgrade #1 - Expandable Rows (Inspection Mode)

Rebuild list rows now support an "inspection mode" expansion pattern for deeper trust + provenance context without leaving the list.

**Interaction model (Discovery list rows):**

- Row body click = Inspect (toggle expand/collapse).
- Title click = Act (navigate to listing detail).
- Only one row may be expanded at a time; expanding a new row auto-collapses the previous row.

**Accessibility (non-negotiable):**

- Focused row: Enter toggles expand/collapse.
- Focused expanded row: Escape collapses.
- No focus traps; links remain keyboard-navigable and do not trigger row toggle.

**Expanded row content constraints:**

- Allowed: trust/reliability explanation, price context, provenance/transparency fields, seller details when present.
- Forbidden: images, carousels, or any "marketing" content.

**Inspection-mode styling requirements (subtle, enterprise):**

- Detail panel has tone-on-tone background shift and an inset border treatment.
- Separation is achieved via rhythm/spacing, not flashy color or animation.
- No height animations or measurement hacks; expansion must be deterministic.

**Stable selectors (for contract tests):**

- `data-testid="rebuild-deal-row"` (with `aria-expanded`)
- `data-testid="rebuild-deal-row-title"`
- `data-testid="rebuild-deal-row-expanded"` (must include class marker `rebuild-inspection-panel`)

### 2026-01-20: Upgrade #2 - Discovery List Scan Power (Scan Hierarchy)

Rebuild discovery rows must support fast scan triage (power users can evaluate dozens of deals without expanding rows).

**Scan hierarchy (collapsed rows):**

- Primary (visual anchor): Price (largest numeric; tabular-nums; never hidden).
- Secondary (annotation): Discount as an interpreted note (e.g., `-18% vs market`), not a competing headline.
- Subordinate (always visible, calm): Confidence, seller context, market/source, and freshness.

**Unknown semantics (mandatory):**

- Missing values render as `—` and must not collapse layout or remove columns.

**Density + alignment (mandatory):**

- Collapsed rows use a rigid grid/column layout so signals align across rows.
- Row height must remain consistent across rows (no conditional collapsed-row lines for optional fields).

**Sort-aware emphasis (presentation-only):**

- Biggest discount: discount annotation gains emphasis.
- Ending soon / Newest: freshness gains emphasis.

This does not change ranking or query semantics; it only changes visual weight.

### 2026-01-20: Upgrade #3 - Sort Correctness (URL Source-of-Truth)

Rebuild sort controls must be deterministic and persistent (no "flash then reset").

**Source-of-truth (mandatory):**

- Sort preset is derived from URL search params and the UI must render that exact effective value.
- Changing sort must update the URL immediately and persist across reload.

**Interaction model (unchanged):**

- This upgrade must not introduce new interactions; it only fixes correctness of existing sort controls.
