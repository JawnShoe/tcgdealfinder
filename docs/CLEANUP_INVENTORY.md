# Cleanup Inventory

**Created**: 2026-01-02
**PR**: #191 (REBASELINE)
**Last Updated**: 2026-01-03 (status rollup after PRs #191–#194)
**Status**: CURRENT — LOW-risk cleanup complete; MED-risk docs explicitly KEEP (gated)

---

## A) Summary

- **LOW-risk cleanup complete (PR #192)**: Deleted orphaned temp script and obsolete placeholder; moved superseded audit docs to archive
- **MED-risk docs explicitly KEEP**: Option A plan/audit docs are gated (P3.1/P3.2) and must not be archived until gates resolve
- **Scripts cruft**: `scripts/one-off/` (37 files) and scattered `tmp-*`/`debug-*`/`check-*` scripts remain deferred (needs dedicated verification)
- **Claude tooling**: Well-organized, no cleanup needed - 4 agents + 1 command + settings example
- **Verifier gate added (PR #194)**: Governance doc archiving now requires supersession proof and fails by default if referenced

---

## B) Inventory Table

| Path                                                    | Type    | Status   | Why                                                        | Evidence                                                       | Risk | Proposed Action                           |
| ------------------------------------------------------- | ------- | -------- | ---------------------------------------------------------- | -------------------------------------------------------------- | ---- | ----------------------------------------- |
| `docs/audit/EXPERT_AUDIT_2025-12-25.md`                 | doc     | **DONE** | MOVED to `docs/archive/audits/` (PR #192)                  | R100 rename; refs only in archive/historical docs              | LOW  | ~~Move to `docs/archive/audits/`~~ DONE   |
| `docs/audit/DB_ARCHITECTURE_EVIDENCE.md`                | doc     | **DONE** | MOVED to `docs/archive/audits/` (PR #192)                  | R100 rename; refs only in archive/historical docs              | LOW  | ~~Move to `docs/archive/audits/`~~ DONE   |
| `docs/audit/PRODUCT_TRUTH_PHILOSOPHY_AUDIT_OPTION_A.md` | doc     | **KEEP** | Governing invariants for Option A; referenced by IMPL_PLAN | OPTION_A_IMPLEMENTATION_PLAN.md:15 lists as governing doc      | MED  | **DO NOT ARCHIVE** — gated by P3.1/P3.2   |
| `docs/plan/OPTION_A_IMPLEMENTATION_PLAN.md`             | doc     | **KEEP** | Canonical plan; Phase 0 executed; Phases 1–4 gated         | WORKSTREAMS_MASTER P3.2 gate; M09 review marks "Blocked"       | MED  | **DO NOT ARCHIVE** — gated by P3.1/P3.2   |
| `docs/plan/SOLD_DATA_SOURCE_OPTIONS.md`                 | doc     | **KEEP** | Referenced by SSOT STOP rule (line 107)                    | PROJECT_SSOT.md:107 explicit reference; AGC checklist inside   | MED  | **DO NOT ARCHIVE** — gated by P3.1/P3.2   |
| `docs/archive/baseline-README.md`                       | doc     | **DONE** | DELETED (PR #192)                                          | Reference scan confirmed no active uses                        | LOW  | ~~Delete~~ DONE                           |
| `scripts/tmp-top-home.ts`                               | script  | **DONE** | DELETED (PR #192)                                          | Reference scan confirmed no active uses                        | LOW  | ~~Delete~~ DONE                           |
| `scripts/one-off/` (37 files)                           | scripts | KEEP     | Historical dev scripts with documented purpose             | README.md explains archive status; may be useful for reference | LOW  | Keep archived as-is                       |
| `scripts/migrations/archive/`                           | sql     | KEEP     | Historical migration duplicates with README                | README.md explains archive status                              | LOW  | Keep archived as-is                       |
| `docs/archive/` (14 files)                              | docs    | KEEP     | Properly archived historical docs                          | Has README.md explaining archive contents                      | LOW  | Keep archived as-is                       |
| `docs/archive/audits/2025-full-system/` (14 files)      | docs    | KEEP     | Closed audit with README                                   | AUDIT_CLOSEOUT.md confirms closed status                       | LOW  | Keep archived as-is                       |
| `docs/rebaseline/` (13 files)                           | docs    | KEEP     | Active rebaseline work (M01-M10)                           | Referenced by INDEX.md; modules active                         | HIGH | Do not touch - active work                |
| `docs/ops/EBAY_AGC_SUBMISSION_PACKET.md`                | doc     | KEEP     | Pending external submission (P3.1 blocker)                 | Referenced by SSOT; awaiting operator action                   | HIGH | Do not touch - awaiting external approval |
| `docs/db/INDEX_AUDIT_P2.2.md`                           | doc     | KEEP     | Recent P2.2 work product                                   | Part of completed P2.2 workstream                              | LOW  | Keep as reference                         |
| `.claude/agents/` (4 files)                             | config  | KEEP     | Active Claude agent definitions                            | Well-documented, actively used                                 | LOW  | Keep as-is                                |
| `.claude/commands/merge-decision-packet.md`             | config  | KEEP     | Active Claude command                                      | Referenced by CLAUDE.md workflow                               | LOW  | Keep as-is                                |
| `.claude/settings.example.json`                         | config  | KEEP     | Example settings template                                  | Useful for onboarding                                          | LOW  | Keep as-is                                |

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

## D) Cleanup Progress (PR Sequence)

### ✅ PR #191: Inventory Created (DONE)

- Created this `docs/CLEANUP_INVENTORY.md` file
- Added link in `docs/INDEX.md`

### ✅ PR #192: Low-Risk Cleanup Executed (DONE)

**Completed**:

- DELETED: `scripts/tmp-top-home.ts` (orphaned temp script)
- DELETED: `docs/archive/baseline-README.md` (obsolete placeholder)
- MOVED: `docs/audit/EXPERT_AUDIT_2025-12-25.md` → `docs/archive/audits/` (R100)
- MOVED: `docs/audit/DB_ARCHITECTURE_EVIDENCE.md` → `docs/archive/audits/` (R100)

**Verification**: Reference scan confirmed no active uses before deletion/move.

### ✅ PR #193: SSOT Rollup (DONE)

- Added "Recent progress:" section to PROJECT_SSOT.md ACTIVE WORK area
- Documented PRs #190, #191, #192 progress

### ✅ PR #194: Verifier Governance Gate (DONE)

- Added supersession proof requirement to `.claude/agents/verifier.md`
- Blocks archiving/moving `docs/plan/` and `docs/audit/` without explicit replacement
- Default verdict is FAIL (KEEP) for referenced or blocked docs

### 🚫 MED-Risk Doc Archiving: CANCELLED

The following docs were previously marked as archive candidates but are now **explicitly KEEP**:

| Doc                                                     | Why KEEP                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| `docs/plan/SOLD_DATA_SOURCE_OPTIONS.md`                 | Referenced by SSOT STOP rule (line 107)                       |
| `docs/plan/OPTION_A_IMPLEMENTATION_PLAN.md`             | Canonical plan; Phase 0 executed; Phases 1–4 gated by P3.2    |
| `docs/audit/PRODUCT_TRUTH_PHILOSOPHY_AUDIT_OPTION_A.md` | Governing invariants; referenced by IMPL_PLAN as prerequisite |

**Gate**: These docs cannot be archived until P3.1/P3.2 gates resolve (see WORKSTREAMS_MASTER.md).

### 🔜 Scripts Cleanup: DEFERRED

**Potential candidates** (not urgent):

- Consolidate `scripts/check-*` and `scripts/debug-*` into `scripts/one-off/`
- Review `scripts/test-*` for one-off vs reusable tests

**Risk**: MED (scripts may have undocumented uses)
**Gate**: Requires dedicated plan + per-script verification before any changes

---

## E) "Do Not Touch Yet" List

| Path                                     | Risk | Reason                                                       |
| ---------------------------------------- | ---- | ------------------------------------------------------------ |
| `docs/rebaseline/*`                      | HIGH | Active module review work (M01-M10 in progress)              |
| `docs/ops/EBAY_AGC_SUBMISSION_PACKET.md` | HIGH | Awaiting external eBay AGC approval; critical blocker        |
| `docs/plan/OPTION_A_*` + `SOLD_DATA_*`   | HIGH | **KEEP (GATED)** — P3.1/P3.2 blocked; SSOT references active |
| `docs/audit/PRODUCT_TRUTH_*`             | HIGH | **KEEP (GATED)** — Governing doc for Option A                |
| `scripts/check-alerts.ts`                | MED  | Large script (22KB); may be production-critical for alerting |
| `scripts/e2e-test-alerts.ts`             | MED  | E2E test script; may be needed for T2 alerting verification  |
| All `lib/__tests__/*`                    | HIGH | Active test suite; do not touch                              |
| All `scripts/__tests__/*`                | HIGH | Active test suite; do not touch                              |

---

## F) Guardrails

**Verifier gate (PR #194)**: Governance doc archiving/moving under `docs/plan/` and `docs/audit/` now requires supersession proof and will **FAIL** verification if:

- The doc is referenced by SSOT, WORKSTREAMS_MASTER, or other governing docs
- No explicit replacement document exists
- The doc is marked Blocked or Draft (cleanup heuristics alone are insufficient)

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

- [x] **PR #191**: Inventory created (this file)
- [x] **PR #192**: LOW-risk cleanup executed (2 deletions + 2 archive moves)
- [x] **PR #193**: SSOT rollup with recent progress
- [x] **PR #194**: Verifier governance gate added
- [x] **PR #195**: Status rollup (this update) — syncs inventory with reality
- [x] **MED-risk docs explicitly KEEP**: Option A docs gated by P3.1/P3.2
- [x] **Scripts cleanup DEFERRED**: Requires dedicated verification plan

---

## G) Framework Cleanup — Evidence-Only Inventory (2026-01-03)

**Purpose**: Post-verification inventory of all documentation and framework artifacts now that the Claude framework is VERIFIED and LOCKED. This is a **proposal only** — no files are moved, deleted, or archived in this PR.

**Context**: The Claude framework verification session (2026-01-03) confirmed PASS status. This inventory identifies candidates for future cleanup to reduce doc sprawl while protecting active/gated artifacts.

### Full Inventory Table

| File                                                    | Current Role  | Referenced By                          | Recommended Action | Rationale                                             | Risk Level |
| ------------------------------------------------------- | ------------- | -------------------------------------- | ------------------ | ----------------------------------------------------- | ---------- |
| **Root Governance**                                     |               |                                        |                    |                                                       |
| `CLAUDE.md`                                             | AUTHORITATIVE | Entrypoint for all sessions            | KEEP               | Single source of truth entrypoint                     | —          |
| `PROJECT_SSOT.md`                                       | AUTHORITATIVE | CLAUDE.md, SHIFT_LOCK.md, all PRs      | KEEP               | Canonical project state                               | —          |
| `SHIFT_LOCK.md`                                         | REFERENCE     | CLAUDE.md, PROJECT_SSOT.md             | KEEP               | Active process gates                                  | —          |
| `REGRESSION_CHECKLIST.md`                               | REFERENCE     | CLAUDE.md, SHIFT_LOCK.md               | KEEP               | Active verification checklists                        | —          |
| `README.md`                                             | REFERENCE     | docs/INDEX.md                          | KEEP               | Project introduction                                  | LOW        |
| **docs/ Core**                                          |               |                                        |                    |                                                       |
| `docs/INDEX.md`                                         | REFERENCE     | SHIFT_LOCK.md                          | KEEP               | Documentation hub                                     | —          |
| `docs/WORKSTREAMS_MASTER.md`                            | AUTHORITATIVE | PROJECT_SSOT.md, CLAUDE.md             | KEEP               | Canonical backlog                                     | —          |
| `docs/CLEANUP_INVENTORY.md`                             | REFERENCE     | docs/INDEX.md                          | KEEP               | This file; active inventory                           | —          |
| `docs/TIER2_ARCHITECTURE.md`                            | REFERENCE     | docs/INDEX.md, PROJECT_SSOT.md         | KEEP               | T2 architecture reference                             | LOW        |
| **docs/design/**                                        |               |                                        |                    |                                                       |
| `docs/design/DESIGN_AUDIT_2025-01.md`                   | REFERENCE     | docs/INDEX.md, PROJECT_SSOT.md         | KEEP               | Advisory design audit                                 | LOW        |
| `docs/design/DESIGN_PHASES.md`                          | REFERENCE     | docs/INDEX.md, WORKSTREAMS_MASTER.md   | KEEP               | Active Phase 1 constraints                            | LOW        |
| **docs/plan/**                                          |               |                                        |                    |                                                       |
| `docs/plan/OPTION_A_IMPLEMENTATION_PLAN.md`             | REFERENCE     | WORKSTREAMS_MASTER.md (P3.2 gated)     | KEEP               | Gated by P3.1/P3.2 — **proposal only**                | MED        |
| `docs/plan/SOLD_DATA_SOURCE_OPTIONS.md`                 | REFERENCE     | PROJECT_SSOT.md (line 107 STOP)        | KEEP               | Referenced by SSOT STOP rule — **proposal only**      | MED        |
| **docs/audit/**                                         |               |                                        |                    |                                                       |
| `docs/audit/PRODUCT_TRUTH_PHILOSOPHY_AUDIT_OPTION_A.md` | REFERENCE     | OPTION_A_IMPLEMENTATION_PLAN.md        | KEEP               | Governing invariants for Option A — **proposal only** | MED        |
| **docs/ops/**                                           |               |                                        |                    |                                                       |
| `docs/ops/EBAY_AGC_SUBMISSION_PACKET.md`                | REFERENCE     | PROJECT_SSOT.md (P3.1 blocker)         | KEEP               | Awaiting external eBay approval                       | HIGH       |
| **docs/db/**                                            |               |                                        |                    |                                                       |
| `docs/db/INDEX_AUDIT_P2.2.md`                           | REFERENCE     | PROJECT_SSOT.md, WORKSTREAMS_MASTER.md | KEEP               | Recent P2.2 work product                              | LOW        |
| **docs/ui/**                                            |               |                                        |                    |                                                       |
| `docs/ui/UI_CONSISTENCY_CONTRACT.md`                    | REFERENCE     | docs/INDEX.md                          | KEEP               | Active UI governance                                  | LOW        |
| **Runbooks (docs/)**                                    |               |                                        |                    |                                                       |
| `docs/BACKUP_POLICY.md`                                 | REFERENCE     | docs/INDEX.md                          | KEEP               | Active operational runbook                            | LOW        |
| `docs/ENV_RUNBOOK.md`                                   | REFERENCE     | docs/INDEX.md, PROJECT_SSOT.md         | KEEP               | Active operational runbook                            | LOW        |
| `docs/DB_MIGRATIONS_RUNBOOK.md`                         | REFERENCE     | docs/INDEX.md                          | KEEP               | Active operational runbook                            | LOW        |
| `docs/RELEASES.md`                                      | REFERENCE     | docs/INDEX.md, PROJECT_SSOT.md         | KEEP               | Active release workflow                               | LOW        |
| `docs/DEFINITION_OF_READY.md`                           | REFERENCE     | docs/INDEX.md                          | KEEP               | Feature planning checklist                            | LOW        |
| `docs/EVIDENCE_PACKET_TEMPLATE.md`                      | REFERENCE     | docs/INDEX.md                          | KEEP               | Evidence gate template                                | LOW        |
| `docs/market-policy.md`                                 | REFERENCE     | docs/INDEX.md                          | KEEP               | Multi-market reference                                | LOW        |
| `docs/surfaces.md`                                      | REFERENCE     | docs/INDEX.md                          | KEEP               | Feature surface map                                   | LOW        |
| **docs/rebaseline/**                                    |               |                                        |                    |                                                       |
| `docs/rebaseline/REPO_PACKET_2025-12-29.md`             | REFERENCE     | docs/INDEX.md                          | KEEP               | Repo inventory snapshot                               | LOW        |
| `docs/rebaseline/CRITICALITY_MAP.md`                    | REFERENCE     | docs/INDEX.md                          | KEEP               | Active criticality labels                             | LOW        |
| `docs/rebaseline/MODULE_REVIEW_PLAN.md`                 | REFERENCE     | docs/INDEX.md                          | KEEP               | Module review order                                   | LOW        |
| `docs/rebaseline/modules/M01–M10` (10 files)            | REFERENCE     | MODULE_REVIEW_PLAN.md                  | KEEP               | Completed module reviews                              | LOW        |
| **docs/archive/**                                       |               |                                        |                    |                                                       |
| `docs/archive/` (14 files)                              | LEGACY        | Has README.md                          | KEEP               | Properly archived                                     | LOW        |
| `docs/archive/audits/` (2 files)                        | LEGACY        | Archive index                          | KEEP               | Superseded audits                                     | LOW        |
| `docs/archive/audits/2025-full-system/` (14 files)      | LEGACY        | Has AUDIT_CLOSEOUT.md                  | KEEP               | Closed audit artifacts                                | LOW        |
| `docs/archive/2024-12/CLEANUP_SUMMARY.md`               | LEGACY        | None active                            | KEEP               | Historical cleanup record                             | LOW        |
| **.claude/**                                            |               |                                        |                    |                                                       |
| `.claude/agents/` (4 files)                             | REFERENCE     | CLEANUP_INVENTORY.md                   | KEEP               | Active Claude agents                                  | LOW        |
| `.claude/commands/merge-decision-packet.md`             | REFERENCE     | CLAUDE.md workflow                     | KEEP               | Active command                                        | LOW        |
| `.claude/settings.example.json`                         | REFERENCE     | Onboarding                             | KEEP               | Settings template                                     | LOW        |
| **scripts/ README files**                               |               |                                        |                    |                                                       |
| `scripts/migrations/archive/README.md`                  | LEGACY        | None                                   | KEEP               | Archive explanation                                   | LOW        |
| `scripts/one-off/README.md`                             | LEGACY        | None                                   | KEEP               | Archive explanation                                   | LOW        |

### Classification Summary

**Classification Totals**:

- **AUTHORITATIVE**: 3 files (CLAUDE.md, PROJECT_SSOT.md, WORKSTREAMS_MASTER.md)
- **REFERENCE**: 32 files (active runbooks, design docs, rebaseline modules, Claude agents)
- **LEGACY**: 35+ files (all under docs/archive/ and scripts/ READMEs)

**Recommended Actions**:

- **KEEP all files**: No files are recommended for immediate deletion/archival
- All LEGACY files are already properly archived under `docs/archive/`
- All REFERENCE files are actively used or gated

### Gated Items (MED/HIGH risk — proposal only)

| Item                                                    | Gate                          | When Safe to Archive                      |
| ------------------------------------------------------- | ----------------------------- | ----------------------------------------- |
| `docs/plan/OPTION_A_IMPLEMENTATION_PLAN.md`             | P3.1/P3.2 (eBay AGC approval) | After Option A completes or is cancelled  |
| `docs/plan/SOLD_DATA_SOURCE_OPTIONS.md`                 | P3.1 (eBay AGC approval)      | After sold data source decision finalized |
| `docs/audit/PRODUCT_TRUTH_PHILOSOPHY_AUDIT_OPTION_A.md` | P3.1/P3.2                     | After Option A completes or is cancelled  |
| `docs/ops/EBAY_AGC_SUBMISSION_PACKET.md`                | P3.1 (external approval)      | After eBay responds                       |

### Future Cleanup Candidates (not actionable now)

| Item                                      | When Actionable                  | Action                 |
| ----------------------------------------- | -------------------------------- | ---------------------- |
| `docs/rebaseline/modules/M01–M10`         | After REBASELINE v1 fully closed | Consolidate or archive |
| `docs/archive/2024-12/CLEANUP_SUMMARY.md` | Already archived                 | No action needed       |

### Guardrails Applied

1. ✅ Classification rules from task followed (AUTHORITATIVE/REFERENCE/LEGACY)
2. ✅ All gated docs marked as MED/HIGH risk with explicit gates
3. ✅ No recommendations for immediate action on gated items
4. ✅ Verifier governance gate (PR #194) applies to any future archival
5. ✅ SSOT STOP rule (line 107) explicitly checked for sold data docs

### Scan Evidence

**Files scanned**: 68 markdown files (excluding node_modules)

**Reference check method**: `rg` pattern matching for cross-references

**Governance docs checked**: CLAUDE.md, PROJECT_SSOT.md, SHIFT_LOCK.md, WORKSTREAMS_MASTER.md, docs/INDEX.md

**Scan commands**:

```
find . -name "*.md" -not -path "./node_modules/*" | wc -l
# Result: 68 tracked markdown files

rg "TIER2_ARCHITECTURE|surfaces\.md|market-policy" --files-with-matches
# Result: 21 files reference these docs

rg "DESIGN_AUDIT|DESIGN_PHASES|UI_CONSISTENCY" --files-with-matches
# Result: 15 files reference design docs

rg "rebaseline/modules" --files-with-matches
# Result: 4 files reference rebaseline modules
```
