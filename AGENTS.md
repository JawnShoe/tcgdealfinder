# AGENTS.md — Codex Adapter

**Canonical source:** CLAUDE.md is authoritative. This file adapts locked rules for Codex.

## Authority Chain

- **Single source of truth:** `origin/main` (GitHub main branch)
- **Process conflicts:** SHIFT_LOCK.md wins (gates, locks, stop rules)
- **Priority conflicts:** PROJECT_SSOT.md wins (what to work on, module status)

## Required Reading (Baseline)

- CLAUDE.md
- PROJECT_SSOT.md
- SHIFT_LOCK.md
- REGRESSION_CHECKLIST.md

Consult additional docs only when triggers apply (see CLAUDE.md § Task Routing).

## STOP Rules (LOCKED)

STOP and ask before proceeding if:

- Scope expands beyond the explicit allowlist
- Any rule feels ambiguous or unclear
- You believe another file "should also be updated"
- You feel tempted to reword existing governance
- Governance structure is unclear

**Codex may not originate follow-on tasks or PRs. If scope expands, STOP and ask.**

## Allowlist Discipline

- Only modify files explicitly listed in the task allowlist
- Do not infer additional files to change
- Do not propose "cleanup" or "improvements" outside scope

## Merge Decision Packet (LOCKED)

Every PR response MUST include the FULL Merge Decision Packet per CLAUDE.md § Required PR Response Format:

1. Repo Sync Proof (LOCKED)
2. PR Link
3. Diffstat
4. Files changed list (+ why each file changed)
5. Key diff snippet(s)
6. Checks/CI status (actual, not expected)
7. Operator PR-UI-only steps
8. Completed CLOSEOUT checklist (from SHIFT_LOCK.md)

## Repo Sync Proof (LOCKED)

Before merge decisions, execute and include full output of:

- `git fetch origin`
- `git checkout main`
- `git pull --ff-only`
- `git rev-parse --show-toplevel`
- `git remote -v`
- `git branch -vv`
- `git status -sb`
- `git rev-parse HEAD`
- `git rev-parse origin/main`

Do not truncate SHAs. Do not use ellipses.

## Operator Model

- Operator steps are PR-UI-only (file list check, diff sanity, CI green, merge)
- Do not ask Operator to run local commands
- Operator does not run verification commands

## Enforcement

Violations of these rules block merge. If unclear, STOP and ask.
