---
description: Generate a complete Merge Decision Packet for PR review
---

# Merge Decision Packet Generator

Generate a **complete Merge Decision Packet** as required by CLAUDE.md.

---

## 1. Repo Sync Proof (LOCKED)

Run these commands and include **full outputs** (no ellipses, no truncated SHAs):

```bash
git fetch origin
git checkout main
git pull --ff-only
git rev-parse --show-toplevel
git remote -v
git branch -vv
git status -sb
git rev-parse HEAD
git rev-parse origin/main
```

---

## 2. PR Link

Provide the full GitHub PR URL.

---

## 3. Diffstat

Run and include full output:

```bash
git diff --stat origin/main...HEAD
```

---

## 4. Files Changed List

Run and include full output, with a brief explanation of why each file changed:

```bash
git diff --name-only origin/main...HEAD
```

---

## 5. Key Diff Snippet(s)

Include the critical diff sections. For small files, include the entire file. Use:

```bash
git diff origin/main...HEAD -- <file>
```

---

## 6. Checks/CI Status

Report the **actual** GitHub CI status (not "expected"). Use:

```bash
gh pr checks
```

Or check the PR page directly for status.

---

## 7. Operator PR-UI-only Steps

List the steps the Operator must perform **in the GitHub PR UI only**:

1. Review file list in PR
2. Sanity-check the diff
3. Confirm CI is green
4. Merge the PR

(Operator does NOT run local commands.)

---

## 8. Closeout Checklist

Include the completed CLOSEOUT checklist from [SHIFT_LOCK.md](../SHIFT_LOCK.md).

---

**Reminder:** Every PR response MUST include this full packet. Partial packets are a documented mistake to avoid.
