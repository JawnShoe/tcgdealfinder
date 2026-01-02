# WORKSTREAMS MASTER

Status: Active (Backlog + prioritization index)  
Canonical rule: `PROJECT_SSOT.md` is the current truth; `docs/WORKSTREAMS_MASTER.md` is the canonical backlog/prioritization list; audits/plans are appendices.  
Last reviewed: 2025-12-29  
Notes: If any doc conflicts with SSOT, SSOT wins. Do not execute advisory docs without an SSOT/workstreams entry.
Note: Any global UI token / tooltip system rework must satisfy SHIFT_LOCK’s Global / Shared UI Token Evidence Gate.

---

## Purpose + Canonical Rule

- `PROJECT_SSOT.md` is the authoritative, current truth (including exactly one **ACTIVE WORK** item).
- `docs/WORKSTREAMS_MASTER.md` is the canonical prioritized backlog (dependencies, gates, acceptance criteria).
- Audit/plan/design docs are appendices; they are not executable unless SSOT/workstreams explicitly marks them Active.

---

## Active Work Item (must match SSOT)

P2.1 — Health job status + go-live schedule gate

---

## Workstreams — Priority Order (Risk / Blockers / Safety)

### P0 — Security / Safety (ship-blockers)

#### P0.1 SQL Parameterization Hardening

- Objective: Eliminate SQL injection risk in all raw/templated SQL usage.
- Dependencies: Inventory of raw SQL usage; agreement on query builder/Prisma/raw patterns.
- Acceptance criteria: No string-concatenated SQL in request paths; tests or lint guard for new raw SQL; evidence packet shows audited call sites.
- Operator verification: Review PR diff for raw SQL call sites; run route smoke on affected pages.

#### P0.2 Edge Sentry Scrub (PII / secret safety)

- Objective: Ensure edge/runtime error reporting cannot leak PII or credential-like strings.
- Dependencies: Confirm which runtimes emit events; define scrub rules; confirm Sentry config entrypoints.
- Acceptance criteria: Scrub rules applied consistently; evidence shows known “bad” strings are removed; no new data leaves the app unexpectedly.
- Operator verification: Confirm scrub behavior via a controlled test error (non-prod) and Sentry event payload inspection.

#### P0.3 Subscribe / Alerts Rate Limit

- Objective: Prevent abuse/spam on subscription/alert endpoints and any unauthenticated write surfaces.
- Dependencies: Decide rate-limit mechanism (edge middleware vs server route guard); define thresholds.
- Acceptance criteria: Rate-limited responses are deterministic; logs/metrics show rate-limit triggers; no UX regressions for normal usage.
- Operator verification: Trigger rate limit locally/staging and confirm 429 behavior and logging.

### P1 — Product (highest user value)

#### P1.1 Tier 2 — Alerts + DB-backed Watchlist (MVP)

- Objective: Replace local-only watchlist with DB-backed storage + alerting surfaces (MVP), aligned to SSOT + SHIFT_LOCK gates.
- Dependencies: Schema + admin/auth boundaries; operator-safe migrations; email/notification channel decision.
- Acceptance criteria: Watchlist persists across devices; alert creation/update/delete works; evidence packet includes DB + route smoke; no ranking/query changes unless explicitly unlocked.
- Operator verification: Follow regression checklist; validate watchlist persists after hard refresh/sign-out; validate alert triggers on a known new listing.
- **✅ COMPLETE**: 2026-01-02 — PRs #159–#170 (Watchlist), #175 (T2-6), #177 (T2-7), #178 (T2-8). See PROJECT_SSOT.md for full PR list.

### P2 — Ops / Scale (stability / cost / correctness)

#### P2.1 Health Job Status + Go-Live Schedule Gate

- Objective: Make job freshness and failure modes visible and gate go-live on green health.
- Dependencies: `/api/health` contract; workflow scheduling plan (pre-launch paused workflows remain paused until explicit go-live unlock).
- Acceptance criteria: Health shows freshness and last-success; go-live checklist includes “re-enable schedules”; no silent failures.
- Operator verification: Confirm `/api/health` shows green + fresh timestamps; confirm schedule workflows remain paused until go-live decision.

