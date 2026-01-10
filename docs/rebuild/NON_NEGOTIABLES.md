# Non-Negotiables

## Governance Hardening (LOCKED)

### Authority / STOP Rule (LOCKED)

No rebuild decision, checkbox flip, or phase advancement may occur without authoritative artifacts (PR link + diff, CI run, evidence row) available. If artifacts are missing: **STOP**.

### Docs Sprawl Rule (LOCKED)

No net-new rebuild/governance docs may be added unless obsolete docs are archived or removed in the same PR (net doc count must not increase). Canonical rebuild governance remains in `docs/rebuild/` only.

### Evidence Freshness Rule (LOCKED)

Evidence must remain valid against main (links work, referenced files/paths still exist, gates still exist). If evidence becomes stale, the corresponding tracker item must be downgraded until refreshed.

### PR Atomicity Rule (LOCKED)

Each PR should advance at most one rebuild tracker checkbox or one governance rule. Mixed-scope PRs require explicit justification in the PR body.

### Repository-Verifiable Governance Rule (LOCKED)

Governance correctness must be verifiable from repository artifacts alone (docs, diffs, CI runs, evidence rows). No process may rely on tool or human memory to establish compliance.

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

## Drift Audit (Mandatory - Rebuild Lane)

Purpose:
Detect and prevent architectural, contract, and governance drift in the rebuild lane.

Cadence:

- Weekly, manual audit.

Scope (fixed):

- Routes:
  - /rebuild
  - /rebuild/discovery
  - /rebuild/listing/[id]

- Enforcement checks:
  - All CI gates pass
  - Rebuild contracts (hydration / skeleton / tooltip / trust surfaces) still hold
  - No CLS or post-hydration metadata pop-in
  - Synthetic monitoring passing
  - UI -> domain -> data -> integration boundaries respected

- Governance checks:
  - REBUILD_TRACKER.md and TRACKER_EVIDENCE.md remain in sync
  - No [x] exists without evidence
  - No undocumented deviations from contracts

Output:

- One dated audit record with:
  - Confirmation of checks
  - Link to commit or PR used as evidence

Failure:

- Any detected drift blocks further rebuild progression until resolved and re-audited.

This ritual is non-optional for the rebuild lane.

## PR Ritual (Mandatory - Rebuild Lane)

All PRs MUST include the standardized disclosure checklist (contracts, gates, drift risk, and evidence updates).
The canonical template is:

- .github/pull_request_template.md

Failure:

- Missing the PR ritual disclosure is a governance violation.
- Rebuild progression is blocked until the PR is updated to include the required sections.
