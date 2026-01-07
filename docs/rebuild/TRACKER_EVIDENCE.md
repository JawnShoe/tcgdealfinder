# REBUILD Tracker Evidence Map

This maps checked items in `docs/rebuild/REBUILD_TRACKER.md` to evidence. If evidence is missing, downgrade to [ ].

## Week 0: Setup & Weaponization

| Tracker item                             | PR   | File(s)                           | Evidence (short)                                        |
| ---------------------------------------- | ---- | --------------------------------- | ------------------------------------------------------- |
| PRD Lite                                 | #221 | docs/rebuild/PRD_LITE.md          | Product Promise section present.                        |
| Trust Metrics                            | #221 | docs/rebuild/TRUST_METRICS.md     | Freshness SLOs section present.                         |
| Contracts (tooltip/hydration/skeleton)   | #225 | docs/rebuild/CONTRACTS.md         | Hydration Tiers Contract includes SSR stability rule.   |
| Release checklist                        | #225 | docs/rebuild/RELEASE_CHECKLIST.md | CI gates list present.                                  |
| ADR log                                  | #225 | docs/rebuild/ADR_LOG.md           | ADR-0001 and ADR-0002 present.                          |
| Phase 0 skill: primitive-enforcer        | #222 | skills/README.md                  | Activation order lists primitive-enforcer.              |
| Phase 0 skill: rebuild-contract-guard    | #222 | skills/README.md                  | Activation order lists rebuild-contract-guard.          |
| Phase 0 skill: pr-impact-declaration     | #222 | skills/README.md                  | Activation order lists pr-impact-declaration.           |
| CI scaffolding exists for required gates | #225 | .github/workflows/ci.yml          | Gate job names for lint/build and exempt gates present. |

### CI evidence

- CI run: https://github.com/JawnShoe/tcgdealfinder/actions/runs/20736641784
- Checks observed:
  - Lint & Build
  - E2E Smoke (EXEMPT TEMP)
  - Visual Regression / CLS (EXEMPT TEMP)
  - A11y Smoke (EXEMPT TEMP)
  - Perf Budget (EXEMPT TEMP)

## Weeks 1-2: Phase 0 - Prove the Architecture

| Tracker item                                    | PR   | Route                 | Evidence (short)                                                        |
| ----------------------------------------------- | ---- | --------------------- | ----------------------------------------------------------------------- |
| serves data from new pipeline                   | #236 | /rebuild/listing/[id] | DB-backed getRebuildListingById mapping + SSR assertions in Playwright. |
| has SSR-stable confidence                       | #228 | /rebuild/listing/[id] | SSR HTML contains trust testids; no-mutation assertion in Playwright.   |
| includes explainability-lite + transparency log | #228 | /rebuild/listing/[id] | SSR HTML contains transparency/explainability testids.                  |

```ts
expect(body).toContain('data-testid="trust-confidence"');
expect(body).toContain('data-testid="transparency-panel"');
expect(body).toContain('data-testid="explainability-inputs"');
expect(body).toContain("rebuild-db-v1");
```
