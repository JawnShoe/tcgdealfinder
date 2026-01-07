# REBUILD_TRACKER.md

Checkboxes must match TRACKER_EVIDENCE.md; otherwise downgrade to [ ].

Purpose: single checkbox tracker that mirrors the Championship Rebuild Plan "Execution Plan (One-Page, Canonical)".
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

- [ ] Run `primitive-enforcer` on any UI change

---

## Weeks 3-5: Phase 1 - Core Engine

Build home -> discovery -> detail using the proven template:

- [ ] Home route implemented in rebuild lane (template-based)
- [ ] Discovery route implemented in rebuild lane (template-based)
- [ ] Detail route implemented in rebuild lane (template-based)

Deploy dashboards:

- [ ] freshness
- [ ] errors
- [ ] CWV proxy
- [ ] outbound clicks

Add data-sanity-gate:

- [ ] data-sanity-gate implemented
- [ ] data-sanity-gate is deploy-blocking

Lock rule:

- [ ] No new features until all routes pass CI 100%

---

## Weeks 6-8: Cutover + Trust Hardening

Cutover (route ownership, not blended flags):

- [ ] rebuild owns routes by cutover plan (no interleaving legacy + rebuild on same route)

Trust hardening:

- [ ] trust metrics wired to real pipeline outputs
- [ ] transparency log reflects real inputs + versions
- [ ] contracts enforced across rebuilt routes (tooltip/hydration/skeleton)

Operational hardening:

- [ ] monitoring/alerting thresholds set for freshness + errors
- [ ] incident playbook validated via release checklist

---

## Week 9+: Moat + Scale

Scale coverage:

- [ ] additional routes added only via proven template + contracts

Performance + UX moat:

- [ ] performance budgets enforced (LCP/CLS/INP proxy)
- [ ] accessibility baseline enforced for rebuilt routes
- [ ] observability baseline enforced (client + server errors, tracing where applicable)

Long-term rules:

- [ ] legacy remains read-only reference during rebuild (no legacy imports into rebuild namespaces)
- [ ] rebuild tests assert contracts and trust invariants (not legacy quirks)
