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
