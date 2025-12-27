# DESIGN AUDIT — JAN 2025 (ADVISORY)

Status: Advisory (Non-executable)
Purpose: Preserve external expert analysis to inform phased redesign decisions
Scope: Presentation, hierarchy, trust, systemization only
IMPORTANT: This document is NOT an instruction set. All execution must be scoped via DESIGN_PHASES.md.

---

# TCG Deal Finder — Comprehensive Design Audit

## 0. Framing the Engagement

> "We're open to a full redesign if it materially improves trust, clarity, and long-term usability. We don't want novelty for novelty's sake."

---

## 1. First-Principles Product Read

### What problem is this product really solving?

**Core Problem:** Identifying undervalued Pokémon TCG cards on eBay before other buyers find them — essentially a **real-time arbitrage detection tool** for collectors and resellers.

**Secondary Problems:**

- Filtering out untrustworthy sellers
- Comparing prices across international markets (US, CA, GB, AU)
- Tracking price history to validate "deal" claims
- Managing a personal watchlist

### Who is this for?

**Primary Audience:** Power users — collectors and resellers who:

- Understand market pricing (TCGPlayer, historic sales)
- Check deals frequently (multiple times daily)
- Make quick purchasing decisions
- Value data density over visual polish

**Secondary Audience:** Serious hobbyist collectors who want deals but aren't day-trading cards.

### Is the current UI aligned with that audience?

**Partially.** The data-dense tables are appropriate for power users, but:

- Trust signals are underdeveloped for the skeptical buyer
- The visual polish suggests "hobby project" more than "professional tool"
- Mobile experience sacrifices too much functionality

---

## 2. Trust & Credibility Assessment

### Trust Score: 6/10

### Visual cues HURTING trust:

| Issue                      | Location        | Impact                      |
| -------------------------- | --------------- | --------------------------- |
| No visible logo/brand mark | Header          | Feels anonymous             |
| Generic favicon            | Browser tab     | Forgettable                 |
| Emoji usage (⭐, ★)        | Tables, buttons | Looks amateur               |
| "Dev Only" admin login     | `/admin/login`  | Exposes internals           |
| No social proof            | Anywhere        | No user count, testimonials |
| Basic error states         | API failures    | Generic messages            |

### Visual cues MISSING that high-trust tools have:

- **Security indicators** — No HTTPS badge, no "data freshness" timestamp
- **Data provenance** — Where do prices come from? When was this updated?
- **Company/creator identity** — Who built this? Where can I contact them?
- **Changelog/transparency** — No visible versioning or update history
- **Third-party validation** — No integration badges (eBay Partner, etc.)

### Where would a skeptical collector hesitate?

1. **"Historic USD" column** — How is this calculated? From what data source?
2. **"Confidence" ratings** — What algorithm? Can I trust it?
3. **Discount percentages** — Are these real or manipulated?
4. **Seller trust badges** — What criteria earns a checkmark?

### Recommendation to feel more professional:

- Add a proper logo and favicon
- Replace emojis with SVG icons
- Add "Last updated X minutes ago" timestamps
- Explain data sources in tooltips or a dedicated page
- Add a footer with creator info and links

---

## 3. Redesign Direction

### Current visual resemblance:

- A mid-2010s Bootstrap dashboard
- Developer-facing admin panels
- Spreadsheet with styling

### Should resemble instead:

- **Bloomberg Terminal lite** — Dense data, professional credibility
- **Camelcamelcamel** — Price tracking with clear value proposition
- **StockX** — Marketplace credibility with data backing

### Recommended style direction: **Analytical / Dashboard Hybrid**

| Approach                | Pros                              | Cons                              |
| ----------------------- | --------------------------------- | --------------------------------- |
| Bloomberg-like          | Trust, density, power-user appeal | Learning curve, intimidating      |
| Marketplace-like        | Friendly, familiar                | May feel too casual for data tool |
| Dashboard/terminal      | Data-forward, professional        | Can feel cold                     |
| **Hybrid consumer-pro** | Best of both worlds               | Requires careful balance          |

