# Documentation Redundancy Audit

**Audit Date**: 2026-01-18
**Scope**: Evidence-only audit of documentation redundancy and canonical ownership
**Status**: READ-ONLY (no deletions, no rewrites, no file moves)

---

## 1. Canonical Topic Map

| Topic                                                        | Canonical Doc (1)                                                                            | Other Docs Mentioning Topic                                                                           | Conflicts? | Evidence (links/quotes ≤25w)                                                                                            | Action Labels                                                                           |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Authority chain / governance**                             | CLAUDE.md                                                                                    | AGENTS.md, SHIFT_LOCK.md, PROJECT_SSOT.md, docs/rebuild/CONTRACTS.md, docs/rebuild/NON_NEGOTIABLES.md | N          | CLAUDE.md:3 "Single source of truth: origin/main"; AGENTS.md:7 "Single source of truth: origin/main"                    | CLAUDE.md: Keep; AGENTS.md: Keep (adapter); SHIFT_LOCK.md: Keep; Others: Link-only      |
| **Non-negotiables / fail-hard gates**                        | docs/rebuild/NON_NEGOTIABLES.md                                                              | SHIFT_LOCK.md, CLAUDE.md, docs/rebuild/CONTRACTS.md                                                   | N          | NON_NEGOTIABLES.md governs rebuild lane; SHIFT_LOCK.md governs legacy lane (explicit separation in SHIFT_LOCK.md:21-25) | Both: Keep (scope-separated)                                                            |
| **Contracts (tooltip/hydration/skeleton) + VISUAL_CONTRACT** | docs/rebuild/CONTRACTS.md + docs/rebuild/VISUAL_CONTRACT.md                                  | docs/ui/UI_CONSISTENCY_CONTRACT.md, docs/rebuild/PRD_LITE.md                                          | N          | CONTRACTS.md:26 "See docs/rebuild/VISUAL_CONTRACT.md"; UI_CONSISTENCY_CONTRACT.md governs legacy tooltips               | CONTRACTS.md: Keep; VISUAL_CONTRACT.md: Keep; UI_CONSISTENCY_CONTRACT.md: Keep (legacy) |
| **Release / merge / evidence process**                       | docs/RELEASES.md + SHIFT_LOCK.md                                                             | CLAUDE.md, docs/rebuild/RELEASE_CHECKLIST.md                                                          | N          | RELEASES.md:66 "Required status check"; SHIFT_LOCK.md:166 "Merge Gates (LOCKED)"; rebuild has separate checklist        | RELEASES.md: Keep; SHIFT_LOCK.md: Keep; RELEASE_CHECKLIST.md: Keep (rebuild-specific)   |
| **Rebuild tracker + evidence**                               | docs/rebuild/REBUILD_TRACKER.md + docs/rebuild/TRACKER_EVIDENCE.md                           | docs/rebuild/NON_NEGOTIABLES.md:79                                                                    | N          | REBUILD_TRACKER.md:3 "Checkboxes must match TRACKER_EVIDENCE.md"                                                        | Both: Keep (paired system)                                                              |
| **Trust metrics / scoring / explainability**                 | docs/rebuild/TRUST_METRICS.md                                                                | docs/rebuild/CONTRACTS.md, docs/rebuild/NON_NEGOTIABLES.md                                            | N          | TRUST_METRICS.md:19 "Confidence Score (SSR-only)" defines scoring; others reference                                     | TRUST_METRICS.md: Keep; Others: Link-only                                               |
| **Legacy decommission**                                      | docs/rebuild/LEGACY_QUARANTINE.md                                                            | docs/rebuild/CONTRACTS.md:179, docs/rebuild/ADR_LOG.md (ADR-0019)                                     | N          | LEGACY_QUARANTINE.md:1 "Single source of truth for legacy code isolation"                                               | LEGACY_QUARANTINE.md: Keep; ADR-0019: Keep (decision record)                            |
| **Architecture (tiering, boundaries)**                       | docs/TIER2_ARCHITECTURE.md                                                                   | docs/rebuild/NON_NEGOTIABLES.md:109-127 (Boundary Discipline), PROJECT_SSOT.md                        | N          | TIER2_ARCHITECTURE.md covers Tier 2 MVP; NON_NEGOTIABLES covers rebuild boundaries                                      | TIER2_ARCHITECTURE.md: Keep (Tier 2); NON_NEGOTIABLES.md: Keep (rebuild lane)           |
| **DB migrations / DB ops**                                   | docs/DB_MIGRATIONS_RUNBOOK.md                                                                | PROJECT_SSOT.md (migration notes), docs/BACKUP_POLICY.md:53                                           | N          | DB_MIGRATIONS_RUNBOOK.md:1 "Document database migration workflow"                                                       | DB_MIGRATIONS_RUNBOOK.md: Keep; Others: Link-only                                       |
| **Observability / monitoring**                               | docs/ENV_RUNBOOK.md (§Go-Live Schedule Gate) + docs/rebuild/RELEASE_CHECKLIST.md (§Runbooks) | PROJECT_SSOT.md:305-309                                                                               | N          | ENV_RUNBOOK.md:343 "Go-Live Schedule Gate"; RELEASE_CHECKLIST.md:33-116 defines runbooks                                | ENV_RUNBOOK.md: Keep; RELEASE_CHECKLIST.md: Keep                                        |
| **Security / compliance**                                    | SHIFT_LOCK.md (§Secret Hygiene, §Safety Gate Test)                                           | docs/rebuild/NON_NEGOTIABLES.md:191-221, docs/rebuild/CONTRACTS.md:64-79                              | N          | SHIFT_LOCK.md:47 "Secret Hygiene (LOCKED)"; NON_NEGOTIABLES covers rebuild-specific                                     | SHIFT_LOCK.md: Keep; NON_NEGOTIABLES.md: Keep (rebuild lane)                            |
| **UI consistency / tooltip inventory**                       | docs/ui/UI_CONSISTENCY_CONTRACT.md + docs/ui/TOOLTIP_INVENTORY.md                            | docs/rebuild/VISUAL_CONTRACT.md                                                                       | N          | UI_CONSISTENCY_CONTRACT.md governs legacy; VISUAL_CONTRACT governs rebuild (explicit scope separation)                  | Both: Keep (scope-separated)                                                            |
| **Workstreams / planning / roadmap**                         | docs/WORKSTREAMS_MASTER.md                                                                   | PROJECT_SSOT.md:6-7                                                                                   | N          | WORKSTREAMS_MASTER.md:4 "canonical backlog/prioritization list"; SSOT:6 "ACTIVE WORK"                                   | WORKSTREAMS_MASTER.md: Keep; PROJECT_SSOT.md: Keep                                      |

