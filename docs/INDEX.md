# Documentation Index

**Purpose**: Map of all documentation files and their authoritative status.

**Last Updated**: 2026-01-03

---

## Authoritative Documents

These are the active, maintained source-of-truth files.

| Document                                                            | Purpose                                                                            | Audience              |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------- |
| [PROJECT_SSOT.md](../PROJECT_SSOT.md)                               | **Single Source of Truth** - Project status, roadmap, completed work, active tasks | All contributors      |
| [SHIFT_LOCK.md](../SHIFT_LOCK.md)                                   | Process gates and rules (DONE gate, SHIFT gate, Evidence gate, Secret hygiene)     | All contributors      |
| [REGRESSION_CHECKLIST.md](../REGRESSION_CHECKLIST.md)               | Manual testing checklist for each release                                          | QA / Contributors     |
| [docs/ui/UI_CONSISTENCY_CONTRACT.md](ui/UI_CONSISTENCY_CONTRACT.md) | UI tooltip/sizing governance (LOCKED)                                              | Frontend contributors |
| [docs/TIER2_ARCHITECTURE.md](TIER2_ARCHITECTURE.md)                 | Tier 2 architecture: Alerts + DB-backed Watchlist (MVP)                            | All contributors      |

---

## Operational Runbooks

These document operational procedures and policies (Repo Hardening Pack).

| Document                                                        | Purpose                                                   | Audience               |
| --------------------------------------------------------------- | --------------------------------------------------------- | ---------------------- |
| [docs/BACKUP_POLICY.md](BACKUP_POLICY.md)                       | Backup strategy and restore procedures                    | All contributors       |
| [docs/ENV_RUNBOOK.md](ENV_RUNBOOK.md)                           | Environment variables and `.env.example` alignment policy | All contributors       |
| [docs/DB_MIGRATIONS_RUNBOOK.md](DB_MIGRATIONS_RUNBOOK.md)       | Database migration workflow and rollback procedures       | Backend / Ops          |
| [docs/RELEASES.md](RELEASES.md)                                 | Release tagging conventions and changelog maintenance     | All contributors       |
| [docs/DEFINITION_OF_READY.md](DEFINITION_OF_READY.md)           | Feature planning checklist template                       | Product / Contributors |
| [docs/EVIDENCE_PACKET_TEMPLATE.md](EVIDENCE_PACKET_TEMPLATE.md) | Tier-1 Evidence Gate documentation template               | All contributors       |

---

## Design Documents (Archived)

These planning artifacts for the phased redesign have been archived. They are preserved for historical reference only.

| Document                                                                              | Purpose                                                 | Status   |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| [docs/archive/design/DESIGN_AUDIT_2025-01.md](archive/design/DESIGN_AUDIT_2025-01.md) | External expert design audit (advisory, non-executable) | Archived |
| [docs/archive/design/DESIGN_PHASES.md](archive/design/DESIGN_PHASES.md)               | Locked phased redesign plan                             | Archived |

**Note**: These documents are advisory only and preserved for historical reference.

---

## Reference Documents

These provide stable reference material for specific domains.

| Document                                  | Purpose                                            | Audience               |
| ----------------------------------------- | -------------------------------------------------- | ---------------------- |
| [docs/market-policy.md](market-policy.md) | Multi-market ingestion rules and currency handling | Backend / Ingestion    |
| [docs/surfaces.md](surfaces.md)           | Feature surface map (pages, columns, filters)      | Product / Contributors |
| [README.md](../README.md)                 | Project introduction and setup                     | New contributors       |

---

## Testing

### Test Runner

This project uses Node.js built-in test runner (`node:test`) executed via `tsx` for TypeScript support.

### Running Tests

**Unit tests** (no DATABASE_URL required, run in CI):

```bash
npm run test:unit
# or
npm test
```

**Integration tests** (require DATABASE_URL, local-only):

```bash
npm run test:integration
```

### Test Organization

Tests are organized by dependency requirements:

- `lib/__tests__/unit/` - Pure logic tests (no database)
- `lib/__tests__/integration/` - Tests requiring database connection
- `scripts/__tests__/unit/` - Script utility tests (no database)

**Unit tests** (8 files):

- collectorNumber.test.ts
- dealConfidence.test.ts
- dealSort.test.ts
- language.test.ts
- markets.test.ts
- collectorNumberGating.test.ts (scripts)
- marketCurrency.test.ts (scripts)
- update-historical-prices.test.ts (scripts)

**Integration tests** (4 files, require DATABASE_URL):

- consistency.test.ts
- schema.test.ts
- softExclusion.test.ts
- variantContradiction.test.ts

### CI Behavior

CI runs only unit tests (`npm run test:unit`) to avoid requiring DATABASE_URL secrets. Integration tests are run locally during development and before releases.

---

## Rebaseline Artifacts (Archived)

Baseline inventory and review plan for REBASELINE v1 (completed). Archived for historical reference.

| Document                                                                                          | Purpose                                     | Status   |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------- |
| [docs/archive/rebaseline/REPO_PACKET_2025-12-29.md](archive/rebaseline/REPO_PACKET_2025-12-29.md) | Complete repo inventory snapshot            | Archived |
| [docs/archive/rebaseline/CRITICALITY_MAP.md](archive/rebaseline/CRITICALITY_MAP.md)               | Folder criticality labels                   | Archived |
| [docs/archive/rebaseline/MODULE_REVIEW_PLAN.md](archive/rebaseline/MODULE_REVIEW_PLAN.md)         | Module review order and acceptance criteria | Archived |
| [docs/archive/rebaseline/modules/](archive/rebaseline/modules/)                                   | Module review docs (M01–M10)                | Archived |
| [docs/CLEANUP_INVENTORY.md](CLEANUP_INVENTORY.md)                                                 | Repo-wide cleanup candidates (inventory)    | ACTIVE   |

---

## Historical Archive (Non-Executable)

Completed implementation records, audits, and planning artifacts are preserved in `docs/archive/` for reference only. These documents are **not actionable** — they represent past work, superseded plans, or closed audits.

| Folder                                          | Contents                                              |
| ----------------------------------------------- | ----------------------------------------------------- |
| [docs/archive/](archive/)                       | Historical implementation records                     |
| [docs/archive/audits/](archive/audits/)         | Closed audit artifacts (2025 full system + inventory) |
| [docs/archive/design/](archive/design/)         | Design audit and phases (archived)                    |
| [docs/archive/plan/](archive/plan/)             | Implementation plans (Option A, sold data options)    |
| [docs/archive/audit/](archive/audit/)           | Product truth philosophy audit                        |
| [docs/archive/incidents/](archive/incidents/)   | Incident reports                                      |
| [docs/archive/db/](archive/db/)                 | Database index audit                                  |
| [docs/archive/rebaseline/](archive/rebaseline/) | REBASELINE v1 artifacts (repo packet, modules)        |

See the [archive README](archive/README.md) for navigation.

---

## When to Update This Index

- When a new authoritative document is created
- When a document's status changes (active → archived)
- When a document is renamed or moved

---

**Governance**: This index is maintained as part of the PROJECT_SSOT.md update process.