### Push simpler or denser?

**Slightly denser** — but with better visual hierarchy. Current density is fine; the problem is organization, not quantity.

---

## 4. Information Architecture

### Is the current page structure intuitive?

**Mostly yes**, but with friction points:

| Page        | Issue                                               |
| ----------- | --------------------------------------------------- |
| Home        | "Featured Deals" vs "All Deals" distinction unclear |
| Card Detail | Price history chart competes with listings          |
| Admin       | Tab labels don't clearly explain function           |
| Search      | No advanced filters exposed                         |

### Overloaded sections:

1. **DealsTable** (58KB component) — Doing too much: filtering, sorting, display variants, responsive logic
2. **CardDetailClient** (58KB) — Combines chart, listings, market availability, metadata
3. **AdminBlacklistClient** (23KB) — Multiple concerns in one component

### What to remove, merge, or split:

| Action | Target                                           | Reason                          |
| ------ | ------------------------------------------------ | ------------------------------- |
| Split  | DealsTable → Table + Filters + Pagination        | Single responsibility           |
| Merge  | FeaturedDeals + FeaturedDealsStrip               | Same concept, different layouts |
| Remove | "Dev Only" from admin login                      | Confusing to users              |
| Split  | CardDetailClient → Chart + Listings + MarketInfo | Too monolithic                  |

### Wrong first thing users see:

On the homepage, the **SearchAutocomplete** is the first interactive element, but users likely want to:

1. See deals immediately (browse-first behavior)
2. Understand what this tool does (value proposition)
3. Then search for specific cards

**Recommendation:** Lead with featured deals + clear value statement, search secondary.

---

## 5. Tables, Cards, and Data Density

### Are tables the right primary interface?

**Yes** — for this power-user audience, tables are correct. But they need refinement.

### Current table issues:

| Problem    | Details                                        |
| ---------- | ---------------------------------------------- |
| Row height | 0.85rem padding feels cramped on desktop       |
| Typography | Inconsistent font sizes across columns         |
| Alignment  | Numeric columns not right-aligned consistently |
| Scanning   | No visual rhythm; rows blur together           |
| Actions    | Watchlist button placement inconsistent        |

### What's slowing visual parsing?

1. **All columns equal weight** — Price and discount should be more prominent
2. **No row grouping** — 50 identical rows with no visual breaks
3. **Link styling** — Card names as blue links compete with other text
4. **Badge overload** — Confidence + Trusted + Market flags = visual noise

### Fastest possible version:

```
[Card Image Thumb] | Card Name | $XX.XX (XX% off) | Seller ✓ | [Watch] [Buy]
```

Reduce to 5 columns max, hide secondary data in expandable rows or tooltips.

---

## 6. Visual Language & Design System

### Current state: **Informal system, not documented**

Components exist but aren't systematized:

- 30+ components in flat directory
- No Storybook or component docs
- Tailwind theme not extended
- Colors hardcoded as hex values

### What to standardize more aggressively:

| Element    | Current           | Recommendation                   |
| ---------- | ----------------- | -------------------------------- |
| Colors     | Hardcoded hex     | Design tokens in Tailwind config |
| Typography | Ad-hoc sizes      | Named scale (xs → 2xl)           |
| Spacing    | Mixed utilities   | Strict 4px grid                  |
| Buttons    | Repeated classes  | Button component with variants   |
| Inputs     | Multiple patterns | Unified form control system      |

### Overusing badges/pills/icons?

**Yes.** Current row might show:

- Confidence chip
- Trusted badge
- Market flag
- Seller seen badge
- Watchlist star

**Recommendation:** Consolidate into 2-3 visual signals max per row.

### Is hierarchy obvious without color?

**No.** Remove color and the design loses most of its information hierarchy. Need stronger typography and spacing-based hierarchy.

---

## 7. Brand & Differentiation

### What does this brand stand for visually?

Currently: "Functional data tool" — not distinctive.

### Would you recognize it if seen twice?