#### P2.2 Index Audit + Targeted Index Adds

- Objective: Reduce query latency and DB load with targeted indexes for the highest-traffic routes.
- Dependencies: Query plan evidence (EXPLAIN); production query patterns; Neon constraints.
- Acceptance criteria: Index PRs include before/after EXPLAIN; route latency improvements; no regressions.
- Operator verification: Apply migrations; validate query plans and route smoke.

#### P2.3 N+1 Query Fixes (high-impact paths)

- Objective: Remove N+1 query patterns on `/`, `/top-deals`, card details, and admin routes.
- Dependencies: Identify hot paths; decide caching/joins strategy; ensure correctness under overrides/filters.
- Acceptance criteria: Evidence shows reduced query count; no behavior changes; route smoke + unit tests pass.
- Operator verification: Compare DB query counts (or logs) before/after on key routes.

### P3 — Blocked / External (requires approval / external enablement)

#### P3.1 eBay AGC + Sold Data Source Approval (Marketplace Insights)

- Objective: Obtain compliant sold/completed data access with stable quotas to support baselines.
- Dependencies: AGC submission, eBay approval, OAuth scope enablement.
- Acceptance criteria: Approval granted; access verified with a minimal compliant call; quotas documented; SSOT updated with approval + constraints.
- Operator verification: Submit AGC; confirm approval response; confirm a controlled data pull succeeds without quota errors.

#### P3.2 Option A (Global Comparability) Resume / Re-Approval Gate

- Objective: Resume Option A work only after sold-data source is approved (or explicit product-truth unlock is granted).
- Dependencies: Sold data approval (P3.1) OR explicit unlock decision; SSOT gates.
- Acceptance criteria: SSOT gate explicitly cleared; implementation plan updated to Active; Phase work proceeds under evidence gates.
- Operator verification: Confirm SSOT STOP note cleared with explicit approval recorded.

#### P3.3 FX Provider Upgrade (if needed)

- Objective: Maintain FX reliability (provider plan, limits, monitoring) without drift/failure causing UX instability.
- Dependencies: Provider plan decision; monitoring/alerting; rate-run instrumentation.
- Acceptance criteria: Provider reliability is measurable; drift validation behavior is documented; `/api/health` remains the operator dashboard.
- Operator verification: Confirm `/api/health` shows SUCCESS + fresh rates; confirm drift behaviors match SSOT.

### P4 — Design (non-functional constraints)

#### P4.1 Design Phase 1 (strictly non-functional)

- Objective: Improve visual legitimacy and consistency without functional/data/behavior changes.
- Dependencies: `docs/design/DESIGN_PHASES.md` constraints; UI consistency contract.
- Acceptance criteria: Visual-only diffs; no data logic changes; operator visual matrix passes; zero ranking changes.
- Operator verification: Run the design-phase visual checklist; confirm no behavioral diffs.

---

## Workstreams — ROI Order (Impact)

1. Tier 2 — Alerts + DB-backed Watchlist (MVP) (implementable now; highest user value)
2. Health job status + go-live schedule gate (implementable now; reduces silent failure risk)
3. N+1 query fixes + targeted indexes (implementable now; performance/cost win)
4. Security/safety hardening (implementable now; risk reduction)
5. Sold data source approval (blocked on eBay AGC / external approval)
6. Option A resume (blocked on sold data source OR explicit unlock)
7. Design Phase 1 polish (implementable now, but must remain strictly non-functional)

---

## Blockers / Gates

- **Sold baselines blocked** until eBay AGC is approved and an approved sold-data source is confirmed (Marketplace Insights or other explicitly approved source).
- **Pre-launch workflows remain paused**: scheduled workflows must not be re-enabled until an explicit go-live decision; go-live requires an explicit “re-enable schedules” checklist item.
- **Design Phase 1 is non-functional**: no feature, data, behavior, query, or ranking changes are allowed under Design Phase work.

---

## Where to Record Completion

- `PROJECT_SSOT.md`: record completion with PR link + merge commit and a short, factual summary.
- `docs/WORKSTREAMS_MASTER.md`: add a short completion note (date + PR link) and adjust priority/status as needed.
