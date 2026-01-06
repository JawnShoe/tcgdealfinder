# Championship Rebuild – Execution Tracker

This file is the **authoritative execution tracker** for the Championship Rebuild.

- The PDF plan is the immutable vision artifact.
- This Markdown file is the **live state**: what is DONE, what is NEXT, and what is BLOCKED.
- Status is updated only when work is **merged to `main`**.

---

## Week 0: Setup & Weaponization ✅ (COMPLETE)

**Goal:** Establish governance, contracts, skills, and CI so rebuild drift becomes mechanically impossible.

### Completed
- [x] ~~Rebuild lane scaffold created (isolated rebuild path)~~  
  _PR #224_

- [x] ~~Rebuild governance binder created in `docs/rebuild/`~~  
  _PR #225_  
  Includes:
  - PRD_LITE.md
  - TRUST_METRICS.md
  - NON_NEGOTIABLES.md
  - CONTRACTS.md
  - RELEASE_CHECKLIST.md
  - ADR_LOG.md

- [x] ~~ADR foundation locked (append-only)~~  
  - ADR-0001: Rebuild lane path + isolation rule  
  - ADR-0002: Contracts-first + single primitives + fail-hard CI

- [x] ~~Phase 0 rebuild skills added (declarative enforcement)~~  
  - primitive-enforcer  
  - rebuild-contract-guard  
  - pr-impact-declaration

- [x] ~~CI pipeline scaffolded with 5 fail-hard gates~~  
  _EXEMPT TEMP allowed for placeholder stages_  
  Gates present:
  - Lint + Typecheck + Build
  - E2E Smoke
  - Visual Regression / CLS
  - A11y Smoke
  - Performance Budget

- [x] ~~CI wired to pull_request and workflow_dispatch~~

- [x] ~~Rebuild entrypoint / governance overlay referenced~~

**Result:** Week 0 complete. Rebuild is now contract-first, skill-enforced, and CI-gated.

---

## Weeks 1–2: Phase 0 – Prove the Architecture (CURRENT)

**Deliverable:** One canonical route proving the rebuild architecture end-to-end.

### Target Route
- `/listing/[id]`

### Required Outcomes
- [ ] Route implemented **inside rebuild lane only**
- [ ] Uses canonical primitives only:
  - Tooltip / Popover
  - Skeleton / Loading
  - Confidence Badge
  - Table layout
  - Price formatting
- [ ] Hydration tiers respected (no pop-in on contracted elements)
- [ ] Confidence score computed **SSR-only**
- [ ] Explainability-lite panel present
- [ ] Transparency metadata visible at first render
- [ ] Passes **all CI gates without EXEMPT usage**

### Daily Rule
- Run **primitive-enforcer** on every UI change

---

## Weeks 3–5: Phase 1 – Core Engine (LOCKED UNTIL PHASE 0 COMPLETE)

_Not started._

---

## Weeks 6–8: Phase 2 – Trust Polish (LOCKED)

_Not started._

---

## Week 9+: Phase 3 – Moat Building (LOCKED)

_Not started._

---

## Notes
- This tracker must stay aligned with `ADR_LOG.md` and `SHIFT_LOCK.md`.
- Docs-only changes **still count as governance** and must follow merge discipline.
- No item is marked DONE without a merged PR reference.

