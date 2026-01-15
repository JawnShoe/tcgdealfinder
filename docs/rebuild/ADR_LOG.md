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

## ADR-0009: Rebuild Lane Boundary Discipline (UI → Domain → Data → Integrations)

- Status: Accepted
- Context: The rebuild depends on a stable architecture template. Boundary leaks (e.g., UI importing DB or integrations) create drift and make enforcement unreliable.
- Decision: The rebuild lane uses strict boundaries:
  - UI: rendering only; no DB/integration imports
  - Domain: deterministic business logic; no I/O
  - Data access: DB I/O only
  - Integrations: external I/O only
    Exceptions require a dedicated ADR specifying scope, rationale, and rollback.
- Consequences:
  - Boundary violations are governance failures.
  - Drift audits must flag violations and block progression until resolved or explicitly ADR-exempted.

## ADR-0010: Track B Baselines (Performance + Accessibility)

- Status: Accepted
- Context: Track B requires measurable product excellence (performance + accessibility) so the rebuild does not regress as features expand.
- Decision:
  - Performance targets + measurement method are defined in TRUST_METRICS.md.
  - CI must keep enforcing Perf Budget and CLS/Visual gates.
  - CI must keep enforcing A11y Smoke gate.
  - Keyboard-only navigation must remain functional on key rebuild routes.
- Consequences:
  - Disabling these gates or allowing regressions is a governance failure.
  - Drift Audit must flag missing enforcement.

## ADR-0011: Rebuild Route Render Modes (SSR-First)

- Status: Accepted
- Context: Rebuild performance and trust surfaces require predictable server rendering and stable hydration.
- Decision:
  - /rebuild: SSR only (dynamic). No streaming.
  - /rebuild/discovery: SSR only (dynamic). No streaming.
  - /rebuild/listing/[id]: SSR only (dynamic). No streaming for trust/price.
  - /rebuild/alerts: SSR shell is acceptable as static. No streaming.
  - /rebuild/ops: SSR only (dynamic). No streaming.
- Consequences:
  - Route performance contracts in docs/rebuild/CONTRACTS.md are authoritative.
  - Any render-mode change requires a new ADR and updated enforcement.

## ADR-0012: Track B1 Performance Budgets + Enforcement

- Status: Accepted
- Context: Track B1 requires explicit, enforceable performance rules for rebuild routes.
- Decision:
  - CLS budget: <= 0.01 enforced via tests/e2e/rebuild-cls.spec.ts (CI job: Visual Regression / CLS).
  - LCP/FCP/TBT/performance score budgets enforced via .lighthouserc.cjs (CI job: Perf Budget) for rebuild routes.
  - SSR trust surfaces + no pop-in metadata enforced via tests/e2e/rebuild.synthetics.spec.ts.
  - Image constraints enforced via synthetics: all rebuild images must declare dimensions.
  - INP and TTFB remain DEFERRED until a CI gate exists.
- Consequences:
  - CI must fail on performance regressions for enforced metrics.
  - Deferred metrics remain explicitly marked and may not be treated as complete.

## ADR-0013: Track B5 Threat Model (Rebuild Lane)

- Status: Accepted
- Context: Track B5 requires a concrete threat model with real, enforceable baselines so security and reliability do not drift.
- Decision:
  - Bots/scraping:
    - Baseline: segmented rate limits on rebuild public APIs; requestId logging on limit hits.
    - Deferred: CDN/WAF bot mitigation rules (documented in CONTRACTS; not CI-verifiable).
    - Signals: rate-limit hit logs + API error rate.
  - Affiliate fraud:
    - Baseline: outbound click logging + kill switch + input validation on /api/rebuild/outbound-click.
    - Deferred: fraud scoring/heuristics and partner dispute automation.
    - Signals: outbound click volume and anomalies (manual review).
  - Brute forcing endpoints:
    - Baseline: segmented rate limits + validation at boundaries.
    - Deferred: IP reputation and WAF rules.
    - Signals: rate-limit hits + elevated 4xx/429 spikes.
  - Spam/abuse:
    - Baseline: schema validation + rate limits on public APIs.
    - Deferred: CAPTCHA or external abuse scoring.
    - Signals: validation failure rate and repeated 400/429 patterns.
  - Secrets scanning:
    - Baseline: no secrets in repo + rotation policy enforced in NON_NEGOTIABLES.
    - Deferred: CI-enforced secret scanning (external tooling required).
- Consequences:
  - Deferred items must be called out in TRACKER_EVIDENCE and remain explicit.
  - CI enforcement focuses on rate limiting + validation gates for rebuild APIs.

## ADR-0014: Rebuild SEO Baseline (Canonicals + Structured Data)

