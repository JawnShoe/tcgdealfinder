# Historical Documentation Archive

**Purpose**: Completed implementation records, audits, and superseded documentation.

**Last Updated**: 2025-12-23

---

## Archive Contents

| Document | Date Archived | Original Purpose |
|----------|---------------|------------------|
| `VERIFICATION_CHECKLIST.md` | 2025-12-23 | Layout fix verification (superseded by REGRESSION_CHECKLIST.md) |
| `LAYOUT_FIX_SUMMARY.md` | 2025-12-23 | Table layout fix implementation record |
| `BACKFILL_QUICKSTART.md` | 2025-12-23 | Store name backfill quickstart guide |
| `SELLER_STORE_NAME_IMPLEMENTATION.md` | 2025-12-23 | Store name implementation record |
| `MULTI_MARKET_FIX.md` | 2025-12-23 | Multi-market fix root cause analysis |
| `MULTI_MARKET_SUMMARY.md` | 2025-12-23 | Multi-market implementation summary |
| `MARKET_FILTER_FIX.md` | 2025-12-23 | Market filter loop fix analysis |
| `browse_api_migration_audit.md` | 2025-12-23 | Browse API migration audit evidence packet |
| `store_name_source_audit.md` | 2025-12-23 | Store name data source audit |
| `storefront_enrichment_audit.md` | 2025-12-23 | Storefront enrichment audit (Phase 0) |
| `ui-baseline.md` | 2025-12-23 | UI baseline verification (superseded by REGRESSION_CHECKLIST.md) |
| `baseline-README.md` | 2025-12-23 | Baseline screenshots placeholder (empty directory) |
| `DECISIONS.md` | 2025-12-23 | System decisions and rationale (consolidated into PROJECT_SSOT.md) |

---

## Why These Were Archived

These documents represent **completed work** that is now part of the production codebase. They served their purpose during implementation/audit phases and are preserved for historical reference.

**Active verification processes** are now documented in:
- [REGRESSION_CHECKLIST.md](../../REGRESSION_CHECKLIST.md) - Current manual testing checklist
- [PROJECT_SSOT.md](../../PROJECT_SSOT.md) - Authoritative project status

---

## Accessing Archived Docs

All archived documents are preserved with their original filenames and content. Use git history to see when they were active:

```bash
# View when a document was archived
git log -- docs/archive/FILENAME.md

# View the document at a specific commit
git show COMMIT:ORIGINAL_PATH
```

---

**Governance**: Documents are archived when they become historical records (implementations complete) or are superseded by newer authoritative docs.