---

## 2. Duplicate Clusters

| Cluster Name                     | Files in Cluster                                                    | Why they overlap (factual)                                                                   | Suggested Resolution (no edits)                                                                                               |
| -------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Authority/SSOT declarations**  | CLAUDE.md, AGENTS.md, SHIFT_LOCK.md:54                              | All declare "origin/main" as single source of truth                                          | Keep: CLAUDE.md is primary entrypoint; AGENTS.md is explicit Codex adapter; SHIFT_LOCK.md repeats for Repo Sync Proof context |
| **Conflict resolution rules**    | CLAUDE.md:27-28, AGENTS.md:8-9                                      | Both state "Process conflicts: SHIFT_LOCK.md wins; Priority conflicts: PROJECT_SSOT.md wins" | Keep both: AGENTS.md is adapter; duplication is intentional for standalone readability                                        |
| **Merge Decision Packet format** | CLAUDE.md:32-59, AGENTS.md:38-49                                    | Both document the required PR response format                                                | Keep both: AGENTS.md is Codex adapter that must stand alone                                                                   |
| **Repo Sync Proof commands**     | CLAUDE.md:34-44, AGENTS.md:53-65, SHIFT_LOCK.md:58-69               | Same git command sequence in three places                                                    | Keep: Intentional reinforcement; each doc serves different entry path                                                         |
| **Visual contract references**   | docs/rebuild/CONTRACTS.md:26, docs/rebuild/PRD_LITE.md:49           | Both point to VISUAL_CONTRACT.md                                                             | Keep: Cross-references are navigational, not duplicative content                                                              |
| **Release process docs**         | docs/RELEASES.md, docs/rebuild/RELEASE_CHECKLIST.md                 | Both cover release procedures                                                                | Keep both: RELEASES.md is general; RELEASE_CHECKLIST.md is rebuild-specific with runbooks                                     |
| **Architecture boundaries**      | docs/TIER2_ARCHITECTURE.md, docs/rebuild/NON_NEGOTIABLES.md:109-127 | Both define layer boundaries                                                                 | Keep both: Different scopes (Tier 2 MVP vs rebuild lane)                                                                      |

