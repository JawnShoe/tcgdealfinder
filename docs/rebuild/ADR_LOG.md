# ADR Log

## ADR-0001: Rebuild lane path + isolation rule

- Status: Accepted
- Decision: Rebuild lane lives at app/rebuild/** (route prefix /rebuild/**). Rebuild code must remain isolated from legacy paths.
- Rationale: Prevent intermingling and ensure contract-first rebuild discipline.
- Consequences: Cutover is by route ownership only; no blended flags between legacy and rebuild.

## ADR-0002: Contracts-first + single primitives + fail-hard CI gates

- Status: Accepted
- Decision: Rebuild work is contracts-first, enforces single primitives per concern, and requires fail-hard CI gates.
- Rationale: Prevent drift, variant sprawl, and silent regressions in the rebuild lane.
- Consequences: CI gates exist and run on every PR; EXEMPT (TEMP) gates are documented in workflow and RELEASE_CHECKLIST.md and must be removed when unblocked.
- EXEMPT (TEMP) unblocks:
  - E2E smoke: Playwright config + rebuild route smoke.
  - Visual regression/CLS: baseline capture + CLS thresholds.
  - A11y smoke: a11y runner + baseline.
  - Perf budget: budget definition + measurement harness.

## ADR-0003: Phase-1 Visual Contract adoption

- Status: Accepted
- Decision: Adopt docs/rebuild/VISUAL_CONTRACT.md as the Phase-1 visual contract for rebuild UI surfaces.
- Rationale: Prevent "vibecoded / AI slop" drift and enforce a calm, data-first design system.
- Consequences: Phase-1 UI changes must follow the visual contract; deviations require a contract update.

## ADR-0004: Rebuild DB availability contract

- Status: Accepted
- Decision: Standardize rebuild DB-availability behavior to prevent drift across rebuild routes.
- Rationale: Ensure rebuild pages remain build-safe and deterministic when DATABASE_URL is missing.
- Consequences: Rebuild list pages return empty results and detail fetches return null when DB is unavailable, and pages render a clear data-unavailable empty state.
