# ADR Log

## ADR-0001: Rebuild lane path + isolation rule

- Status: Accepted
- Decision: Rebuild lane lives at app/rebuild/** (route prefix /rebuild/**). Rebuild code must remain isolated from legacy paths.
- Rationale: Prevent intermingling and ensure contract-first rebuild discipline.
- Consequences: Cutover is by route ownership only; no blended flags between legacy and rebuild.