- Status: Accepted
- Context: Track B6 requires deterministic SEO rules and CI enforcement to prevent silent regressions in the rebuild lane.
- Decision:
  - Canonical base uses the configured site URL (NEXT_PUBLIC_SITE_URL or VERCEL_URL; fallback to https://tcg-deal-finder.local).
  - /rebuild canonical -> /rebuild.
  - /rebuild/discovery canonical uses only sort when non-default; all other params are ignored.
  - Pagination policy: DEFERRED. page params are stripped until pagination is implemented and contract-updated.
  - Duplicate content policy: cross-market duplicates are collapsed in UI; listing canonical is /rebuild/listing/<id>.
  - /rebuild/ops and /rebuild/alerts are noindex and disallowed in robots.txt.
  - WebApplication JSON-LD is required site-wide; Product JSON-LD is required on listing detail.
- Consequences:
  - CI enforces canonical/robots/meta via tests/e2e/rebuild.synthetics.spec.ts.
  - Structured data shape is validated in lib/**tests**/unit/rebuildSeoBaseline.test.ts.

## ADR-0015: Trust Moat - Explainable Trust (Rebuild Lane)

- Status: Accepted
- Context: Trust signals drive user action. Implicit or unexplained trust claims create risk and make regressions hard to detect.
- Decision:
  - Trust in the rebuild lane must be explainable and derived from server data.
  - Core trust signals are: confidence weight, freshness (data age), provenance (source + fetched-at), and integrity flags.
  - Missing critical trust inputs yield an "insufficient" trust state; stale or flagged data yields a "degraded" state.
  - Deferred: seller reputation trends, multi-source trust fusion, and ML scoring (require new data and governance).
- Consequences:
  - Trust assessment is computed server-side and enforced by unit tests.
  - UI trust surfaces must disclose missing or degraded states; silent assumptions are forbidden.

## ADR-0016: Track C2 Action Engine Foundations (Alerts + Preferences)

- Status: Accepted
- Context: Track C requires action-engine foundations that are deterministic, trust-preserving, and rebuild-only without introducing UI risk or persistence drift.
- Decision:
  - Alerts are defined as deterministic domain rules (saved search, price threshold, trust threshold) evaluated server-side.
  - Alerts must pass trust gating: no fire on stale data beyond freshness SLO, missing confidence, or integrity failure.
  - Alert evaluation is exposed via rebuild-only API endpoints and is rate limited; DB-unavailable returns a safe 503 with an explicit error.
  - Preferences are request-scoped URL parameters (budget, condition, trust threshold); no cookies/localStorage in C2.
  - Persistence and UI wiring are deferred to later Track C items.
- Consequences:
  - Alert evaluation remains deterministic and SSR-safe.
  - Trust invariants are enforced before any alert decision is emitted.
  - Future UI/persistence work requires a new ADR to avoid silent drift.

## ADR-0017: Legacy Archive Cleanup (Track C Supporting Work)

- Status: Accepted
- Context: Legacy files that are unused, superseded by rebuild equivalents, or already quarantined but not formally archived create confusion and bloat. Cleaning these up reduces noise and makes the codebase easier to navigate while preserving historical reference.
- Decision:
  - All legacy files in quarantine are moved to `legacy/archive/<domain>/` with standardized header comments (`// ARCHIVED: replaced by rebuild lane – do not import`).
  - Domain-based organization: trust, search, watchlist, state, currency.
  - No behavior changes; archived files remain as reference-only.
  - ESLint + CI boundary checks continue to block imports from `legacy/**`.
  - LEGACY_QUARANTINE.md updated to reflect the new archive structure.
- Consequences:
  - Legacy directory is now archive-only; no active code remains at top level.
  - Future legacy cleanup follows the same pattern (add header, move to appropriate domain archive).
  - Track C3 (Visible Trust UI) can proceed without confusion about which legacy trust files are active.

## ADR-0018: Rules-Based Intelligence Layer (Track C3)

- Status: Accepted
- Context: Track C3 requires deterministic risk signals to enhance the trust moat without ML or UI expansion.
- Decision:
  - Intelligence layer lives at `lib/rebuild/intelligence/**` with pure evaluation functions.
  - V1 rules: STOCK_IMAGE_ONLY, SELLER_MISMATCH, SUSPICIOUS_DESCRIPTION, MISSING_KEY_FIELDS, PRICE_OUTLIER_SIMPLE.
  - All rules are boolean or threshold-based, fully reproducible, and explainable in one sentence.
  - Engine is fully deterministic: no wall-clock time, no IO, no side effects.
  - Integration is read-only: intelligence flags are additive signals, not trust score overrides.
  - `IntelligenceRiskFlag` is separate from `RiskFlag` to avoid coupling and preserve trust math stability.
  - Uses `ListingLike` minimal type to avoid circular import risk with listingMapper.
  - Flags are sorted alphabetically for stable, deterministic output ordering.
  - DEFERRED: ML/probabilistic scoring.
  - DEFERRED: UI expansion (no app/rebuild changes).
- Consequences:
  - New signals must follow the same pattern (pure, deterministic, one-sentence explainable).
  - Risk flags are available for future UI consumption but not wired in this track.
  - Intelligence results are attached to `ListingDomain.intelligence?` (optional field).

## ADR-0019: Start Legacy Decommission Program

- Status: Accepted
- Context: The rebuild lane is now complete and proven. Legacy code must be systematically decommissioned while preserving enterprise-grade auditability and VISUAL_CONTRACT compliance.
- Decision: Start the legacy decommission program with the following governance:
  - **Scope**: Legacy runtime routes/components/libs are in-scope. Scripts are in-scope but phased.
  - **Guardrails**: Boundary rules + CI gates remain fail-hard during decommission.
  - **Upgrade Ledger**: Every migration PR must include a Before/After/Why entry documenting the surface change.
  - **Cutover discipline**: Legacy routes must not be silently changed. Redirect/cutover must be explicit and tested.
  - **VISUAL_CONTRACT enforcement**: Every migrated user-visible surface must respect VISUAL_CONTRACT.
- Consequences:
  - Legacy deletion PRs require parity definition, test updates, and evidence entries.
  - Boundary cleanliness is a prerequisite for all decommission work.
  - The Upgrade Ledger provides an auditable migration trail.

### Upgrade Ledger

| Surface                                  | Before behavior                                                                                   | After behavior                                                                                                                         | Why upgrade                                                                 | Evidence (PR link + tests)                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/` (root entrypoint)                    | Rendered legacy homepage with localStorage watchlist and legacy trust layout                      | Server-side redirect to `/rebuild`; rebuild homepage with SSR-stable trust surfaces                                                    | Contract-first rebuild with deterministic trust and boundary isolation      | PR #262; Operator smoke PASS; all checks green                                                   |
| `/top-deals`                             | Rendered legacy top-deals listing                                                                 | Server-side redirect to `/rebuild/discovery?sort=biggest-discount` (top deals preset)                                                  | Stage 1 decommission: consolidate visitor surface onto rebuild discovery    | PR #313; `tests/e2e/rebuild.synthetics.spec.ts` (Stage 1 decommission test); all checks green    |
| `/rebuild` (home)                        | Did not exist                                                                                     | SSR home route with recent deals, resilience label, compliance disclosure, provenance drilldown; DB-unavailable safe empty state       | Phase 1 rebuild foundation; trust-first surface with explicit degradation   | PR #255; loading/error states; rebuild-only data pipeline; visual contract guardrails pass       |
| `/rebuild/discovery`                     | Did not exist                                                                                     | SSR discovery route with listing grid, sort/filter, resilience label, compliance disclosure, provenance drilldown; safe empty state    | Phase 1 core engine; user-facing discovery with trust moat                  | PR #258; loading/error states; rebuild-only data; guardrails pass                                |
| `/rebuild/listing/[id]`                  | Did not exist                                                                                     | SSR listing detail with trust panel, confidence, provenance, resilience, intelligence signals, predictive signals; safe error handling | Phase 1 detail surface; SSR-stable confidence and explainable trust         | PR #244, #259, #228, #280; E2E/visual/a11y/perf gates pass; no-mutation assertions               |
| `/rebuild/ops`                           | Did not exist                                                                                     | SSR ops dashboard with freshness, error rate, latency, outbound clicks, resilience tier status; kill switches documented               | Track B3 observability baseline; ops readiness with safe degradation        | PR #261, #286, #290; runbooks in RELEASE_CHECKLIST; metrics tables applied; logging verified     |
| `/rebuild/alerts`                        | Did not exist                                                                                     | SSR alerts shell with compliance disclosure, safe empty state; alert evaluation domain + API endpoint                                  | Track C2/C3 action engine foundations; deterministic alert rules            | PR #277, #298; SSR-visible shell; rate-limited API; trust gating; unit tests                     |
| Synthetic Guarantee (CI)                 | No guaranteed end-to-end journeys enforced in CI                                                  | Playwright guarantee suite (Discovery/Alerts/Ops paths) runs on every push to main and every PR; fails CI on regression                | Track C6 synthetic monitoring; release-blocking quality gate                | PR #307; `tests/e2e/rebuild.synthetics.guarantee.spec.ts`; CI job: Synthetic Guarantee           |
| Marketplace Compliance (outbound clicks) | No versioned compliance SSOT; no outbound click integrity enforcement                             | Versioned per-marketplace compliance SSOT + disclosure SSOT; outbound click endpoint with bot filtering, deduplication, sanity checks  | Track C7 compliance; affiliate fraud mitigation and regulatory compliance   | PR #309; `lib/rebuild/compliance/**`; unit tests; synthetics updated                             |
| Shared observability (boundary fix)      | `/api/health` imported from `lib/rebuild/observability/logging.ts` (legacy→rebuild boundary leak) | Shared observability primitives moved to `lib/observability/**`; rebuild uses dedicated namespace; boundary clean                      | Prerequisite for Stage 1; maintain hard boundary isolation during migration | PR #310; boundary audit 2026-01-14; `rg` confirms 0 legacy→rebuild imports; TypeScript/lint pass |
