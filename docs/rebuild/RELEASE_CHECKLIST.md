# Rebuild Release Checklist (Week 0)

## Binder-lite docs present

- PRD_LITE.md
- TRUST_METRICS.md
- NON_NEGOTIABLES.md
- CONTRACTS.md
- VISUAL_CONTRACT.md
- RELEASE_CHECKLIST.md
- ADR_LOG.md

## Phase 0 skills present (declarative)

- skills/primitive-enforcer/SKILL.md
- skills/rebuild-contract-guard/SKILL.md
- skills/pr-impact-declaration/SKILL.md

## CI gates

- Lint (hard-pass)
- Typecheck (hard-pass)
- Unit tests (hard-pass)
- E2E smoke (EXEMPT TEMP) - unblock: Playwright config + rebuild route smoke
- Visual regression/CLS (EXEMPT TEMP) - unblock: visual baseline + CLS capture
- A11y smoke (EXEMPT TEMP) - unblock: a11y runner + baseline
- Perf budget (EXEMPT TEMP) - unblock: budget definition + measurement harness

## Exemptions recorded

- EXEMPT (TEMP) gates are labeled in workflow, this checklist, and ADR-0002.
