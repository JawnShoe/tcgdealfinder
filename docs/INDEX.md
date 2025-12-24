# Documentation Index

**Purpose**: Map of all documentation files and their authoritative status.

**Last Updated**: 2025-12-24

---

## Authoritative Documents

These are the active, maintained source-of-truth files.

| Document | Purpose | Audience |
|----------|---------|----------|
| [PROJECT_SSOT.md](../PROJECT_SSOT.md) | **Single Source of Truth** - Project status, roadmap, completed work, active tasks | All contributors |
| [SHIFT_LOCK.md](../SHIFT_LOCK.md) | Process gates and rules (DONE gate, SHIFT gate, Evidence gate, Secret hygiene) | All contributors |
| [REGRESSION_CHECKLIST.md](../REGRESSION_CHECKLIST.md) | Manual testing checklist for each release | QA / Contributors |
| [docs/ui/UI_CONSISTENCY_CONTRACT.md](ui/UI_CONSISTENCY_CONTRACT.md) | UI tooltip/sizing governance (LOCKED) | Frontend contributors |

---

## Operational Runbooks

These document operational procedures and policies (Repo Hardening Pack).

| Document | Purpose | Audience |
|----------|---------|----------|
| [docs/BACKUP_POLICY.md](BACKUP_POLICY.md) | Backup strategy and restore procedures | All contributors |
| [docs/ENV_RUNBOOK.md](ENV_RUNBOOK.md) | Environment variables and `.env.example` alignment policy | All contributors |
| [docs/DB_MIGRATIONS_RUNBOOK.md](DB_MIGRATIONS_RUNBOOK.md) | Database migration workflow and rollback procedures | Backend / Ops |
| [docs/RELEASES.md](RELEASES.md) | Release tagging conventions and changelog maintenance | All contributors |
| [docs/DEFINITION_OF_READY.md](DEFINITION_OF_READY.md) | Feature planning checklist template | Product / Contributors |

---

## Reference Documents

These provide stable reference material for specific domains.

| Document | Purpose | Audience |
|----------|---------|----------|
| [docs/market-policy.md](market-policy.md) | Multi-market ingestion rules and currency handling | Backend / Ingestion |
| [docs/surfaces.md](surfaces.md) | Feature surface map (pages, columns, filters) | Product / Contributors |
| [README.md](../README.md) | Project introduction and setup | New contributors |

---

## Historical Archive

Completed implementation records and audits moved to [docs/archive/](archive/) for reference.

See [docs/archive/README.md](archive/README.md) for index of archived documents.

---

## When to Update This Index

- When a new authoritative document is created
- When a document's status changes (active → archived)
- When a document is renamed or moved

---

**Governance**: This index is maintained as part of the PROJECT_SSOT.md update process.
