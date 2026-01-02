## SHIFT LOCK — 2025-12-18

**SSOT:** [PROJECT_SSOT.md](PROJECT_SSOT.md) (authoritative project state)
**Verification:** [REGRESSION_CHECKLIST.md](REGRESSION_CHECKLIST.md)
**Doc Index:** [docs/INDEX.md](docs/INDEX.md)

### Current Locks

- Watchlist v1 is client-only/localStorage; ⭐ renders on homepage table, `/newest`, `/top-deals`, featured deals, and card detail listings. No backend/ingestion/scoring work exists for watchlist.
- Seller trust layout is fixed: seller name + shield on line one and a muted `⭐ X+ sales` line two (sales badge only when feedback ≥ 100).
- Top Deals columns intentionally stay lean (Card, Total, Historic, Discount, Seller, Market, Ends). Hidden columns still exist in data but remain off UI.
- Global UI scale baseline already increased (~8–10%) via global CSS; treat this as the new reference.
- Pokémon set ingestion flows through the Pokémon TCG API v2 with idempotent upserts keyed by canonical set id (series, release date, total cards, symbol/logo).

### Stop Rules

- Do **not** touch ingestion, scoring, canonical IDs, overrides, or deal query logic.
- Do **not** refactor table/deal components; wrap existing content with the existing shared layout/container.
- Keep scope limited to layout/spacing parity; no new features, no redesigns.

### DONE Gate (LOCKED)

- SSOT cannot mark DONE unless: commit hash recorded, `git status` clean, changes pushed, `npm run lint` pass, `npm run build` pass, and regression checklist completed.

### SHIFT Gate (LOCKED)

- Shift change cannot proceed without a restore point (zip and/or bundle) and dirty-file classification.
- Explicit bans: no stash-as-backup, no delete/clean commands.

### Secret Hygiene (LOCKED)

- No secrets in tracked files (configs, docs, samples).
- Evidence Packet or CI must include a secret scan check.

### Pre-commit Formatting Gate (LOCKED)

- Husky pre-commit runs: `npm run format:staged` (lint-staged → prettier --write on staged files) then `npm run lint`
- CI remains the final arbiter: "Check formatting (changed files only)" must be green
- Baseline remains unformatted; enforcement is incremental on changed files only

### CI Budget Optimization (LOCKED)

- **Docs-only changes**: CI SHALL skip heavy jobs where safe (use `paths-ignore` and/or conditional jobs) and route to a lightweight workflow/job.
- **No redundant builds**: `npm run build` SHALL NOT run more than once per workflow run for a given commit.
- **Caching**: CI SHALL use caching where applicable (npm cache and Next.js cache such as `.next/cache`) to reduce run time and minutes.
- **Concurrency**: CI SHALL cancel superseded PR runs (use GitHub Actions `concurrency` with `cancel-in-progress: true`).
- **Required checks**: Required status checks SHALL be minimal for docs-only PRs (or satisfied via a lighter workflow/job for docs-only diffs).

**How to verify CI burn is reduced**

- Open Actions → verify a docs-only PR triggers only the lightweight docs job (no lint/test/build) and still satisfies required checks.
- Open Actions → verify that pushing multiple commits to the same PR cancels older runs (only the latest is in-progress).
- Inspect workflow logs → confirm cache restore hits for npm and `.next/cache` on subsequent runs.
- Compare repo Actions usage (minutes) week-over-week after the change lands.

### Post-Merge Tooling Sync (LOCKED)

After merging any PR that changes tooling/process (CI workflows, package.json scripts, Husky hooks, Prettier behavior, test scripts/classification, secret hygiene):

1. Open PROJECT_SSOT.md and confirm the merged PR number is recorded with PR # and merge commit hash (if applicable).
2. Open SHIFT_LOCK.md and confirm the relevant gate/behavior is documented (search keywords: pre-commit, prettier, lint-staged, ci, test:unit, test:integration, secret hygiene).
3. If either doc is missing the change:
   - Immediately create a docs-only PR that updates the missing doc(s)
   - Do not start a new workstream until that docs PR is merged (CI green)

### Tier-1 Evidence Gate (NEW)

- Tier-1 issues (pricing totals, shipping, dedup integrity, seller trust UI, watchlist persistence, best/featured deal numbers) may not receive a “NO FIX REQUIRED” verdict unless an Evidence Packet is attached.
- Missing or partial evidence must be called out as: `INSUFFICIENT EVIDENCE — NEED DB/UI TRACE`.
- **Evidence Packet** must include: (A) DB query + row values for the specific IDs, (B) two same-surface samples, (C) UI path + exact field rendered, (D) single-sentence call (“DB wrong” or “UI wrong”), (E) if a fix exists: minimal diff summary + verification IDs + lint/build status.
- **Shift handoff checklist for open Tier-1 bugs**: state current hypothesis, attach the evidence gathered so far, note what's ruled out, and list the next step plus acceptance criteria.
- **Seller identity data sources**: Always document whether evidence references buyer Browse APIs or legacy/decommissioned Shopping API data before opening or closing a Tier-1 seller-identity issue.

### Global / Shared UI Token Evidence Gate (LOCKED)

Any change that touches shared UI primitives or global styling (examples: `app/globals.css`, shared tooltip tokens/classes, shared components used across multiple pages) is HIGH blast radius.

MERGE IS FORBIDDEN unless the PR includes an Evidence Packet with:

1. Inventory: repo-wide usage list (paths) for the affected token/component (ripgrep results + summarized file list).
2. Route Matrix: which routes/surfaces are affected.
3. Operator Visual Matrix: required checks across representative cases (at minimum: short tooltip, long help tooltip, “Seen on” badge tooltip, and card-name tooltip under card set) on at least 2 routes (e.g., `/top-deals` + a `/cards/*` page).

