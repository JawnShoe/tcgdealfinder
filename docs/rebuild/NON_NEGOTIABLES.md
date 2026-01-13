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

- .github/PULL_REQUEST_TEMPLATE.md

Failure:

- Missing the PR ritual disclosure is a governance violation.
- Rebuild progression is blocked until the PR is updated to include the required sections.

---

## Boundary Discipline (Mandatory — Rebuild Lane)

The rebuild lane enforces strict layer boundaries:

- UI layer: rendering and UI-only state. No direct DB or external integration access.
- Domain layer: pure business logic (deterministic; no I/O).
- Data access layer: DB queries and persistence only (I/O lives here).
- Integrations layer: external APIs/services only (I/O lives here).

Rules (non-negotiable):

- UI MUST NOT import from DB/data-access or integrations modules.
- Domain MUST NOT import from integrations.
- Data access MUST NOT import from UI.
- Any exception requires an ADR with explicit scope, rationale, and rollback path.

Operationalization:

- Boundary discipline is checked during the Weekly Drift Audit and must be called out in PR Ritual disclosures.

---

## Track B Baselines (Mandatory — Rebuild Lane)

Performance baseline:

- CWV targets are defined in TRUST_METRICS.md and must be protected by CI gates.
- Perf Budget and CLS/Visual gates must remain enabled and green.

Accessibility baseline:

- A11y Smoke gate must remain enabled and green.
- Keyboard-only navigation must work on key rebuild routes (home, discovery, detail, outbound click).

---

## Performance Baselines (Mandatory - Rebuild Lane)

Render mode and performance limits (fail-hard):

/rebuild

- Render mode: SSR only (dynamic). Streaming: not used. Client-only: forbidden.
- CLS <= 0.01 (CI: tests/e2e/rebuild-cls.spec.ts).
- LCP <= 4000ms (CI: Perf Budget gate / .lighthouserc.cjs).
- Hydration: provenance summary + trust labels MUST be SSR and MUST NOT pop in after hydration (CI: tests/e2e/rebuild.synthetics.spec.ts).
- Images: above-the-fold images MUST have fixed width/height or reserved dimensions; no unbounded images (CI: tests/e2e/rebuild.synthetics.spec.ts).

/rebuild/discovery

- Render mode: SSR only (dynamic). Streaming: not used. Client-only: forbidden.
- CLS <= 0.01 (CI: tests/e2e/rebuild-cls.spec.ts).
- LCP <= 4000ms (CI: Perf Budget gate / .lighthouserc.cjs).
- Hydration: provenance summary + trust labels MUST be SSR and MUST NOT pop in after hydration (CI: tests/e2e/rebuild.synthetics.spec.ts).
- Images: above-the-fold images MUST have fixed width/height or reserved dimensions; no unbounded images (CI: tests/e2e/rebuild.synthetics.spec.ts).

/rebuild/listing/[id]

- Render mode: SSR only (dynamic). Streaming: not used. Client-only: forbidden.
- CLS <= 0.01 (CI: tests/e2e/rebuild-cls.spec.ts).
- LCP <= 4000ms (CI: Perf Budget gate / .lighthouserc.cjs).
- Hydration: trust panel + confidence/provenance MUST be SSR and MUST NOT mutate post-hydration (CI: tests/e2e/rebuild-trust-panel.spec.ts).
- Images: above-the-fold images MUST have fixed width/height or reserved dimensions; no unbounded images (CI: tests/e2e/rebuild.synthetics.spec.ts).

/rebuild/alerts

- Render mode: SSR (static is acceptable). Streaming: not used. Client-only: forbidden for the shell.
- CLS <= 0.01 (CI: tests/e2e/rebuild-cls.spec.ts).
- LCP <= 4000ms (CI: Perf Budget gate / .lighthouserc.cjs).
- Hydration: shell content MUST be SSR and MUST NOT pop in after hydration.
- Images: above-the-fold images MUST have fixed width/height or reserved dimensions; no unbounded images (CI: tests/e2e/rebuild.synthetics.spec.ts).

/rebuild/ops

- Render mode: SSR only (dynamic). Streaming: not used. Client-only: forbidden for the shell.
- CLS <= 0.01 (CI: tests/e2e/rebuild-cls.spec.ts).
- LCP <= 4000ms (CI: Perf Budget gate / .lighthouserc.cjs).
- Hydration: shell content MUST be SSR and MUST NOT pop in after hydration.
- Images: above-the-fold images MUST have fixed width/height or reserved dimensions; no unbounded images (CI: tests/e2e/rebuild.synthetics.spec.ts).

---

## Security + Reliability Baseline (Mandatory - Rebuild Lane)

Rate limiting:

- Public rebuild API endpoints MUST enforce segmented rate limits (no single global bucket).
- Rate limit hits MUST return 429 with `{ ok: false, error: "rate_limited" }` and include `x-request-id` + `retry-after`.
- Rate limit hits MUST be logged with route + requestId.

Input validation:

- Rebuild API routes that accept input MUST schema-validate at entry.
- Invalid input MUST return 400 with `{ ok: false, error: "invalid_payload" }` and MUST NOT leak internals.
- Validation failures MUST be logged with requestId.

Secrets + dependency hygiene:

- Secrets MUST NOT be committed.
- Secret scanning MUST be CI-enforced or explicitly marked DEFERRED in ADR with owner + path to enforcement.
- Dependency alerts (Dependabot) MUST remain enabled; high/critical vulnerabilities block merge until triaged.
- Secrets rotation MUST occur within 24 hours of suspected leak and at least quarterly for rebuild-critical keys.

WAF/CDN baseline:

- A baseline WAF/CDN posture MUST exist (bot mitigation + abuse throttling).
- If WAF/CDN enforcement is not CI-verifiable, it MUST be marked DEFERRED in ADR with owner + target path.

Failure/degradation:

- Rebuild routes/APIs MUST degrade to contract-defined safe responses; no uncaught errors or crash loops.

---

## SEO Baseline (Mandatory - Rebuild Lane)

- Rebuild pages MUST emit <title> and <meta name="description"> using the rebuild template (Rebuild <Page> | TCG Deal Finder).
- Canonical URLs MUST follow the SEO Baseline contract in CONTRACTS.md (including discovery parameter normalization).
- /rebuild/ops and /rebuild/alerts MUST be noindex; other rebuild routes MUST be indexable unless explicitly documented.
- robots.txt and sitemap.xml MUST exist and list indexable rebuild routes.
- Structured data MUST be emitted per the Structured Data Contract and validated in CI.

---

## Trust Invariants (Mandatory - Rebuild Lane)

- Trust signals MUST be explainable from server data (no implicit trust claims).
- Confidence, freshness, and provenance MUST be derived server-side and reproducible from stored inputs.
- If confidence weight or fetched-at is missing, the trust state MUST be "insufficient" and MUST disclose the missing fields.
- If data age exceeds the freshness SLO or integrity is flagged, the trust state MUST be "degraded" and MUST disclose the reason.
- Missing or uncertain trust data MUST be labeled explicitly; silent fallbacks are forbidden.
