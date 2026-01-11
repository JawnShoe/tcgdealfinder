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

## ADR-0005: Discovery Presets Contract - Cutover Mapping v1 (LOCKED)

- Status: Accepted
- Decision:
  Purpose: Define explicit, non-guessy mapping for legacy discovery routes. No redirects are authorized until rebuild supports parity for each preset below.

  Authorized in PR 3 (routing-only) only if rebuild supports these presets with equivalent semantics:

  /newest -> /rebuild/discovery?sort=newest
  /top-deals -> /rebuild/discovery?feed=top
  /ending-soon -> /rebuild/discovery?sort=endingSoon
  /search -> /rebuild/discovery?q=<query>

  Not authorized yet (NO redirects until explicit rebuild equivalents exist):

  /cards/[cardId] -> no mapping (identifier mismatch vs /rebuild/listing/[id])
  /sets, /sets/[setId], /catalog, /catalog/sets/[catalogSetId], /watchlist, /alerts, /alerts/unsubscribe -> no rebuild equivalents

  /admin/**, /debug/** -> no cutover; remain legacy

  Non-interleaving rule: For any route cut over, legacy code must not remain in the same route handler. Cutover is ownership, not blending.

  Next step: PR 3 will implement only the redirects that are explicitly authorized above after confirming /rebuild/discovery supports the preset query params.

## ADR-0006: Enforcement Clarifications for Phase 2/3 (Non-Interleaving + Budgets + Invariants)

- Status: Accepted
- Decision: Record enforcement clarifications for Phase 2/3 quality without changing the plan text.
- Clarifications:
  - Cutover rule (route ownership, no interleaving): When cutting over a legacy route to rebuild, the route handler must be routing-only (redirect/rewrite) or fully rebuild-owned. No blending legacy + rebuild logic in the same handler.
  - Performance budgets as "moat" enforcement: Budgets/targets for LCP/CLS/INP proxy should be enforced (CI gate or documented policy), consistent with Trust/Perceived Speed goals.
  - Invariant testing: Rebuild tests should assert contracts and trust invariants (not legacy quirks). Legacy remains read-only reference during rebuild (no imports into rebuild namespaces).
  - Scale discipline: New rebuilt routes in Phase 3 must be added only via the proven template + contracts (no one-off route patterns).

## ADR-0007: Rebuild Drift Audit Ritual

- Status: Accepted
- Context: The rebuild requires explicit detection of architectural, contract, and governance drift to prevent silent erosion over time.
- Decision: A mandatory weekly Drift Audit is instituted for the rebuild lane, covering:
  - Core rebuild routes
  - Contract compliance
  - CI and synthetic enforcement
  - Boundary discipline
  - Tracker/evidence consistency
  - The audit produces a dated record with a commit or PR reference.
- Consequences:
  - Missing or failed drift audits constitute a governance violation.
  - Rebuild progression is blocked until drift is resolved and re-audited.

## ADR-0008: Mandatory PR Ritual Disclosure (Rebuild Lane)

- Status: Accepted
- Context: The rebuild requires repeatable, auditable PR discipline so contracts, gates, and drift risk cannot silently decay.
- Decision: All PRs must use a standardized disclosure checklist covering:
  - Scope / allowlist
  - Applicable contracts
  - Verification gates / CI evidence
  - Drift risk declaration
  - Evidence update requirements
- The canonical template is .github/PULL_REQUEST_TEMPLATE.md.
- Consequences:
  - PRs missing the required sections are governance violations.
  - Rebuild progression is blocked until disclosure is present.