If blast radius is unknown or inventory is incomplete: STOP.

### Operator Load Minimization Gate (LOCKED)

Before requesting any Operator action, the Coder must confirm:

- Investigation is complete
- Root cause is identified
- Evidence is prepared and summarized
- Operator action is strictly required (cannot be completed by the Coder)

If these conditions are not met, Operator involvement is a **process violation**.

This gate is LOCKED and applies to all handoffs, PRs, audits, and investigations.

### Operator Instruction Clarity Gate (LOCKED)

Before involving the Operator, confirm:

- Operator steps are explicitly written
- Steps are minimal and mechanical
- No investigation or judgment is required
- Operator responsibility is clearly separated from Coder work

Failure to provide explicit Operator instructions is a handoff failure.

### Operator Command Policy (LOCKED)

- Operator does NOT run local commands for verification.
- Operator verification is: file list check + diff sanity check + CI green + any required UI visual check.
- Manual "run these commands" steps are Coder-only verification; Operator is not expected to execute them.

### Safety Gate Test Requirement (LOCKED)

If a PR introduces or changes a safety gate (confirm flags, kill-switch, destructive guard, rate-limit guard, environment-based blocking), the PR MUST include CI-enforced tests for the gate logic.

Exemptions:

- If testing the gate requires production-only resources (real DB, real API keys), the PR may include manual verification steps instead, but must document why CI testing is not feasible.
- Exemption must be explicitly stated in the PR description with a reason.
- **EXEMPT unlock path**: PR body must include `EXEMPT: <reason>` AND link evidence (test plan, logs, or rationale). Operator may merge only if exemption is explicit and evidence is present.

Default: Tests are required. Manual steps are optional Coder-only supplements.

### Merge Gates (LOCKED)

**Gate 1 — Coder Response Format (LOCKED)**

- Every coder PR response must include: Evidence Packet + Verification + full CLOSEOUT checklist.
- If missing, coder must repost in correct format before merge.

**Gate 2 — Operator Merge Rule (LOCKED)**

- Operator merges only if: (a) PR file list matches allowlist, (b) checks are green, (c) Closeout is complete.
- Operator steps are PR UI only (no local commands).

**Gate 3 — Decision Attachments (LOCKED)**

- If your message asks for a merge/decision that depends on SSOT/SHIFT_LOCK/REGRESSION_CHECKLIST or module docs, Operator must attach the latest from main when posting the coder response:
  - PROJECT_SSOT.md
  - SHIFT_LOCK.md
  - REGRESSION_CHECKLIST.md
  - Plus any touched module docs

Exception (SSOT PRs):

- If the PR being reviewed modifies PROJECT_SSOT.md, Operator cannot attach the post-merge SSOT yet.
- For merge decisions on SSOT PRs, Operator must instead paste the exact "Files changed" diff snippet for the SSOT lines being modified (before and after), plus:
  - diffstat
  - files touched allowlist confirmation (PROJECT_SSOT.md only)
  - CI status (green)
  - completed Closeout checklist
- Merge is allowed if allowlist is SSOT-only, checks are green, and Closeout is complete.

### PR Closeout Checklist (LOCKED)

Every coder PR response must include a CLOSEOUT section answering all items:

1. **Scope/Allowlist**: Confirm only intended files changed; list files.
2. **Rebaseline gating**: PR title/prefix includes "REBASELINE" (during rebaseline) OR PR has REBASELINE label.
3. **SSOT hygiene**: If this PR completes a module or changes process, update PROJECT_SSOT.md with module status + PR # + doc link (or state "N/A").

   Default (module completion PRs):
   - If a PR completes a module, it MUST include both:
     - the module doc (docs/rebaseline/modules/Mxx\_\*.md)
     - the SSOT progress line update in PROJECT_SSOT.md
       in the SAME PR (single PR per module).

   Exception (recovery only):
   - A follow-up SSOT-only PR is allowed only if the module PR was already merged without the SSOT line, or if the PR was explicitly scoped to SSOT-only hygiene.

4. **SHIFT_LOCK hygiene**: If this PR adds/changes a rule/gate, confirm: scope + why + acceptance criteria + unlock/EXEMPT path exist (or state "N/A").
5. **Deferred items**: Any "later" follow-ups are recorded in the relevant module doc under "Deferred" (or state "None").
6. **Open PR hygiene**: No stray non-rebaseline PRs left open (or list them).
7. **Operator simplicity**: Operator steps are PR UI only (file list + green checks + merge); no local commands.
8. **Verification**: Prettier ran + lint/test:unit/build status reported (or "docs-only: CI green").
9. **Secrets hygiene**: Confirm no secrets printed/committed; mention secret scan if relevant.
10. **CI budget**: Confirm PR is minimal and avoids unnecessary CI churn.

Operator merges only when Closeout is complete and checks are green.

### Docs Rollup Cadence (LOCKED)

**Purpose**: keep PROJECT_SSOT.md and docs/INDEX.md in sync during rapid development.

**Trigger**: After any rapid sequence of merges (3+ PRs in a work session) OR at end of a work session/day where meaningful work merged.

**Required rollup actions** (docs-only PR is OK):

1. Update PROJECT_SSOT.md "Last Updated".
2. Add or extend a short "Recent progress" bullet list under the ACTIVE WORK section (include merged PR numbers + one-line summaries).
3. Update docs/INDEX.md "Last Updated" and add any new docs created (or links to the relevant doc).

**Applies to ALL workstreams** (not Tier 2 only). Tier 2 is an example, not a special case.

**Exception**: If a single implementation PR already updates SSOT/INDEX appropriately, a separate rollup PR is not required.
