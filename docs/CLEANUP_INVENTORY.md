# Cleanup Inventory

**Created**: 2026-01-02
**PR**: #191 (REBASELINE)
**Status**: INVENTORY ONLY (no deletions, moves, or renames)

---

## A) Summary

- **Main clutter source**: `docs/audit/` folder contains 3 audit docs that overlap with archived 2025 full-system audit and current rebaseline work
- **Scripts cruft**: `scripts/one-off/` (37 files) and scattered `tmp-*`/`debug-*`/`check-*` scripts in main scripts folder are historical dev artifacts
- **Stray temp file**: `scripts/tmp-top-home.ts` is an orphaned debug script with no references
- **Archive placeholders**: `docs/archive/baseline-README.md` references non-existent screenshot folder and obsolete workflow
- **Docs consolidation opportunity**: Several advisory/plan docs reference blocked work (Option A, sold data) that may remain indefinitely blocked
- **Claude tooling**: Well-organized, no cleanup needed - 4 agents + 1 command + settings example

---

## B) Inventory Table

| Path                                                    | Type    | Status  | Why                                                              | Evidence                                                       | Risk | Proposed Action                                          |
| ------------------------------------------------------- | ------- | ------- | ---------------------------------------------------------------- | -------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| `docs/audit/EXPERT_AUDIT_2025-12-25.md`                 | doc     | ARCHIVE | Superseded by 2025 full-system audit closeout and rebaseline M09 | Referenced only by archived audit docs; not in INDEX.md        | LOW  | Move to `docs/archive/audits/`                           |
| `docs/audit/DB_ARCHITECTURE_EVIDENCE.md`                | doc     | ARCHIVE | Historical evidence packet, work complete                        | Not referenced by INDEX.md; superseded by P2.2 and M07         | LOW  | Move to `docs/archive/audits/`                           |
| `docs/audit/PRODUCT_TRUTH_PHILOSOPHY_AUDIT_OPTION_A.md` | doc     | ARCHIVE | Blocked pending sold data approval (P3.1); advisory only         | Referenced by SSOT as blocked; not active work                 | MED  | Move to `docs/archive/plan/` or keep until P3.1 resolves |
| `docs/plan/OPTION_A_IMPLEMENTATION_PLAN.md`             | doc     | ARCHIVE | Blocked pending sold data approval (P3.1)                        | Referenced by SSOT as blocked; WORKSTREAMS_MASTER P3.2 gate    | MED  | Move to `docs/archive/plan/` or keep until P3.1 resolves |
| `docs/plan/SOLD_DATA_SOURCE_OPTIONS.md`                 | doc     | ARCHIVE | Blocked pending eBay AGC (P3.1)                                  | Referenced by PROJECT_SSOT.md and M09_DOCS_REVIEW.md           | MED  | Move to `docs/archive/plan/` or keep until P3.1 resolves |
| `docs/archive/baseline-README.md`                       | doc     | DELETE  | References non-existent screenshot folder; obsolete workflow     | ui-baseline.md superseded by REGRESSION_CHECKLIST.md           | LOW  | Delete (no active use)                                   |
| `scripts/tmp-top-home.ts`                               | script  | DELETE  | Orphaned temp debug script                                       | Not referenced anywhere; `tmp-` prefix indicates temporary     | LOW  | Delete                                                   |
| `scripts/one-off/` (37 files)                           | scripts | KEEP    | Historical dev scripts with documented purpose                   | README.md explains archive status; may be useful for reference | LOW  | Keep archived as-is                                      |
| `scripts/migrations/archive/`                           | sql     | KEEP    | Historical migration duplicates with README                      | README.md explains archive status                              | LOW  | Keep archived as-is                                      |
| `docs/archive/` (14 files)                              | docs    | KEEP    | Properly archived historical docs                                | Has README.md explaining archive contents                      | LOW  | Keep archived as-is                                      |
| `docs/archive/audits/2025-full-system/` (14 files)      | docs    | KEEP    | Closed audit with README                                         | AUDIT_CLOSEOUT.md confirms closed status                       | LOW  | Keep archived as-is                                      |
| `docs/rebaseline/` (13 files)                           | docs    | KEEP    | Active rebaseline work (M01-M10)                                 | Referenced by INDEX.md; modules active                         | HIGH | Do not touch - active work                               |
| `docs/ops/EBAY_AGC_SUBMISSION_PACKET.md`                | doc     | KEEP    | Pending external submission (P3.1 blocker)                       | Referenced by SSOT; awaiting operator action                   | HIGH | Do not touch - awaiting external approval                |
| `docs/db/INDEX_AUDIT_P2.2.md`                           | doc     | KEEP    | Recent P2.2 work product                                         | Part of completed P2.2 workstream                              | LOW  | Keep as reference                                        |
| `.claude/agents/` (4 files)                             | config  | KEEP    | Active Claude agent definitions                                  | Well-documented, actively used                                 | LOW  | Keep as-is                                               |
| `.claude/commands/merge-decision-packet.md`             | config  | KEEP    | Active Claude command                                            | Referenced by CLAUDE.md workflow                               | LOW  | Keep as-is                                               |
| `.claude/settings.example.json`                         | config  | KEEP    | Example settings template                                        | Useful for onboarding                                          | LOW  | Keep as-is                                               |

---

## C) Link/Reference Map

### CLAUDE.md Links

- `PROJECT_SSOT.md` - authoritative state
- `SHIFT_LOCK.md` - process gates
- `REGRESSION_CHECKLIST.md` - smoke tests
- `docs/INDEX.md` - doc hub

### docs/INDEX.md Links

