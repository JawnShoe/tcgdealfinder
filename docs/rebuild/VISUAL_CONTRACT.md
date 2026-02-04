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

---

### 2026-01-21: Recovery - Discovery parity wave 1 (Market filter + VERIFIED badge + Market flag)

This recovery closes “Below parity” gaps for the rebuild Discovery list without changing any backend/scoring semantics.

**Market filter (US/CA, mandatory):**

- Market is a keyboard-accessible `select` control on rebuild Discovery filters.
- URL is source of truth: selecting a market and applying filters writes `market=US` or `market=CA` into the query string and persists on reload.
- Clearing filters must remove `market` (back to “Any”).

**Trusted seller badge (VERIFIED only, no new semantics):**

- Badge renders **only** when `trustAssessment.state === "VERIFIED"`.
- Badge meaning is visible without hover and does not change row height per-row (no conditional layout churn).

**Market flag in rows (US/CA):**

- Each row includes a compact market indicator (`🇺🇸 US` / `🇨🇦 CA`), with “—” when unknown.
- Meaning must be obvious without hover; tooltips are optional and not required for comprehension.

**Stable selectors (contract tests):**

- Market filter: `data-testid="discovery-filter-market"`
- Market indicator: `data-testid="rebuild-market-indicator"`
- Verified badge: `data-testid="rebuild-trusted-badge"`

### 2026-01-21: Recovery - Alerts Subscription (Wave 2A)

Alerts Subscription is a user-visible trust-to-action closure surface. This change adds a usable subscription form without introducing new trust semantics, scoring, or backend behavior.

**Behavior (mandatory):**

- Form is keyboard accessible (tab through inputs, Enter submits).
- Explicit submit, clear error state, and explicit success state (no polling, no background refresh).
- No silent defaults: the submitted payload must include all required fields explicitly.

**Copy (mandatory):**

- Success state message: "You'll only be emailed when a deal meets these conditions."

**Selectors (contract tests):**

- Form: `data-testid="rebuild-alerts-subscribe-form"`
- Card ID input: `data-testid="rebuild-alerts-card-id"`
- Email input: `data-testid="rebuild-alerts-email"`
- Min discount input: `data-testid="rebuild-alerts-min-discount"`
- Submit: `data-testid="rebuild-alerts-submit"`
- Success state: `data-testid="rebuild-alerts-success"`

If the answer is no - it violates the contract.

### 2026-01-21: Recovery - Alerts History (Public)

Alerts History closes the legacy "recent triggered alerts" parity gap by providing a public, sanitized history view for rebuild users (not the ops/auth-gated tool).

**Data contract (mandatory):**

- Public endpoint: `GET /api/rebuild/alerts/history`
- Returns only sanitized fields (no emails, no internal IDs, no raw query strings).
- Time window: last ~36 hours.
- Row limit: max 50.
- Stable ordering: most recent first.

**UI states (mandatory):**

- Loading: visible "Loading recent alerts..."
- Empty: "No alerts triggered recently."
- Error: "Unable to load recent alerts." with a Retry button.
- Populated: list of recent alerts with "what fired" and "when" (UTC is visible).

**Accessibility (mandatory):**

- History block has an accessible label and is keyboard navigable.
- Retry control is a real button.

**Selectors (contract tests):**

- History root: `data-testid="rebuild-alerts-history"`
- Loading: `data-testid="rebuild-alerts-history-loading"`
- Empty: `data-testid="rebuild-alerts-history-empty"`
- Error: `data-testid="rebuild-alerts-history-error"`
- Retry: `data-testid="rebuild-alerts-history-retry"`
- List: `data-testid="rebuild-alerts-history-list"`
- Item: `data-testid="rebuild-alerts-history-item"`

### 2026-01-21: End-Time Clarity (Discovery Rows)

End-time clarity closes the legacy “Ends” parity gap for rebuild discovery rows without introducing new semantics.

**Data source (mandatory):**

- Uses `ListingDomain.endsAtISO` (authoritative) derived from `listings.ends_at`.
- No new backend fields or heuristics in the UI layer.

**Behavior (mandatory):**