**Unlikely.** No memorable visual elements:

- No logo
- No distinctive color (slate is neutral)
- No unique interaction patterns
- No personality

### Does it feel generic, niche, or opinionated?

**Generic with niche purpose.** The data is specialized, but the presentation could be any admin dashboard.

### What should this site be known for visually?

**Options:**

1. **"The Bloomberg of TCG deals"** — Professional, data-dense, trusted
2. **"Deal radar"** — Dynamic, real-time feel, motion/activity
3. **"Collector's edge"** — Premium, exclusive, curated

**Recommendation:** Lean into #1 — build trust through professionalism.

---

## 8. Redesign Scope & Risk

### Minimum viable redesign:

1. **Typography system** — Implement consistent scale
2. **Color tokens** — Move hex to CSS variables
3. **Trust elements** — Logo, timestamps, data sources
4. **Table refinement** — Better visual hierarchy

### Do NOT touch in v1:

- Core functionality (deals algorithm, API)
- Data structures
- Admin backend logic
- Mobile responsive breakpoints (refine later)

### Highest regression/usability risk:

| Change                 | Risk                           |
| ---------------------- | ------------------------------ |
| Table column reorder   | Power users have muscle memory |
| Navigation restructure | Bookmarks break                |
| Color palette swap     | Accessibility regressions      |
| Component architecture | Bugs in refactoring            |

### Prototype first:

**Homepage table redesign** — Highest traffic, most impact, contained scope.

---

## 9. Phased Redesign Strategy

### Phase 1: Visual Language (2-3 weeks)

- Design tokens (colors, spacing, typography)
- Logo and favicon
- Button/badge/input component variants
- Trust indicators (timestamps, source badges)

### Phase 2: Layout + Hierarchy (3-4 weeks)

- Homepage information architecture
- Table visual refinement
- Card detail page restructure
- Navigation clarity

### Phase 3: Interactions (2-3 weeks)

- Loading states
- Error handling patterns
- Micro-animations (subtle)
- Mobile experience improvements

### Safest first redesign step:

**Design tokens + typography scale.** Zero functional change, pure CSS, easy to revert.

---

## 10. Competitive Benchmarking

### Benchmark against:

| Site                | Why                  | What they do better                                   |
| ------------------- | -------------------- | ----------------------------------------------------- |
| **Camelcamelcamel** | Price tracking tool  | Trust indicators, data transparency, clear value prop |
| **TCGPlayer**       | Same domain (TCG)    | Card imagery, market feel, professional polish        |
| **StockX**          | Reseller marketplace | Trust/verification, clean data presentation           |

### What competitors do worse:

- Camelcamelcamel: Visual design is dated
- TCGPlayer: Overwhelming for simple lookups
- StockX: Too much friction for quick browsing

**Opportunity:** Combine Camelcamelcamel's transparency + StockX's polish + TCGPlayer's domain expertise.

---

## 11. Deliverables & Output

### Recommended audit deliverables:

| Deliverable             | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| **Design tokens file**  | Colors, typography, spacing as CSS variables |
| **Component inventory** | Current state + proposed improvements        |
| **Typography scale**    | Named sizes with use cases                   |
| **Homepage wireframe**  | New information hierarchy                    |
| **Table design spec**   | Column widths, alignments, visual treatment  |
| **Trust elements spec** | Logo, badges, timestamps placement           |

### Decisions enabled after audit:

- Which components to refactor first
- Color palette adjustments
- Typography implementation plan
- Phase 1 scope confirmation

---

## 12. Final Question

### If this were my product, what would I change first?

**First:** Add visible trust indicators — logo, "last updated" timestamps, data source explanations. These are low-effort, high-impact changes that immediately elevate perceived quality.

### What would I leave alone?

**The core table-based interface.** It's appropriate for power users. The problem isn't the pattern; it's the execution.

---

# Additional Audit Areas (Beyond Original Questionnaire)

## 13. Performance & Perceived Speed