---

## 3. Conflict Report

| Conflict ID | Topic | Doc A claim | Doc B claim | Which should win (evidence-based) |
| ----------- | ----- | ----------- | ----------- | --------------------------------- |

**No conflicts found.**

The documentation uses explicit scope separation:

- SHIFT_LOCK.md:21-25 explicitly states "SHIFT_LOCK governs legacy lane only; rebuild lane governance is docs/rebuild/\*"
- This prevents conflicts between legacy and rebuild governance docs

---

## 4. Reference Scan Evidence

### Scan 1: SSOT/authority/STOP rule mentions

**Command**: `rg -n "SSOT|single source of truth|authority|STOP rule" -i *.md docs/**/*.md`

**Total matches**: 50+ (limited to first 50)

**Representative hits**:

| File:Line                    | Match                                          |
| ---------------------------- | ---------------------------------------------- |
| CLAUDE.md:3                  | "**Single source of truth:** `origin/main`"    |
| AGENTS.md:5                  | "## Authority Chain"                           |
| AGENTS.md:7                  | "**Single source of truth:** `origin/main`"    |
| AGENTS.md:20                 | "## STOP Rules (LOCKED)"                       |
| SHIFT_LOCK.md:54             | "**Single Source of Truth:** `origin/main`"    |
| PROJECT_SSOT.md:1            | "# PROJECT SSOT — TCG Deal Finder"             |
| PROJECT_SSOT.md:867          | "**STOP Rule**: No further tooltip changes..." |
| PROJECT_SSOT.md:1126         | "## STOP RULES (PERMANENT)"                    |
| docs/WORKSTREAMS_MASTER.md:4 | "PROJECT_SSOT.md is the current truth"         |

### Scan 2: Tracker/quarantine/visual contract mentions

**Command**: `rg -n "REBUILD_TRACKER|TRACKER_EVIDENCE|LEGACY_QUARANTINE|VISUAL_CONTRACT" *.md docs/**/*.md`

**Total matches**: 50+

**Representative hits**:

| File:Line                            | Match                                                          |
| ------------------------------------ | -------------------------------------------------------------- |
| docs/rebuild/REBUILD_TRACKER.md:3    | "Checkboxes must match TRACKER_EVIDENCE.md"                    |
| docs/rebuild/TRACKER_EVIDENCE.md:3   | "This maps checked items in `docs/rebuild/REBUILD_TRACKER.md`" |
| docs/rebuild/CONTRACTS.md:18         | "`docs/rebuild/LEGACY_QUARANTINE.md`"                          |
| docs/rebuild/CONTRACTS.md:26         | "See docs/rebuild/VISUAL_CONTRACT.md"                          |
| docs/rebuild/ADR_LOG.md:25           | "Adopt docs/rebuild/VISUAL_CONTRACT.md"                        |
| docs/rebuild/LEGACY_QUARANTINE.md:89 | "VISUAL_CONTRACT" column in Kill List table                    |
| docs/rebuild/NON_NEGOTIABLES.md:79   | "REBUILD_TRACKER.md and TRACKER_EVIDENCE.md remain in sync"    |

### Scan 3: Release/merge/CI gate mentions