- Compact relative indicator renders in-row (e.g., `10h`, `45m`, or `Ended`).
- Exact UTC timestamp is revealed on hover and keyboard focus.
- No timers / no live countdown updates.
- CLS-safe: tooltip/reveal must not change row height.

**Keyboard (mandatory):**

- Tabbing to the ends indicator reveals the exact UTC timestamp.
- Escape closes the reveal.

**Selectors (contract tests):**

- Ends indicator: `data-testid="rebuild-ends-indicator"`
- Ends reveal/tooltip: `data-testid="rebuild-ends-tooltip"`

### 2026-01-21: Upgrade - Discovery — Cross-session Filter/Sort Persistence

Discovery persistence is a user-visible preference improvement. It persists discovery controls across browser sessions while keeping the URL as the canonical/shareable source of truth.

**What is persisted (mandatory):**

- Sort preset (`sort`)
- Filters that are already URL-controlled:
  - `minPriceCad`, `maxPriceCad`, `condition`, `lang`, `market`, `minConfidence`, `seller`
- Page size (`pageSize`)

**What is NOT persisted (mandatory):**

- Page number (`page`) (new sessions start at page 1)
- Any PII (no emails, no freeform queries beyond existing URL params)

**Precedence rules (mandatory):**

- URL is SSOT: if the current URL has any discovery params, they win.
- localStorage hydration is allowed only when the URL has no discovery params, and must apply once by updating the URL (no replace loops).

**Reset behavior (mandatory):**

- Clear/Reset must clear both the URL params and the persisted localStorage payload.

**Safe degradation (mandatory):**

- If localStorage is unavailable, corrupt, or version-mismatched: fall back to defaults with no crashes.

**Storage key (mandatory):**

- `rebuild.discovery.v1` (versioned)

**Selectors (contract tests):**

- Sort: `data-testid="discovery-sort-select"`
- Filters bar: `data-testid="discovery-filters-bar"`
- Market filter: `data-testid="discovery-filter-market"`
- Apply: `data-testid="discovery-filters-apply"`
- Clear: `data-testid="discovery-filters-clear"`
- Page size: `data-testid="discovery-pagination-page-size"`

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

### 2026-01-20: Upgrade #4 - Rebuild Layout Widening (1440/1600 cap)

Rebuild route content must not feel cramped on desktop while remaining calm and scan-first.

**Rebuild-only scope (mandatory):**

- Applies only to `/rebuild/**` routes. Legacy/global layout must remain unchanged.

**Container sizing (mandatory):**

- Centered container with desktop max-width cap `1440px`.
- On very large screens (`2xl`), cap increases to `1600px`.
- Gutters remain present (not edge-to-edge).

**Width-caused alignment (allowed):**

- If widening makes filter controls feel too spread out, controls may be locally constrained to preserve a cohesive cluster without changing behavior.

### 2026-01-20: Upgrade #5 - Scan Power Final (Column Grid + Rhythm)

Rebuild list rows must support table-like scan speed with a stable, column-aligned grid (collapsed) and deterministic inspection mode (expanded).

**Collapsed row grid anatomy (mandatory, desktop):**

- 4 fixed columns aligned row-to-row:
  - Identity (`rebuild-deal-col-identity`): title + subline.
  - Price (`rebuild-deal-col-price`): dominant numeric; historic baseline subordinate.
  - Discount (`rebuild-deal-col-discount`): discount percent + `vs market` annotation.
  - Trust (`rebuild-deal-col-trust`): Confidence, Trust state, Seller, Seen (always visible; no hover dependency).

**Dominant numeric rule (mandatory):**

- Price is the visual anchor in the collapsed row (largest numeric weight).
- Discount annotates; it must not visually compete with price.

**Unknown semantics (mandatory):**

- Missing numeric values render as `—` (never empty).
- Row structure must remain stable (no conditional DOM churn that changes column layout/height per-row).

**Selectors (contract tests):**

- Row container: `data-testid="rebuild-deal-row"`
- Expanded panel: `data-testid="rebuild-deal-row-expanded"` (includes class marker `rebuild-inspection-panel`)
- Grid columns:
  - `data-testid="rebuild-deal-col-identity"`
  - `data-testid="rebuild-deal-col-price"`
  - `data-testid="rebuild-deal-col-discount"`
  - `data-testid="rebuild-deal-col-trust"`

