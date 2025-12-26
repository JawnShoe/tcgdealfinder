> **Archived after Full System Audit closeout (2025-12-26)**

# Audit Artifact (Archived)

**Phase**: 1 — Inventory
**Created**: 2025-12-26
**Archived**: 2025-12-26

---

# Documentation Inventory

Total markdown files: 32

---

## Root-Level Documents

| File                    | Location | Apparent Purpose                                            | Audience          | Referenced by SSOT? |
| ----------------------- | -------- | ----------------------------------------------------------- | ----------------- | ------------------- |
| PROJECT_SSOT.md         | `./`     | Single source of truth for project status, roadmap, ops log | All contributors  | N/A (is SSOT)       |
| README.md               | `./`     | Project introduction, setup instructions                    | New contributors  | Yes (docs/INDEX.md) |
| REGRESSION_CHECKLIST.md | `./`     | Manual testing checklist for releases                       | QA / Contributors | Yes                 |
| SHIFT_LOCK.md           | `./`     | Process gates, stop rules, formatting policy                | All contributors  | Yes                 |

---

## docs/ Directory — Active Documents

| File                        | Location | Apparent Purpose                     | Audience               | Referenced by SSOT? |
| --------------------------- | -------- | ------------------------------------ | ---------------------- | ------------------- |
| INDEX.md                    | `docs/`  | Map of all documentation files       | All contributors       | Yes                 |
| BACKUP_POLICY.md            | `docs/`  | Backup strategy, restore procedures  | Ops                    | Yes                 |
| DB_MIGRATIONS_RUNBOOK.md    | `docs/`  | Database migration workflow          | Backend / Ops          | Yes                 |
| DEFINITION_OF_READY.md      | `docs/`  | Feature planning checklist template  | Product / Contributors | Yes                 |
| ENV_RUNBOOK.md              | `docs/`  | Environment variables documentation  | All contributors       | Yes                 |
| EVIDENCE_PACKET_TEMPLATE.md | `docs/`  | Tier-1 evidence gate template        | All contributors       | Yes                 |
| market-policy.md            | `docs/`  | Multi-market ingestion rules         | Backend / Ingestion    | Yes                 |
| RELEASES.md                 | `docs/`  | Release tagging conventions          | All contributors       | Yes                 |
| surfaces.md                 | `docs/`  | Feature surface map (pages, columns) | Product / Contributors | Yes                 |

---

## docs/ui/ Directory

| File                       | Location   | Apparent Purpose                      | Audience              | Referenced by SSOT? |
| -------------------------- | ---------- | ------------------------------------- | --------------------- | ------------------- |
| UI_CONSISTENCY_CONTRACT.md | `docs/ui/` | UI tooltip/sizing governance (LOCKED) | Frontend contributors | Yes                 |

---

## docs/audit/ Directory — Audit Evidence

| File                        | Location      | Apparent Purpose                      | Audience    | Referenced by SSOT? |
| --------------------------- | ------------- | ------------------------------------- | ----------- | ------------------- |
| DB_ARCHITECTURE_EVIDENCE.md | `docs/audit/` | Database architecture evidence packet | Ops / Audit | Yes (via ops log)   |
| EXPERT_AUDIT_2025-12-25.md  | `docs/audit/` | Expert audit findings (untracked)     | Audit       | Unclear             |

---

## docs/archive/ Directory — Historical Documents

| File                                | Location        | Apparent Purpose                               | Audience   | Referenced by SSOT? |
| ----------------------------------- | --------------- | ---------------------------------------------- | ---------- | ------------------- |
| README.md                           | `docs/archive/` | Archive index, explains why docs were archived | All        | No (archive)        |
| BACKFILL_QUICKSTART.md              | `docs/archive/` | Store name backfill guide (completed)          | Historical | No (archived)       |
| baseline-README.md                  | `docs/archive/` | Baseline screenshots placeholder               | Historical | No (archived)       |
| browse_api_migration_audit.md       | `docs/archive/` | Browse API migration evidence                  | Historical | No (archived)       |
| DECISIONS.md                        | `docs/archive/` | System decisions (consolidated into SSOT)      | Historical | No (archived)       |
| LAYOUT_FIX_SUMMARY.md               | `docs/archive/` | Table layout fix record                        | Historical | No (archived)       |
| MARKET_FILTER_FIX.md                | `docs/archive/` | Market filter loop fix analysis                | Historical | No (archived)       |
| MULTI_MARKET_FIX.md                 | `docs/archive/` | Multi-market fix root cause                    | Historical | No (archived)       |
| MULTI_MARKET_SUMMARY.md             | `docs/archive/` | Multi-market implementation summary            | Historical | No (archived)       |
| SELLER_STORE_NAME_IMPLEMENTATION.md | `docs/archive/` | Store name implementation record               | Historical | No (archived)       |
| storefront_enrichment_audit.md      | `docs/archive/` | Storefront enrichment audit                    | Historical | No (archived)       |
| store_name_source_audit.md          | `docs/archive/` | Store name data source audit                   | Historical | No (archived)       |
| ui-baseline.md                      | `docs/archive/` | UI baseline verification (superseded)          | Historical | No (archived)       |
| VERIFICATION_CHECKLIST.md           | `docs/archive/` | Layout verification (superseded)               | Historical | No (archived)       |

---

## scripts/ Directory — Embedded Documentation

| File      | Location                      | Apparent Purpose            | Audience   | Referenced by SSOT? |
| --------- | ----------------------------- | --------------------------- | ---------- | ------------------- |
| README.md | `scripts/one-off/`            | One-off scripts usage notes | Developers | No                  |
| README.md | `scripts/migrations/archive/` | Archived migration notes    | Developers | No                  |

---

## Summary Statistics

| Category                      | Count  |
| ----------------------------- | ------ |
| Root-level docs               | 4      |
| Active docs (docs/)           | 9      |
| UI docs (docs/ui/)            | 1      |
| Audit evidence (docs/audit/)  | 2      |
| Archived docs (docs/archive/) | 14     |
| Script READMEs                | 2      |
| **Total**                     | **32** |

---

## Observations (No Judgment)

1. **Archive exists and is documented**: 14 historical docs are in `docs/archive/` with an index README explaining why they were archived
2. **Index is maintained**: `docs/INDEX.md` maps active documents
3. **SSOT is large**: PROJECT_SSOT.md is 109KB (comprehensive ops log)
4. **Untracked audit file**: `EXPERT_AUDIT_2025-12-25.md` appears untracked (per git status)
5. **Clear hierarchy**: Root → docs/ → archive/ structure established

---

**Audit Status**: Documentation inventory complete. No files modified or moved.
