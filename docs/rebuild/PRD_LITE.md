# Rebuild PRD Lite

Status: DRAFT (signed when merged)

## Product Promise

Find actionable undervalued listings you can trust, fast.

## Define "Actionable"

- Listing is in-stock/active at render time.
- Direct outbound link is present and valid.
- Condition is explicit and unambiguous.
- Price and deal indicators are stable on first render (no client mutation).
- Trust metadata (source, freshness, confidence) is visible without hover.

## Explicit Non-Goals

- No ML-based ranking or scoring V1.
- No cross-market dedupe or merge V1.
- No complex personalization V1.
- No new integrations or source expansion V1.
- No client-only confidence or trust scoring.
- No hover-only meaning for critical trust signals.
- No UI redesign outside the rebuild lane.
- No legacy refactor or cleanup in this phase.

## Success Metrics (lite)

- Outbound clicks per session >= TBD target.
- Time-to-first-action <= TBD seconds.
- Percent of pages meeting CWV (LCP/INP/CLS) >= TBD.
- Sessions with trust metadata visible at first render >= TBD.
- Freshness SLO compliance >= TBD.

## Scope Boundaries (layering)

- UI: renders domain models only; must not parse raw integration payloads.
- Domain: owns deal/trust rules; must not depend on integration schemas.
- Data access: normalizes raw data into domain types; no UI formatting.
- Integrations: isolated adapters only; no UI or domain imports.

## Rebuild execution model

Same repo; isolated rebuild lane; legacy remains read-only reference; no intermingling.

## Visual Contract

See docs/rebuild/VISUAL_CONTRACT.md.
