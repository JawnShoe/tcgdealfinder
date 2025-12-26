# Audit Artifact (Temporary)

**Phase**: 2 — Docs & Process Audit
**Created**: 2025-12-26
**Collapses into**: PROJECT_SSOT.md + docs/INDEX.md
**Delete/Archive after**: Full Audit Closeout

---

# Phase 1 Open Risks Resolution

This document resolves or makes explicit decisions for the 3 open risks identified in Phase 1.

---

## Risk 1: `docs/audit/EXPERT_AUDIT_2025-12-25.md` Untracked

### Investigation

```
File exists: docs/audit/EXPERT_AUDIT_2025-12-25.md (29709 bytes)
Git history: No commits found for this file
Status: Untracked (local-only)
```

### File Contents (Summary)

The file is a comprehensive expert audit report dated 2025-12-25 containing:

- Executive summary (7.5/10 score)
- Top 10 issues ranked by risk/ROI
- N+1 query patterns, missing indexes, security observations
- References to PROJECT_SSOT.md and SHIFT_LOCK.md

### Decision: **COMMIT to `docs/audit/`**

**Rationale**:

1. The file contains valuable audit findings that should be preserved
2. It references project governance docs (SSOT, SHIFT_LOCK)
3. It's a one-time audit artifact, appropriate for `docs/audit/`
4. The 2025-12-25 date aligns with the current audit period

**Action**: Include in Phase 2 commit as `docs/audit/EXPERT_AUDIT_2025-12-25.md`

**Links to update**: None required (file is self-contained)

---

## Risk 2: Vercel Deployment Not Explicitly Confirmed

### Investigation

Checked for Vercel configuration:

| Check                     | Result                                                             |
| ------------------------- | ------------------------------------------------------------------ |
| `vercel.json`             | Not present                                                        |
| `next.config.mjs`         | Present, no Vercel-specific settings                               |
| `package.json` references | No "vercel" keyword                                                |
| `.github/workflows/*`     | No Vercel deployment workflow                                      |
| `docs/` references        | `docs/ENV_RUNBOOK.md` mentions "Vercel, Netlify, etc." generically |

### Conclusion

**Status**: Ops-confirm required; not provable from code

The codebase is **Vercel-compatible** (Next.js 14, edge runtime) but there is no:

- Explicit Vercel configuration
- Vercel deployment workflow
- Vercel-specific environment variables

**The deployment platform is not determinable from the repository alone.**

### Decision: **MARK AS "OPS-CONFIRM REQUIRED"**

**Rationale**:

1. Deployment configuration is typically managed outside the repo
2. The code is platform-agnostic (works with Vercel, Netlify, self-hosted)
3. This is not a risk — just an unknown that the operator can confirm

**Action**: No code changes. Operator should confirm deployment platform if documentation is needed.

**Note for SSOT**: If operator confirms Vercel, add a line to PROJECT_SSOT.md:

```markdown
**Deployment**: Vercel (confirmed by operator on YYYY-MM-DD)
```

---

## Risk 3: `check-alerts` Job Disabled

### Investigation

Location: `.github/workflows/data-pipelines.yml`

```yaml
check-alerts:
  name: Check Alerts
  runs-on: ubuntu-latest
  # Manual dispatch only until SENDGRID_API_KEY is configured.
  # Once email alerts are ready, restore scheduled runs by adding:
  #   github.event.schedule == '*/15 * * * *' ||
  if: >-
    github.event_name == 'workflow_dispatch' &&
    (github.event.inputs.job == 'check-alerts' || github.event.inputs.job == 'all')
```

The schedule trigger (`*/15 * * * *`) is commented out. The job only runs on manual dispatch.

### SSOT Reference

From `docs/ENV_RUNBOOK.md` (lines 131-145):

> **Step 4: Enable Scheduled Alerts (Optional)**
>
> After E2E test passes (you received the email), to enable scheduled alert checks:
>
> 1. Edit `.github/workflows/data-pipelines.yml`
> 2. In the `check-alerts` job `if:` condition, add the schedule trigger
>    ...
>    **Note**: Keep scheduled alerts disabled until email infrastructure is fully tested to prevent noisy failures.

### Decision: **INTENTIONAL PENDING CONFIG — NO ACTION**

**Rationale**:

1. The comment explicitly says "until SENDGRID_API_KEY is configured"
2. ENV_RUNBOOK.md documents the enablement procedure
3. This is intentional defensive behavior — alerts shouldn't fire until email is set up
4. SSOT notes this in the "Critical Gap" section of the 2024-12-24 audit

**Action**: No changes. This is correctly disabled until operator completes email setup.

**Status**: Intentional pending config. Documented in ENV_RUNBOOK.md Step 4.

---

## Summary

| Risk                   | Resolution                 | Action Required         |
| ---------------------- | -------------------------- | ----------------------- |
| EXPERT_AUDIT untracked | Commit to `docs/audit/`    | Yes (in Phase 2 PR)     |
| Vercel not confirmed   | Ops-confirm required       | No (operator knowledge) |
| check-alerts disabled  | Intentional pending config | No (correctly disabled) |

---

**Open Risks Status**: All 3 risks resolved or triaged. No blockers for Phase 2 completion.