### 2026-01-20: Upgrade - Scan Power Complete (Collapsed Row Desktop Rhythm)

This upgrade finalizes the collapsed-row grid rhythm so the widened rebuild container reads as a dense, column-aligned scan surface (no “squished blocks”, no excessive gaps).

**Desktop grid template (mandatory):**

- Identity remains the flexible column: `minmax(0, 1fr)`.
- Fixed scan columns (desktop):
  - `lg`: Price `12rem`, Discount `10rem`, Trust `18rem`
  - `2xl`: Price `13rem`, Discount `11rem`, Trust `20rem`

**Column rhythm (mandatory):**

- Numeric columns are right-aligned, tabular, and non-wrapping.
- Trust rows must not wrap into multi-line “stack chaos”; values truncate if needed to preserve stable collapsed-row height.

### 2026-01-20: Feature - Credibility UI Lite (Confidence Drilldown)

Confidence must explain itself without hover dependency and without mutating trust semantics post-hydration.

**Interaction (expanded row only, mandatory):**

- Confidence badge is an accessible `button` (`aria-label="Open confidence details"` or equivalent).
- Click / Enter / Space toggles the drilldown panel.
- Escape closes the drilldown panel (does not require collapsing the row).

**Panel placement + stability (mandatory):**

- Drilldown panel renders **inside** the existing expanded/inspection panel (`rebuild-inspection-panel`).
- Collapsed row height MUST NOT change when toggling confidence (no inline expansion in collapsed rows).
- No measurement-based animation; deterministic show/hide only.

**Panel contents (lite, must be sourced from existing listing fields only):**

- Header: “Confidence”
- Current confidence label/value (whatever the listing already provides)
- Contributing factors + values (only if fields exist; omit absent rows)
- Transparency fields (fetched/seen timestamp + source/provenance identifiers where available)

**Stable selectors (contract tests):**

- `data-testid="rebuild-confidence-button"`
- `data-testid="rebuild-confidence-panel"`

**Methodology explanation (additive):**

- Drilldown includes a plain-English methodology section titled "How confidence is calculated".
- Diagnostic details remain present; no weights/math are exposed and no guarantees are changed.
- Confidence describes price reliability (not deal quality); it is a brake when information is incomplete.
- No layout contract changes beyond expanded-panel text (collapsed-row height invariant).

### 2026-01-22: Homepage Visual Legitimacy — Trust-Forward Consumer

This change applies consumer-facing visual polish to the `/rebuild` homepage only. Trust semantics are unchanged.

**Homepage visual intent:**

- H1: "Today's Best Deals"
- Subline: "Price-checked against market data • Seller-verified • Updated regularly"
- Removed from Home: "Rebuild lane", "pipeline data", amber warning banners

**Progressive disclosure rule (Home only):**

- **Default row (collapsed):** Card name, Discount % (hero), Price, Confidence badge, Freshness, Seller + feedback count
- **First expand:** "Deal Quality" panel with plain-English content only:
  - Confidence level + one-line explanation
  - Seller verification + history
  - Price context vs market
  - Freshness ("Last checked X ago")
  - Links: "View full details", "How confidence is calculated →"

**Home expansion MUST NOT show:**

- Risk flag enums (e.g., `MISSING_CONFIDENCE_WEIGHT`)
- Pipeline names (e.g., `rebuild-db-v1`)
- "Inputs (lite)" sections
- ISO timestamps
- Multi-paragraph methodology blocks
- Transparency/debug blocks

**Where deep trust explanation lives:**

- Listing detail page (`/rebuild/listing/[id]`)
- Explicit secondary link ("How confidence is calculated →")

**Trust semantics unchanged:**

- No ranking, filtering, or scoring logic changes
- Confidence/freshness/provenance still derived server-side
- Existing trust surface contracts (ResilienceLabel, Confidence badge) preserved
- Discovery page (`/rebuild/discovery`) unaffected by this change

### 2026-02-04: Stabilization — Ops metrics degrade gracefully

- `/rebuild/ops` metrics panels MUST treat missing metrics tables as an explicit degraded state (NOT INSTRUMENTED), not a server error.
- Copy MUST be low-panic and explicit: "Metrics tables not present in this environment yet."
