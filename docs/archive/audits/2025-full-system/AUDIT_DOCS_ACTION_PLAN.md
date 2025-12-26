> **Archived after Full System Audit closeout (2025-12-26)**

# Audit Artifact (Archived)

**Phase**: 2 — Docs & Process Audit
**Created**: 2025-12-26
**Archived**: 2025-12-26

---

# Documentation Reduction Action Plan

This plan addresses the boss question: "Why so many .md files? What can be cleaned up?"

**Key Finding**: The docs are already well-organized. The 32 files break down as:

- 10 authoritative (required)
- 5 active reference (helpful)
- 14 historical (already archived)
- 3+ audit evidence (temporary)

**Recommendation**: No major restructuring needed. Minor actions below.

---

## Target End-State Folder Structure

The current structure is already correct. No changes needed:

```
/                           # Root (core governance)
├── PROJECT_SSOT.md         # Single source of truth
├── SHIFT_LOCK.md           # Process gates
├── REGRESSION_CHECKLIST.md # Release testing
└── README.md               # Project intro

docs/                       # Active documentation
├── INDEX.md                # Doc map
├── BACKUP_POLICY.md        # Ops runbook
├── DB_MIGRATIONS_RUNBOOK.md # Ops runbook
├── DEFINITION_OF_READY.md  # Process template
├── ENV_RUNBOOK.md          # Ops runbook
├── EVIDENCE_PACKET_TEMPLATE.md # Process template
├── market-policy.md        # Domain reference
├── RELEASES.md             # Ops runbook
├── surfaces.md             # Domain reference
├── ui/                     # UI governance
│   └── UI_CONSISTENCY_CONTRACT.md
├── audit/                  # Audit evidence (temporary)
│   ├── DB_ARCHITECTURE_EVIDENCE.md
│   ├── EXPERT_AUDIT_2025-12-25.md (to commit)
│   └── _full-system-2025/  # Current audit
└── archive/                # Historical (no action)
    └── (14 files)

scripts/                    # Colocated docs
├── one-off/README.md       # Script usage
└── migrations/archive/README.md
```

---

## Proposed Moves

**None required.**

The current structure already follows best practices:

- Authoritative docs at root or docs/
- Historical docs in docs/archive/
- Audit evidence in docs/audit/
- Colocated READMEs with scripts

---

## Proposed Merges

**None required.**

No duplicate content identified. Each doc serves a distinct purpose.

---

## Proposed Deletions

**None proposed for Phase 2.**

All 32 files are either:

- **Authoritative/Active**: Required for operations
- **Archived**: Already in docs/archive/ where they belong
- **Audit evidence**: Temporary but currently needed

**If operator requests aggressive cleanup in Phase 2B**, these candidates could be considered:

| File                              | Reason to Keep        | Reason to Delete  | Verdict        |
| --------------------------------- | --------------------- | ----------------- | -------------- |
| `docs/archive/baseline-README.md` | Git history reference | Empty placeholder | Keep (no harm) |

**Note**: All archived files are historical records. Deleting them removes project history context. Recommend keeping unless storage is a concern (it's not — total is <1MB).

---

## Immediate Actions (Phase 2)

### Action 1: Commit EXPERT_AUDIT_2025-12-25.md

The file exists locally but is untracked. It contains valuable audit findings.

**Decision**: Commit it to `docs/audit/` as audit evidence.

**Links to update**: None (file is self-contained).

### Action 2: Update docs/INDEX.md (Optional)

Add a reference to the Phase audit folder:

```markdown
## Current Audit

Active audit in progress: [docs/audit/\_full-system-2025/](audit/_full-system-2025/)
```

**Status**: Optional. Not blocking.

---

## Boss-Facing Summary (5 bullets max)

1. **Authoritative docs (10)**: PROJECT_SSOT, SHIFT_LOCK, REGRESSION_CHECKLIST, INDEX, runbooks (BACKUP_POLICY, DB_MIGRATIONS, ENV_RUNBOOK, RELEASES, EVIDENCE_PACKET_TEMPLATE), UI_CONSISTENCY_CONTRACT — all required for daily ops

2. **14 files are already archived**: All historical implementation records are in `docs/archive/` where they belong — no action needed

3. **5 reference docs are helpful but optional**: README, DEFINITION_OF_READY, market-policy, surfaces, scripts READMEs — keep for context

4. **No deletions recommended**: Every file serves a purpose; archive structure already handles historical clutter

5. **Cognitive load is already minimized**: `docs/INDEX.md` maps everything; operators only need to know SSOT + INDEX

---

## Why This Reduces Cognitive Load

The current structure already achieves minimal cognitive load:

| Need                       | Solution            |
| -------------------------- | ------------------- |
| "Where is project status?" | PROJECT_SSOT.md     |
| "What are the rules?"      | SHIFT_LOCK.md       |
| "Where's the doc map?"     | docs/INDEX.md       |
| "Where's the old stuff?"   | docs/archive/       |
| "What env vars do I need?" | docs/ENV_RUNBOOK.md |

**No restructuring needed.** The 32 files feel like "many" only because git counts everything — including the 14 archived historical records that are intentionally preserved for audit trail.

---

**Action Plan Status**: Complete. No major changes required. Minor actions documented.
