# Skills

## Purpose

Skills are the enforcement spine for rebuild discipline.

## Activation order (LOCKED)

- Phase 0: primitive-enforcer, rebuild-contract-guard, pr-impact-declaration.
- Phase 1: TBD.
- Phase 2: TBD.
- Always-on: data-sanity-gate.

## Declarative vs enforced

- Declarative: SKILL.md is authoritative instructions for humans/AI.
- Enforced: later PRs add lint/CI/scripts to block violations.

## Governance sources (authoritative)

- docs/rebuild/PRD_LITE.md
- docs/rebuild/TRUST_METRICS.md
- docs/rebuild/NON_NEGOTIABLES.md

## No intermingling (LOCKED)

- Rebuild must remain isolated; no legacy imports into rebuild namespace.