**Command**: `rg -n "RELEASE_CHECKLIST|merge|evidence packet|CI gate" -i *.md docs/**/*.md`

**Total matches**: 50+

**Representative hits**:

| File:Line                           | Match                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------- |
| CLAUDE.md:19                        | "docs/rebuild/RELEASE_CHECKLIST.md"                                       |
| CLAUDE.md:32                        | "Every coder PR response MUST include the **FULL Merge Decision Packet**" |
| SHIFT_LOCK.md:166                   | "### Merge Gates (LOCKED)"                                                |
| docs/RELEASES.md:66                 | "Required status check"                                                   |
| docs/rebuild/RELEASE_CHECKLIST.md:1 | "# Rebuild Release Checklist"                                             |
| docs/EVIDENCE_PACKET_TEMPLATE.md:1  | "# Evidence Packet Template"                                              |

### Scan 4: DB migrations mentions

**Command**: `rg -n "DB_MIGRATIONS_RUNBOOK|migration|init-db|run-migration" -i *.md docs/**/*.md`

**Total matches**: 50+

**Representative hits**:

| File:Line                        | Match                                                                    |
| -------------------------------- | ------------------------------------------------------------------------ |
| CLAUDE.md:121                    | "DB schema / migrations... → docs/DB_MIGRATIONS_RUNBOOK.md"              |
| docs/DB_MIGRATIONS_RUNBOOK.md:1  | "# Database Migrations Runbook"                                          |
| docs/DB_MIGRATIONS_RUNBOOK.md:13 | "**Path**: `migrations/`"                                                |
| docs/BACKUP_POLICY.md:53         | "**Schema source of truth**: Migration files in `migrations/` directory" |
| PROJECT_SSOT.md:66               | "Applied Neon migration `004_add_seller_blacklist_history`"              |

---

## 5. Document Inventory Summary

### Root Governance Docs (6 files)

| File                    | Purpose                                   | Status             |
| ----------------------- | ----------------------------------------- | ------------------ |
| CLAUDE.md               | Entrypoint + authority chain + PR format  | **Canonical**      |
| PROJECT_SSOT.md         | Project state, priorities, LOCKED SYSTEMS | **Canonical**      |
| SHIFT_LOCK.md           | Process gates, locks, stop rules          | **Canonical**      |
| REGRESSION_CHECKLIST.md | Smoke test checklists                     | **Canonical**      |
| AGENTS.md               | Codex adapter for CLAUDE.md rules         | **Keep (adapter)** |
| README.md               | Project introduction                      | **Keep**           |

### docs/ Active Docs (11 files)

| File                             | Purpose                  | Status           |
| -------------------------------- | ------------------------ | ---------------- |
| docs/INDEX.md                    | Documentation map        | **Keep (index)** |
| docs/WORKSTREAMS_MASTER.md       | Backlog/prioritization   | **Canonical**    |
| docs/TIER2_ARCHITECTURE.md       | Tier 2 MVP architecture  | **Canonical**    |
| docs/RELEASES.md                 | Release tagging workflow | **Canonical**    |
| docs/DB_MIGRATIONS_RUNBOOK.md    | Migration procedures     | **Canonical**    |
| docs/ENV_RUNBOOK.md              | Environment variables    | **Canonical**    |
| docs/BACKUP_POLICY.md            | Backup strategy          | **Canonical**    |
| docs/DEFINITION_OF_READY.md      | Feature planning         | **Canonical**    |
| docs/EVIDENCE_PACKET_TEMPLATE.md | Evidence gate template   | **Canonical**    |
| docs/CLEANUP_INVENTORY.md        | Cleanup candidates       | **Active**       |
| docs/market-policy.md            | Multi-market ingestion   | **Reference**    |
| docs/surfaces.md                 | Feature surface map      | **Reference**    |

### docs/ui/ (2 files)

| File                               | Purpose                 | Status                 |
| ---------------------------------- | ----------------------- | ---------------------- |
| docs/ui/UI_CONSISTENCY_CONTRACT.md | Legacy tooltip contract | **Canonical (legacy)** |
| docs/ui/TOOLTIP_INVENTORY.md       | Tooltip audit           | **Reference**          |

