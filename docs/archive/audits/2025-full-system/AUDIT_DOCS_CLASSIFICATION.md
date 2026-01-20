> **Archived after Full System Audit closeout (2025-12-26)**

# Audit Artifact (Archived)

**Phase**: 2 — Docs & Process Audit
**Created**: 2025-12-26
**Archived**: 2025-12-26

---

# Documentation Classification

This classification answers:

- "Why are there so many .md files?" → 32 total: 4 authoritative, 6 runbooks, 4 references, 14 archived, 4 audit/evidence
- "Is ENV_RUNBOOK.md required?" → **Yes, Authoritative** (see special section below)
- "What is authoritative vs junk?" → Classified below
- "What can be archived or deleted?" → See Action column

---

## Category Definitions (LOCKED)

| Category             | Definition                                                      |
| -------------------- | --------------------------------------------------------------- |
| **Authoritative**    | Required for daily ops or project truth (SSOT, runbooks, gates) |
| **Active Reference** | Helpful but not SSOT; stable reference material                 |
| **Audit Evidence**   | Evidence packets, one-time confirmations, temporary audit files |
| **Historical**       | Past notes no longer used; already archived                     |
| **Draft**            | Incomplete, unreferenced, or superseded                         |

---

## Root-Level Documents

| Doc                       | Category         | Audience         | Status | Rationale                                                                                 | Action |
| ------------------------- | ---------------- | ---------------- | ------ | ----------------------------------------------------------------------------------------- | ------ |
| `PROJECT_SSOT.md`         | Authoritative    | All              | Active | Single source of truth for project status, roadmap, ops log; referenced by all other docs | Keep   |
| `README.md`               | Active Reference | New contributors | Active | Project introduction and setup; required for onboarding                                   | Keep   |
| `REGRESSION_CHECKLIST.md` | Authoritative    | QA / All         | Active | Manual testing gate before releases; referenced by SHIFT_LOCK                             | Keep   |
| `SHIFT_LOCK.md`           | Authoritative    | All              | Active | Process gates, stop rules; enforces DONE/SHIFT/Evidence gates                             | Keep   |

---

## docs/ Directory — Active Documents

| Doc                                | Category          | Audience    | Status | Rationale                                                     | Action |
| ---------------------------------- | ----------------- | ----------- | ------ | ------------------------------------------------------------- | ------ |
| `docs/INDEX.md`                    | Authoritative     | All         | Active | Documentation map; referenced by SSOT and other docs          | Keep   |
| `docs/BACKUP_POLICY.md`            | Authoritative     | Ops         | Active | Backup strategy + restore procedures; operational requirement | Keep   |
| `docs/DB_MIGRATIONS_RUNBOOK.md`    | Authoritative     | Backend/Ops | Active | Migration workflow; required for schema changes               | Keep   |
| `docs/DEFINITION_OF_READY.md`      | Active Reference  | Product     | Active | Feature planning template; helpful but not blocking           | Keep   |
| `docs/ENV_RUNBOOK.md`              | **Authoritative** | All         | Active | **See special classification below**                          | Keep   |
| `docs/EVIDENCE_PACKET_TEMPLATE.md` | Authoritative     | All         | Active | Tier-1 evidence gate template; enforced by SHIFT_LOCK         | Keep   |
| `docs/market-policy.md`            | Active Reference  | Backend     | Active | Multi-market ingestion rules; stable domain reference         | Keep   |
| `docs/RELEASES.md`                 | Authoritative     | All         | Active | Release tagging workflow; required for versioning             | Keep   |
| `docs/surfaces.md`                 | Active Reference  | Product     | Active | Feature surface map; helpful for context                      | Keep   |

---

## docs/archive/ui-legacy/ Directory

| Doc                                                 | Category      | Audience | Status | Rationale                                               | Action |
| --------------------------------------------------- | ------------- | -------- | ------ | ------------------------------------------------------- | ------ |
| `docs/archive/ui-legacy/UI_CONSISTENCY_CONTRACT.md` | Authoritative | Frontend | Active | LOCKED UI governance; referenced by SHIFT_LOCK and SSOT | Keep   |

---

## docs/audit/ Directory — Audit Evidence