| Metric                   | Current State                  | Recommendation                           |
| ------------------------ | ------------------------------ | ---------------------------------------- |
| First Contentful Paint   | Unknown (not measured)         | Add Core Web Vitals monitoring           |
| Largest Contentful Paint | Large tables may delay         | Implement virtual scrolling for 50+ rows |
| Cumulative Layout Shift  | Charts load async (shift risk) | Reserve space for chart container        |
| Skeleton loading         | Not implemented                | Add skeleton states for tables/charts    |

**Perceived speed matters for trust.** A slow-feeling tool feels less reliable.

## 14. Error States & Edge Cases

| Scenario        | Current              | Recommendation                       |
| --------------- | -------------------- | ------------------------------------ |
| No deals found  | Generic "no results" | Helpful empty state with suggestions |
| API timeout     | Error boundary       | Retry button + cached data fallback  |
| Invalid card ID | 404 page             | Friendly redirect to search          |
| Stale data      | No indication        | "Data may be outdated" warning       |

## 15. Accessibility Audit

| Issue                               | Severity | Location               |
| ----------------------------------- | -------- | ---------------------- |
| Color contrast (slate-500 on white) | Medium   | Throughout             |
| Focus indicators                    | Low      | Some custom components |
| Screen reader labels                | Medium   | Tables, tooltips       |
| Keyboard navigation                 | Medium   | Tooltip system         |
| Skip links                          | Low      | Not present            |

**Recommendation:** Run automated accessibility scan (axe, Lighthouse) before redesign.

## 16. Internationalization Readiness

| Element           | Current       | Issue                                   |
| ----------------- | ------------- | --------------------------------------- |
| Currency display  | Hardcoded "$" | Multi-market tool should handle symbols |
| Date formats      | US format     | UK/AU users expect different            |
| Number formatting | Inconsistent  | 1,234.56 vs 1234.56                     |
| RTL support       | None          | Not critical but good to plan           |

## 17. State Management & URL Structure

| Issue                     | Impact                     |
| ------------------------- | -------------------------- |
| Filter state not in URL   | Can't share filtered views |
| Sort state not persisted  | Resets on navigation       |
| Pagination not in URL     | Back button breaks         |
| Watchlist in localStorage | No cross-device sync       |

**Recommendation:** Move filter/sort/pagination to URL params.

## 18. Analytics & Instrumentation

| Question                             | Current State          |
| ------------------------------------ | ---------------------- |
| Do you know which features are used? | Sentry for errors only |
| Can you measure redesign impact?     | No baseline metrics    |
| A/B testing capability?              | Not present            |

**Recommendation:** Add basic analytics before redesign to measure improvement.

## 19. Documentation & Onboarding

| Gap                     | Impact                      |
| ----------------------- | --------------------------- |
| No "How it works" page  | Users don't understand data |
| No FAQ                  | Support burden              |
| No onboarding flow      | New users lost              |
| Admin docs are internal | Hard to maintain            |

## 20. Component Architecture Debt

| File                     | Size | Issue                    |
| ------------------------ | ---- | ------------------------ |
| DealsTable.tsx           | 58KB | Monolithic, hard to test |
| CardDetailClient.tsx     | 58KB | Multiple concerns        |
| AdminBlacklistClient.tsx | 23KB | Complex state logic      |

**Recommendation:** Refactor large components before adding features.

---

# Technical Inventory (Codebase Analysis)

## Tech Stack

- **Framework**: Next.js 14.2.35 with App Router
- **React**: 18.3.1
- **TypeScript**: 5.4.5
- **Styling**: Tailwind CSS 4.1.18 with PostCSS
- **Charts**: Recharts 3.5.1
- **Error Tracking**: @sentry/nextjs

## Component Inventory

### Data Display Components

- `DealsTable.tsx` (58KB) — Main deals listing table
- `FeaturedDeals.tsx` — Grid-based card layout
- `FeaturedDealsStrip.tsx` — Horizontal scrollable carousel
- `TopDealsClient.tsx` — Top deals table variant
- `CardDetailClient.tsx` (58KB) — Card detail view
- `PriceHistoryChart.tsx` — Recharts line chart

