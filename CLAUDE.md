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
