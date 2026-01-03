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
git checkout <your-feature-branch>
git branch -vv
git status -sb
git rev-parse HEAD
git rev-parse origin/main
```

---

## 2. PR Link

Paste the full GitHub PR URL.

---

## 3. Diffstat

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

Include the critical diff sections. For small files, include the entire file:

```bash
git diff origin/main...HEAD -- <file>
```

---

## 6. Checks/CI Status

```bash
gh pr checks <pr-number>
```

Paste actual GitHub checks status here.

---

## 7. Operator PR-UI-only Steps

List Operator UI-only steps here. Operator does NOT run local commands.

---

## 8. Closeout Checklist

Paste completed CLOSEOUT checklist from SHIFT_LOCK.md here.
