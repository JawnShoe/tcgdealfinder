# Merge Decision Packet Generator

Generate a **complete Merge Decision Packet** as required by CLAUDE.md.

---

## 1. Repo Sync Proof (LOCKED)

Run these commands and include **full outputs** (no ellipses, no truncated SHAs):

```bash
git fetch origin
```

```bash
git checkout main
```

```bash
git pull --ff-only
```

```bash
git rev-parse --show-toplevel
```

```bash
git remote -v
```

```bash
git checkout <your-feature-branch>
```

```bash
git branch -vv
```

```bash
git status -sb
```

```bash
git rev-parse HEAD
```

```bash
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

Report the **actual** GitHub CI status (not "expected"):

```bash
gh pr checks <pr-number>
```

---

## 7. Operator PR-UI-only Steps

List the steps the Operator must perform **in the GitHub PR UI only**. Operator does NOT run local commands.

---

## 8. Closeout Checklist

Include the completed CLOSEOUT checklist from SHIFT_LOCK.md.
