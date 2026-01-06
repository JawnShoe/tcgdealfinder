# REBUILD_TRACKER

Canonical rebuild checklist and progress tracker. Keep this short and authoritative.

## Week 0: Setup & Weaponization

- [x] PRD_LITE.md (signed contract draft)
- [x] TRUST_METRICS.md (trust SLOs and confidence rules)
- [x] NON_NEGOTIABLES.md (hard gates)
- [x] CONTRACTS.md (tooltip/hydration/skeleton contracts)
- [x] RELEASE_CHECKLIST.md (Week 0 gate list)
- [x] ADR_LOG.md seeded (ADR-0001, ADR-0002)
- [x] Phase 0 skills declared (SKILL.md)
- [x] CI gates wired (lint/typecheck/unit/build hard-pass; EXEMPT TEMP gates present)
- [x] REBUILD_TRACKER.md created

## Weeks 1-2: Phase 0 - Prove the Architecture

- [ ] Rebuild lane route scaffold (placeholder UI, SSR-stable)
- [ ] Trust metadata visible at first render (no hover-only meaning)
- [ ] Confidence/provenance fields rendered from SSR (no client mutation)
- [ ] Rebuild isolation verified (no legacy imports)
- [ ] Rebuild smoke pack checklist executed

## Phase 0 Skills (LOCKED order)

- [x] primitive-enforcer (declarative)
- [x] rebuild-contract-guard (declarative)
- [x] pr-impact-declaration (declarative)
- [ ] Enforcement wiring (lint/CI/scripts) once authorized

## Gate status snapshot

- Lint + typecheck + unit + build: hard-pass gates
- E2E smoke: EXEMPT (TEMP) until Playwright smoke exists
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
