# Non-Negotiables

## Hard Gates

- Price/deal indicators MUST NOT mutate after first render; versioned state only.
  - CI assertion: hydration diff for price/deal fields is zero.
- Trust metadata MUST be visible in-viewport at first render; no hover-only discovery.
  - CI assertion: SSR markup includes trust metadata element in initial viewport.
- No CLS on key surfaces (listing table, detail header, confidence badge, primary CTA).
  - CI assertion: CLS = 0 in visual regression snapshots for these surfaces.
- No hover-only critical meaning; hover can only enhance.
  - CI assertion: critical meaning is present without hover (a11y + visual checks).
- One primitive per cross-cutting concern (tooltip/popover, skeleton/loading, confidence badge/explainability, price formatting, table layout, error/empty states).
  - CI assertion: no duplicate primitives added; usage consolidated.
- Confidence scoring MUST be SSR-stable and reproducible (same inputs => same output).
  - CI assertion: deterministic output for identical inputs.

## REBUILD ISOLATION (LOCKED)

- Rebuild implementation must live under a dedicated rebuild namespace/folder tree (exact name TBD).
- Rebuild code MUST NOT import from legacy paths.
- Legacy may be consulted read-only; reuse only after passing new contracts.

## Burned Earth Policy (LOCKED)

- Contract/meta-rule violations are fixed immediately or reverted; no "later" on trust pathways.

## Enforcement mechanisms (planned)

- Phase 0 skills: primitive-enforcer, rebuild-contract-guard, pr-impact-declaration.
- Fail-hard CI gates: lint/typecheck/unit, e2e smoke, visual regression/CLS, a11y smoke, perf budget.