### docs/rebuild/ Binder (10 files)

| File                              | Purpose                   | Status        |
| --------------------------------- | ------------------------- | ------------- |
| docs/rebuild/PRD_LITE.md          | Product promise           | **Canonical** |
| docs/rebuild/TRUST_METRICS.md     | Trust scoring SLOs        | **Canonical** |
| docs/rebuild/NON_NEGOTIABLES.md   | Rebuild fail-hard gates   | **Canonical** |
| docs/rebuild/CONTRACTS.md         | Rebuild contracts         | **Canonical** |
| docs/rebuild/VISUAL_CONTRACT.md   | Phase-1 visual contract   | **Canonical** |
| docs/rebuild/RELEASE_CHECKLIST.md | Rebuild release checklist | **Canonical** |
| docs/rebuild/ADR_LOG.md           | Architecture decisions    | **Canonical** |
| docs/rebuild/REBUILD_TRACKER.md   | Checkbox tracker          | **Canonical** |
| docs/rebuild/TRACKER_EVIDENCE.md  | Evidence map              | **Canonical** |
| docs/rebuild/LEGACY_QUARANTINE.md | Legacy isolation SSOT     | **Canonical** |

### docs/archive/\*\* (40+ files)

All files under `docs/archive/` are already archived for historical reference. See `docs/archive/README.md` for index.

**Subdirectories**:

- `docs/archive/audits/` — Closed audit artifacts
- `docs/archive/design/` — Design audit and phases
- `docs/archive/plan/` — Implementation plans
- `docs/archive/rebaseline/` — REBASELINE v1 artifacts
- `docs/archive/db/` — Database index audit
- `docs/archive/incidents/` — Incident reports

---

## 6. What to Do Next (Proposal Only)

### Proposed Actions (NOT executed in this audit)

1. **PROJECT_SSOT.md**: Consider extracting historical "Ops / Maintenance" notes (lines 62-108) to a separate archive file to reduce SSOT size

2. **Repo Sync Proof duplication**: The git command sequence appears in 3 places (CLAUDE.md, AGENTS.md, SHIFT_LOCK.md). This is intentional for standalone readability — **no action needed**

3. **docs/archive/rebaseline/**: Already archived. No further action needed

4. **docs/rebuild/ Binder**: Complete and well-organized. No redundancy found

5. **AGENTS.md**: Intentional adapter for Codex. Duplication with CLAUDE.md is by design — **Keep as-is**

6. **UI contracts**: UI_CONSISTENCY_CONTRACT.md (legacy) and VISUAL_CONTRACT.md (rebuild) are scope-separated — **Keep both**

7. **Release docs**: RELEASES.md (general) and RELEASE_CHECKLIST.md (rebuild-specific with runbooks) serve different purposes — **Keep both**

### Documentation Health Summary

| Metric                | Value               |
| --------------------- | ------------------- |
| Root governance docs  | 6                   |
| Active docs/ files    | 13                  |
| Rebuild binder files  | 10                  |
| Archived files        | 40+                 |
| Conflicts found       | 0                   |
| Redundant clusters    | 7 (all intentional) |
| Recommended deletions | 0                   |

**Conclusion**: The documentation structure is intentionally layered with clear scope separation between legacy and rebuild lanes. The apparent duplication (authority chain, merge packets, repo sync proof) is by design for standalone readability in different contexts. No conflicting instructions were found.

---

## Repo Sync Proof (LOCKED)

```
T:/Projects/tcg-deal-finder
origin  https://github.com/JawnShoe/tcgdealfinder.git (fetch)
origin  https://github.com/JawnShoe/tcgdealfinder.git (push)
## main...origin/main
ad9e7ee14ecd6d38ec3635b81d85c278b8cfe051
ad9e7ee14ecd6d38ec3635b81d85c278b8cfe051
```

---

**Audit completed by**: Claude Code
**Files changed**: 1 (this audit artifact only)
