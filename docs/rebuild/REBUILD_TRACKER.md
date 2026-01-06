# REBUILD_TRACKER

Execution Plan (One-Page, Canonical) � source: Championship Rebuild Plan.pdf  
Keep this short and authoritative. Evidence + proofs live in TRACKER_EVIDENCE.md.

## Week 0: Setup & Weaponization

### Create docs/rebuild/ with:

- [x] PRD Lite
- [x] Trust Metrics
- [x] Contracts (tooltip/hydration/skeleton)
- [x] Release checklist
- [x] ADR log

### Governance (rebuild-only, foundational)

- [x] Non-negotiables (hard gates)

### Implement Phase 0 skills:

- [x] primitive-enforcer
- [x] rebuild-contract-guard
- [x] pr-impact-declaration

### CI

- [x] Scaffold CI pipeline with the 5 gates (may fail initially, but exists)

## Weeks 1�2: Phase 0 � Prove the Architecture

Deliverable: one route (/listing/[id]) that:

- [x] uses contracts correctly (hydration/skeleton/tooltip)
- [x] passes all CI gates
- [ ] serves data from new pipeline
- [x] has SSR-stable confidence
- [ ] includes explainability-lite + transparency log

Daily ritual: run primitive-enforcer on any UI change.

## Weeks 3�5: Phase 1 � Core Engine

- [ ] Build home ? discovery ? detail using the proven template
- [ ] Deploy dashboards (freshness, errors, CWV proxy, outbound clicks)
- [ ] Add data-sanity-gate
- [ ] Lock rule: No new features until all routes pass CI 100%

## Weeks 6�8: Phase 2 � Trust Polish

- [ ] Credibility UI: drilldown + provenance
- [ ] Resilience tiers + live/cached labels
- [ ] Perceived speed optimizations: skeleton library everywhere
- [ ] Perceived speed optimizations: priority hydration
- [ ] Perceived speed optimizations: prefetch on intent
- [ ] Compliance hardening
- [ ] Synthetic monitoring active

## Week 9+: Phase 3 � Moat Building

Only after Phase 2 is �boringly stable�:

- [ ] Alerts UI
- [ ] Personalization expansion
- [ ] Cross-market dedupe (optional)
- [ ] Predictive signals beyond rules-based

---

## Invariants (always true, not checkboxes)

- No legacy imports into rebuild lane (`app/rebuild/**` is isolated).
- Micro-claims (SSR visibility, no mutation, smoke packs) are proven in TRACKER_EVIDENCE.md.

## Gate status snapshot (informational)

- Lint + typecheck + unit + build: hard-pass gates
- E2E smoke: present (Playwright minimal); still EXEMPT TEMP as a gate until expanded
- Visual regression / CLS: EXEMPT (TEMP) until baseline exists
- A11y smoke: EXEMPT (TEMP) until runner exists
- Perf budget: EXEMPT (TEMP) until measurement harness exists

## Links

- PRD lite: PRD_LITE.md
- Trust metrics: TRUST_METRICS.md
- Non-negotiables: NON_NEGOTIABLES.md
- Contracts: CONTRACTS.md
- Release checklist: RELEASE_CHECKLIST.md
- ADR log: ADR_LOG.md
- Evidence map: TRACKER_EVIDENCE.md
