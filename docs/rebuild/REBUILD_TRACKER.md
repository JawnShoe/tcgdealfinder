# REBUILD_TRACKER.md

Checkboxes must match TRACKER_EVIDENCE.md; otherwise downgrade to [ ].
This file mirrors the Championship Rebuild Plan PDF Execution Plan. Do not reword phase titles/bullets here. Any plan changes require updating the PDF + tracker + evidence in the same PR, plus ADR if needed.

Purpose: single checkbox tracker that mirrors the Championship Rebuild Plan PDF "Execution Plan (One-Page, Canonical)".
Rule: do not reword sections here. If the plan changes, update both together in the same PR.

---

## Week 0: Setup & Weaponization

Create `docs/rebuild/` with:

- [x] PRD Lite - `docs/rebuild/PRD_LITE.md`
- [x] Trust Metrics - `docs/rebuild/TRUST_METRICS.md`
- [x] Contracts (tooltip/hydration/skeleton) - `docs/rebuild/CONTRACTS.md` (or equivalent canonical contracts doc)
- [x] Release checklist - `docs/rebuild/RELEASE_CHECKLIST.md`
- [x] ADR log - `docs/rebuild/ADR_LOG.md`

Implement Phase 0 skills:

- [x] `primitive-enforcer`
- [x] `rebuild-contract-guard`
- [x] `pr-impact-declaration`

Scaffold CI pipeline with the 5 gates (may fail initially, but exists):

- [x] CI scaffolding exists for required gates (even if temporarily exempted)

---

## Weeks 1-2: Phase 0 - Prove the Architecture

Deliverable: one route (`/rebuild/listing/[id]`) that:

- [x] uses contracts correctly (hydration/skeleton/tooltip)
- [x] passes all CI gates
- [x] serves data from new pipeline
- [x] has SSR-stable confidence
- [x] includes explainability-lite + transparency log

Daily ritual:

- [x] Run `primitive-enforcer` on any UI change

---

## Weeks 3–5: Phase 1 — Core Engine

Build home → discovery → detail using the proven template:

- [x] Home route implemented in rebuild lane (template-based)
- [x] Discovery route implemented in rebuild lane (template-based)
- [x] Detail route implemented in rebuild lane (template-based)

Deploy dashboards:

- [x] freshness
- [x] errors
- [x] CWV proxy
- [x] outbound clicks

Add data-sanity-gate:

- [x] data-sanity-gate implemented
- [x] data-sanity-gate is deploy-blocking

Lock rule:

- [x] No new features until all routes pass CI 100%

---

## Weeks 6–8: Phase 2 — Trust Polish

- [x] Credibility UI: drilldown + provenance
- [ ] Resilience tiers + live/cached labels

Perceived speed optimizations:

- [x] skeleton library everywhere
- [x] priority hydration
- [x] prefetch on intent

- [ ] Compliance hardening
- [ ] Synthetic monitoring active

---

## Week 9+: Phase 3 — Moat Building

Only after Phase 2 is "boringly stable":

- [ ] Alerts UI
- [ ] Personalization expansion
- [ ] Cross-market dedupe (optional)
- [ ] Predictive signals beyond rules-based