- **Authoritative**: PROJECT_SSOT.md, SHIFT_LOCK.md, REGRESSION_CHECKLIST.md, UI_CONSISTENCY_CONTRACT.md, TIER2_ARCHITECTURE.md
- **Runbooks**: BACKUP_POLICY.md, ENV_RUNBOOK.md, DB_MIGRATIONS_RUNBOOK.md, RELEASES.md, DEFINITION_OF_READY.md, EVIDENCE_PACKET_TEMPLATE.md
- **Design**: DESIGN_AUDIT_2025-01.md, DESIGN_PHASES.md
- **Reference**: market-policy.md, surfaces.md, README.md
- **Rebaseline**: docs/rebaseline/\* (active)
- **Archive**: docs/archive/\* (historical)

### PROJECT_SSOT.md References

- docs/WORKSTREAMS_MASTER.md (canonical backlog)
- docs/plan/SOLD_DATA_SOURCE_OPTIONS.md (blocked work)
- docs/design/\* (Phase 1 active)
- docs/rebaseline/\* (active review)
- SHIFT_LOCK.md gates throughout

### SHIFT_LOCK.md References

- PROJECT_SSOT.md (authority)
- REGRESSION_CHECKLIST.md (verification)
- docs/INDEX.md (doc map)

---

## D) Proposed Cleanup Plan (PR Sequence)

### PR #192: Low-Risk Archive Moves + Deletions

**Files to change**:

- DELETE: `scripts/tmp-top-home.ts` (orphaned temp script)
- DELETE: `docs/archive/baseline-README.md` (obsolete placeholder)
- MOVE: `docs/audit/EXPERT_AUDIT_2025-12-25.md` -> `docs/archive/audits/`
- MOVE: `docs/audit/DB_ARCHITECTURE_EVIDENCE.md` -> `docs/archive/audits/`
- Update `docs/INDEX.md` if needed

**Risk**: LOW
**Verification**: Grep for references before deletion; update any broken links

### PR #193: Medium-Risk Blocked Work Archive (DEFER until P3.1 decision)

**Files to change (pending approval)**:

- MOVE: `docs/audit/PRODUCT_TRUTH_PHILOSOPHY_AUDIT_OPTION_A.md` -> `docs/archive/plan/`
- MOVE: `docs/plan/OPTION_A_IMPLEMENTATION_PLAN.md` -> `docs/archive/plan/`
- MOVE: `docs/plan/SOLD_DATA_SOURCE_OPTIONS.md` -> `docs/archive/plan/`
- Update PROJECT_SSOT.md blocked work references

**Risk**: MED
**Gate**: Only proceed after explicit operator decision on P3.1/P3.2 status

### PR #194: Scripts Cleanup (DEFER - not urgent)

**Potential candidates**:

- Consolidate `scripts/check-*` and `scripts/debug-*` into `scripts/one-off/`
- Review `scripts/test-*` for one-off vs reusable tests

**Risk**: MED (scripts may have undocumented uses)
**Gate**: Require explicit operator confirmation of each script's obsolescence

---

## E) "Do Not Touch Yet" List

| Path                                     | Risk | Reason                                                       |
| ---------------------------------------- | ---- | ------------------------------------------------------------ |
| `docs/rebaseline/*`                      | HIGH | Active module review work (M01-M10 in progress)              |
| `docs/ops/EBAY_AGC_SUBMISSION_PACKET.md` | HIGH | Awaiting external eBay AGC approval; critical blocker        |
| `docs/plan/OPTION_A_*` + `SOLD_DATA_*`   | MED  | Blocked pending P3.1 decision; may become active if approved |
| `scripts/check-alerts.ts`                | MED  | Large script (22KB); may be production-critical for alerting |
| `scripts/e2e-test-alerts.ts`             | MED  | E2E test script; may be needed for T2 alerting verification  |
| All `lib/__tests__/*`                    | HIGH | Active test suite; do not touch                              |
| All `scripts/__tests__/*`                | HIGH | Active test suite; do not touch                              |

---

## Repo-Wide Scan Proof

**Commands executed**:

```
git ls-files | wc -l
# Result: 382 tracked files

git ls-files | grep -iE "audit|index|workstream|ssot|lock|regression|claude"
# Result: 35 matches (governance + audit files)

rg -n "CLEANUP_INVENTORY|INDEX.md|PROJECT_SSOT.md|SHIFT_LOCK.md|REGRESSION_CHECKLIST.md|CLAUDE.md" -S .
# Result: 100+ references across 20+ files (link/reference map built from this)

git ls-files | grep -iE "\(1\)|copy|\.old|\.backup|\.bak|_v2|_final|_temp|\.orig"
# Result: 1 match (EVIDENCE_PACKET_TEMPLATE.md - false positive, actual file)

git ls-files | grep -iE "tmp|temp|test" | head -30
# Result: test files + scripts/tmp-top-home.ts identified
```

**Folder structure audited**:

- Root governance: CLAUDE.md, PROJECT_SSOT.md, SHIFT_LOCK.md, REGRESSION_CHECKLIST.md, README.md
- `.claude/`: agents (4), commands (1), settings.example.json
- `docs/`: INDEX.md, WORKSTREAMS_MASTER.md, runbooks (6), design (2), plan (2), audit (3), db (1), ops (1), ui (1), rebaseline (13), archive (28+)
- `scripts/`: main scripts (60+), one-off (37), migrations (10+), migrations/archive (2)

---

## LOCKED / VERIFIED Footer

- [x] **Allowlist matched exactly**: Only created `docs/CLEANUP_INVENTORY.md` (this file)
- [x] **Inventory-only**: No deletions, moves, renames, or content changes to existing files
- [x] **Repo-wide scan performed**: 382 files scanned via git ls-files; key patterns searched via rg/grep
- [x] **No scope creep**: Inventory categories match task specification exactly
- [x] **HIGH-risk items flagged**: All HIGH-risk items listed in Section E with deferral reasons