| Doc                                      | Category       | Audience  | Status        | Rationale                                               | Action                  |
| ---------------------------------------- | -------------- | --------- | ------------- | ------------------------------------------------------- | ----------------------- |
| `docs/audit/DB_ARCHITECTURE_EVIDENCE.md` | Audit Evidence | Ops/Audit | Active        | Database architecture evidence packet for Ops audit     | Keep                    |
| `docs/audit/EXPERT_AUDIT_2025-12-25.md`  | Audit Evidence | Audit     | **Untracked** | Expert audit findings; exists locally but not committed | Commit (see Open Risks) |
| `docs/audit/_full-system-2025/*.md`      | Audit Evidence | Audit     | Active        | Current Phase 1+2 audit artifacts; temporary            | Keep until closeout     |

---

## docs/archive/ Directory — Historical Documents

All 14 files in this directory are already correctly classified as **Historical** and archived:

| Doc                                                | Category   | Status   | Rationale                          | Action          |
| -------------------------------------------------- | ---------- | -------- | ---------------------------------- | --------------- |
| `docs/archive/README.md`                           | Historical | Archived | Archive index                      | Keep (index)    |
| `docs/archive/BACKFILL_QUICKSTART.md`              | Historical | Archived | Completed store name backfill      | Keep (archived) |
| `docs/archive/baseline-README.md`                  | Historical | Archived | Empty placeholder                  | Keep (archived) |
| `docs/archive/browse_api_migration_audit.md`       | Historical | Archived | Completed migration evidence       | Keep (archived) |
| `docs/archive/DECISIONS.md`                        | Historical | Archived | Consolidated into SSOT             | Keep (archived) |
| `docs/archive/LAYOUT_FIX_SUMMARY.md`               | Historical | Archived | Completed fix record               | Keep (archived) |
| `docs/archive/MARKET_FILTER_FIX.md`                | Historical | Archived | Completed fix analysis             | Keep (archived) |
| `docs/archive/MULTI_MARKET_FIX.md`                 | Historical | Archived | Completed fix root cause           | Keep (archived) |
| `docs/archive/MULTI_MARKET_SUMMARY.md`             | Historical | Archived | Completed summary                  | Keep (archived) |
| `docs/archive/SELLER_STORE_NAME_IMPLEMENTATION.md` | Historical | Archived | Completed implementation           | Keep (archived) |
| `docs/archive/storefront_enrichment_audit.md`      | Historical | Archived | Completed audit                    | Keep (archived) |
| `docs/archive/store_name_source_audit.md`          | Historical | Archived | Completed audit                    | Keep (archived) |
| `docs/archive/ui-baseline.md`                      | Historical | Archived | Superseded by REGRESSION_CHECKLIST | Keep (archived) |
| `docs/archive/VERIFICATION_CHECKLIST.md`           | Historical | Archived | Superseded by REGRESSION_CHECKLIST | Keep (archived) |

---

## scripts/ Directory — Embedded Documentation

| Doc                                    | Category         | Audience | Status   | Rationale                                              | Action |
| -------------------------------------- | ---------------- | -------- | -------- | ------------------------------------------------------ | ------ |
| `scripts/one-off/README.md`            | Active Reference | Devs     | Active   | Documents one-off script usage; colocated with scripts | Keep   |
| `scripts/migrations/archive/README.md` | Historical       | Devs     | Archived | Documents archived migration                           | Keep   |

---

## Special Classification: ENV_RUNBOOK.md

**Question**: Is `docs/ENV_RUNBOOK.md` Authoritative?

**Answer**: **Yes, Authoritative.**

**Rationale**:

1. **Required for onboarding**: New contributors cannot set up local dev without knowing which env vars are required
2. **`.env.example` alignment policy**: Documents the rule that all env vars must be in `.env.example`
3. **Operator enablement**: Contains step-by-step instructions for enabling email alerts (GitHub Actions workflow + secrets)
4. **Troubleshooting guide**: Documents common env-related issues and fixes
5. **Security notes**: Documents secret rotation and hygiene practices
6. **Referenced by docs/INDEX.md**: Listed under "Operational Runbooks"

**What would replace it if removed**: Nothing — the information would be scattered or lost.

**Conclusion**: ENV_RUNBOOK.md is **Authoritative** and must be kept.

---

## Summary Statistics

| Category              | Count   | Notes                            |
| --------------------- | ------- | -------------------------------- |
| Authoritative         | 10      | Core governance + runbooks       |
| Active Reference      | 5       | Helpful domain docs              |
| Audit Evidence        | 6+      | Current audit + evidence packets |
| Historical (Archived) | 14      | Already in docs/archive/         |
| Draft                 | 0       | None identified                  |
| **Total**             | **32+** | Plus Phase 1/2 audit artifacts   |

---

**Classification Status**: Complete. No ambiguous classifications.
