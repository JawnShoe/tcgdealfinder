# Skill: Rebuild Contract Guard

## Goal

Block contract violations before code is written.

## Trigger

Any PR that changes rebuild UI behavior, SSR/CSR boundaries, hydration behavior, loading states, tooltip behavior, confidence/trust display.

## Required steps

1. Identify applicable rebuild contracts from:
   - docs/rebuild/NON_NEGOTIABLES.md
   - docs/rebuild/TRUST_METRICS.md
   - docs/rebuild/PRD_LITE.md
2. State explicitly in the PR description:
   - Which contracts apply.
   - How this PR complies.

## STOP conditions

- Violates price immutability after first render.
- Moves trust computation client-side.
- Introduces hover-only critical meaning.
- Introduces CLS risk on key surfaces.
- Adds a second primitive variant.
- Breaks rebuild isolation (imports from legacy into rebuild).

## Required evidence checklist (declarative)

- SSR-visible trust metadata: screenshots or notes (when applicable).
- Test coverage expectation stated (even if tests are wired later).

## Rebuild Isolation (LOCKED)

- Rebuild implementation must live in a dedicated rebuild namespace/folder tree (name TBD).
- Rebuild code MUST NOT import from legacy paths.
- Legacy is read-only reference; reuse only after passing rebuild contracts.
