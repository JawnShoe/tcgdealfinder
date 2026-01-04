# CLAUDE.md — Start Here

**Single source of truth:** `origin/main` (GitHub main branch). Local files are not authoritative.

## Canonical Docs

| Doc                                                | Purpose                                  |
| -------------------------------------------------- | ---------------------------------------- |
| [PROJECT_SSOT.md](PROJECT_SSOT.md)                 | Project state, priorities, module status |
| [SHIFT_LOCK.md](SHIFT_LOCK.md)                     | Process gates, locks, stop rules         |
| [REGRESSION_CHECKLIST.md](REGRESSION_CHECKLIST.md) | Smoke test checklists per feature area   |

**Conflict resolution:**

- **Process conflicts:** SHIFT_LOCK.md wins (gates, locks, stop rules)
- **Priority conflicts:** PROJECT_SSOT.md wins (what to work on, module status)

## Required PR Response Format

Every coder PR response MUST include the **FULL Merge Decision Packet**:

1. **Repo Sync Proof (LOCKED)** — output of:
   - `git fetch origin`
   - `git checkout main`
   - `git pull --ff-only`
   - `git rev-parse --show-toplevel`
   - `git remote -v`
   - `git branch -vv`
   - `git status -sb`
   - `git rev-parse HEAD`
   - `git rev-parse origin/main`

   Use full outputs (no ellipses). Do not truncate SHAs.

2. **PR link**

3. **diffstat**

4. **Files changed list** (+ why each file changed)

5. **Key diff snippet(s)** (or entire file if small)

6. **Checks/CI status** (actual status from GitHub, not "expected")

7. **Operator PR-UI-only steps** (file list check, diff sanity, CI green, merge)

8. **Completed CLOSEOUT checklist** (from SHIFT_LOCK.md)

## Common Mistakes to Avoid (append-only)

1. Treating local files as authoritative without syncing to `origin/main`
2. Skipping Repo Sync Proof in Evidence Packets
3. Forgetting to run `git fetch origin` before making merge decisions
4. Providing partial Evidence Packets (missing diffstat, CI status, or Closeout)
5. Asking Operator to run local commands (Operator steps are PR UI only)

## Background Verification Sessions (LOCKED)

**Purpose**: Periodic audit to confirm the Claude framework (entrypoint, process gates, evidence packets, operator handoff) is working as documented and identify any drift.

**Checklist** (max 10 items):

1. Sync to `origin/main` and read CLAUDE.md, SHIFT_LOCK.md, PROJECT_SSOT.md, REGRESSION_CHECKLIST.md
2. Confirm CLAUDE.md states single source of truth and conflict resolution rules
3. Confirm SHIFT_LOCK.md documents all active gates (Repo Sync Proof, Merge Gates, Closeout Checklist, etc.)
4. Spot-check 2–3 recent merged PRs for Evidence Packet compliance (Repo Sync Proof, diffstat, files list, CI status, operator steps, closeout)
5. Confirm Operator steps are PR-UI-only (no local commands required)
6. Note any ambiguity or drift found (e.g., inventory docs misread as action queues)
7. Record gaps found (or "None")
8. Record follow-ups needed (or "None")
9. Update this section with session date and result
10. Add a single "Recent progress" bullet to PROJECT_SSOT.md noting the session

**Most recent session**:

| Field      | Value                                                                                                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date       | 2026-01-03                                                                                                                                                                                            |
| Scope      | Entrypoint + authority chain, Evidence Packet compliance, STOP rules + gates, session closure                                                                                                         |
| Result     | **PASS**                                                                                                                                                                                              |
| Gaps       | PR bodies in GitHub contain Evidence Packets but abbreviated (full packets in coder chat); PR #194/#195/#196 bodies lack explicit Repo Sync Proof section (packets were in conversation, not PR body) |
| Follow-ups | Consider adding guidance that PR body should include Repo Sync Proof excerpt or link to conversation                                                                                                  |

## Task Routing: Required Reference Docs (LOCKED)

**Baseline** (always consult):

- PROJECT_SSOT.md
- SHIFT_LOCK.md
- REGRESSION_CHECKLIST.md
- docs/INDEX.md (map only; not required reading)

**Trigger → Required doc**:

- Tier 2 / P2.x performance work (N+1, batching, query count) → docs/TIER2_ARCHITECTURE.md
- DB schema / migrations / Prisma / indexes / backfills → docs/DB_MIGRATIONS_RUNBOOK.md
- Release / deploy / tagging / versioning → docs/RELEASES.md
- Env vars / ops configuration → docs/ENV_RUNBOOK.md
- "Start work" / readiness / gating questions → docs/DEFINITION_OF_READY.md
- Shared / global UI behavior changes → docs/ui/UI_CONSISTENCY_CONTRACT.md

Coders are only required to consult additional documents when a trigger applies or when explicitly referenced in the task prompt.
