---
allowed-tools: Bash(git fetch:*), Bash(git checkout:*), Bash(git pull:*), Bash(git rev-parse:*), Bash(git remote:*), Bash(git branch:*), Bash(git status:*), Bash(git diff:*), Bash(gh pr checks:*)
argument-hint: <branch-name> <pr-number>
description: Generate a complete Merge Decision Packet with Repo Sync Proof
---

Generate a **complete Merge Decision Packet** as required by CLAUDE.md.

Use branch name: $1
Use PR number: $2

---

## 1. Repo Sync Proof (LOCKED)

Execute and include full outputs (no ellipses, no truncated SHAs):

**Sync main:**
!`git fetch origin`
!`git checkout main`
!`git pull --ff-only`

**Repo info:**
!`git rev-parse --show-toplevel`
!`git remote -v`

**Switch to feature branch and verify:**
!`git checkout $1`
!`git branch -vv | grep -E "^\*|main "`
!`git status -sb`
!`git rev-parse HEAD`
!`git rev-parse origin/main`

---

## 2. PR Link

Paste full PR URL here: `https://github.com/<owner>/<repo>/pull/$2`

---

## 3. Diffstat

!`git diff --stat origin/main...HEAD`

---

## 4. Files Changed List

!`git diff --name-only origin/main...HEAD`

Provide a brief explanation of why each file changed.

---

## 5. Key Diff Snippet(s)

!`git diff origin/main...HEAD`

For large diffs, summarize and include critical sections only.

---

## 6. Checks/CI Status

!`gh pr checks $2`

---

## 7. Operator PR-UI-only Steps

List Operator UI-only steps here. Operator does NOT run local commands.

---

## 8. Closeout Checklist

Paste completed CLOSEOUT checklist from SHIFT_LOCK.md here.
