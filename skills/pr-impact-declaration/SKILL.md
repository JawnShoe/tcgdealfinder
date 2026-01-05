# Skill: PR Impact Declaration

## Goal

Force disciplined thinking and prevent silent regressions.

## Trigger

Every PR (docs-only included).

## Requirement

PR must include an Impact Declaration section filled out using:

- skills/pr-impact-declaration/templates/PR_IMPACT_TEMPLATE.md

## Must declare impact (Yes/No/N/A + brief)

- LCP/CLS/INP risk.
- A11y/keyboard risk.
- Hydration tier changes.
- Loading/skeleton dimension changes.
- Error/empty state behavior changes.
- Trust model / confidence computation changes.
- Data pipeline/schema touch (if yes, data-sanity-gate required).
- Rebuild isolation risk (legacy intermingling).

## STOP

- Impact Declaration missing.
- Impact Declaration is hand-wavy or unfilled.

## Rebuild Isolation (LOCKED)

- Rebuild implementation must live in a dedicated rebuild namespace/folder tree (name TBD).
- Rebuild code MUST NOT import from legacy paths.
- Legacy is read-only reference; reuse only after passing rebuild contracts.
