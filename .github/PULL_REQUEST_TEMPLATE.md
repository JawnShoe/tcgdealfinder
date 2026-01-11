## Summary

What does this PR do? (1–3 sentences)

## Scope / Allowlist

List files or directories touched. If docs-only, say so explicitly.

## Contracts

Which rebuild contracts are relied on or potentially impacted?

- [ ] Hydration / SSR stability
- [ ] Skeleton / loading stability (no CLS)
- [ ] Tooltip / portal rules
- [ ] Trust surfaces (confidence, labels, provenance/explainability)
- [ ] Boundary rules (UI → domain → data → integrations)
- [ ] Other (specify):

Notes (required if any box is checked):

## Gates / Verification

What did you run and/or what CI gates prove safety?

- [ ] Lint & build
- [ ] Unit tests
- [ ] E2E / synthetics
- [ ] A11y smoke
- [ ] Visual regression / CLS
- [ ] Perf budget

Links to CI runs (if applicable):

## Drift Risk

- Drift risk: [ ] No [ ] Yes

If Yes, explain what could drift and why this is still safe:

## Evidence Updates

Does this PR require tracker/evidence updates?

- [ ] No
- [ ] Yes — updated:
  - [ ] REBUILD_TRACKER.md
  - [ ] TRACKER_EVIDENCE.md
  - [ ] ADR_LOG.md (if governance/contract change)

## Operator Merge Notes (PR-UI-only)

Anything the Operator must verify in the GitHub UI before merge (files changed, checks, etc.)