### Form & Input Components

- `SearchAutocomplete.tsx` — Autocomplete search
- `ListingLookup.tsx` — eBay item lookup
- `AdminLoginClient.tsx` — Admin authentication

### Badge & Status Components

- `ConfidenceChip.tsx` — Color-coded reliability indicator
- `TrustedBadge.tsx` — SVG checkmark shield
- `SellerSeenBadge.tsx` — Seller activity indicator
- `MarketFlag.tsx` — SVG country flags

### Utility Components

- `TooltipPopover.tsx` — Portal-based tooltip system
- `SellerNameWithTooltip.tsx` — Interactive seller name
- `CardIdentity.tsx` — Card metadata display
- `WatchlistButton.tsx` / `WatchlistStarButton.tsx` — Watchlist toggles
- `WhyDealHint.tsx` — Inline help text

## Current Color Palette

**Slate (Primary):**

- 50: `#f8fafc` (light bg)
- 200: `#e2e8f0` (borders)
- 500: `#64748b` (secondary text)
- 600: `#475569` (medium text)
- 900: `#0f172a` (dark text)

**Status Colors:**

- Green: `#047857` (good discount), `#065f46` (high confidence)
- Yellow: `#92400e` (medium confidence)
- Red: `#dc2626` (bad discount), `#b91c1c` (low confidence)
- Emerald: `#10b981` (trusted seller)

**Confidence Badge Palette:**

- High: `#d1fae5` bg, `#065f46` text
- Medium: `#fef3c7` bg, `#92400e` text
- Low: `#fee2e2` bg, `#b91c1c` text

## Typography (Current State)

```
Font Stack: Inter, Segoe UI, system-ui, -apple-system, BlinkMacSystemFont, Helvetica Neue, Arial
Base Size: 1.05rem (16.8px)
Line Height: 1.7

Page Title: clamp(1.8rem, 2.4vw, 2.75rem), font-weight 600
Section Title: 0.95rem, font-weight 600, uppercase, letter-spacing 0.05em
Table Header: 0.88rem, uppercase, letter-spacing 0.03em
Badge/Chip: 0.7rem, uppercase, letter-spacing 0.03em
```

## Page Routes

**Public:**

- `/` — Home with featured deals + all deals table
- `/search` — Card search with autocomplete
- `/cards/[cardId]` — Card detail with price history
- `/top-deals` — High-confidence deals
- `/newest` — Recently added listings
- `/ending-soon` — Auctions ending soonest
- `/watchlist` — Local watchlist

**Admin:**

- `/admin` — Admin hub (tabbed)
- `/admin/alerts` — Alert management
- `/admin/login` — Dev-only authentication

---

# Summary Scorecard

| Category                 | Score | Priority |
| ------------------------ | ----- | -------- |
| Trust & Credibility      | 6/10  | **HIGH** |
| Information Architecture | 7/10  | Medium   |
| Visual Design            | 6/10  | Medium   |
| Data Display             | 7/10  | Medium   |
| Design System            | 4/10  | **HIGH** |
| Brand & Differentiation  | 4/10  | Medium   |
| Accessibility            | 5/10  | Medium   |
| Performance              | 7/10  | Low      |
| Mobile Experience        | 6/10  | Low      |

---

# Top 5 Immediate Actions

1. **Create design tokens** — Extract colors, typography, spacing to CSS variables
2. **Add trust indicators** — Logo, timestamps, data source explanations
3. **Standardize components** — Button, Badge, Input component library
4. **Refine table hierarchy** — Better visual weight on key columns
5. **Document the system** — Even a simple markdown file helps

---

# Audit Metadata

- **Audit Date**: December 2025 (documented January 2025)
- **Auditor**: External expert analysis via comprehensive codebase review
- **Scope**: Full UI/UX evaluation covering 30+ components, all public routes, visual language, and architecture
- **Method**: Static codebase analysis, component inventory, pattern identification
