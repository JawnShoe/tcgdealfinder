# Option A Implementation Plan — Global Comparability with FX

**Status**: DRAFT (planning only; no implementation in this workstream)  
**Last Updated**: 2025-12-28  
**STOP**: Do not implement Option A until this plan is reviewed and explicitly approved.

**Governing / Locked Docs**

- `docs/audit/PRODUCT_TRUTH_PHILOSOPHY_AUDIT_OPTION_A.md` (APPROVED; definitions-only)
- `PROJECT_SSOT.md` (LOCKED systems + scope boundaries)
- `SHIFT_LOCK.md` (DONE/SHIFT/Evidence gates)
- `docs/ui/UI_CONSISTENCY_CONTRACT.md` (LOCKED UI invariants)
- `docs/design/DESIGN_PHASES.md` (LOCKED design-phase constraints)

---

## 1) Current State vs Target State

### Current State (Observed)

**Data model (DB)**

- Listings are stored in `listings` with legacy CAD-named fields (`price_cad`, `shipping_cad`, `total_price_cad`) plus multi-currency fields (`currency`, `price_native`, `shipping_native`, `total_native`, `fx_rate_to_usd`, `total_usd`) added via `migrations/001_add_fx_rates.sql` and/or `scripts/init-db.ts`.
- Monetary precision is currently constrained by schema (e.g., `listings.total_usd NUMERIC(10, 2)` and `fx_rates.rate_to_usd NUMERIC(10, 6)`), so stored values are effectively rounded for storage, not just display.
- Listings use `created_at` / `updated_at` for time, but there is no explicit `snapshot_at` / `ingested_at` concept in schema.
- Listings do not have an explicit `shipping_unknown` flag; shipping unknown is represented indirectly (`shipping_known = false` and/or `shipping_*` nulls).
- Listings do not store an FX snapshot timestamp for the specific rate used (no `fx_timestamp` on the listing row).
- FX rates are stored in `fx_rates` with `currency`, `rate_to_usd`, and `updated_at`, but no run-level “attempt/success/failure/stale” metadata is persisted.
- Sold history is stored in `ebay_sold_listings` with a single `price` field and no currency / FX snapshot columns.
- Historical baselines are stored in `historical_prices` as `median_price_cad` with `sample_size` and `last_updated_at`. There is no `baseline_median_usd` field.

**Ingestion / computation**

- `scripts/update-listings.ts` sets listing totals to NULL when shipping is unknown (by setting `totalPriceCad = null` when `shippingKnown` is false), which cascades to `total_native = NULL` and `total_usd = NULL`.
- `lib/fxRates.ts:convertToUSD()` rounds to 2 decimals (`usd.toFixed(2)`) and returns a rounded USD value, reinforcing “round for storage.”
- Missing FX rates currently cause the listing ingestion to be skipped for that listing (not ingested as a non-comparable row).
- `scripts/update-fx-rates-auto.ts`:
  - Uses Frankfurter (free) as the source.
  - Validates with “direction check” heuristics.
  - Performs per-currency writes in a loop, which can still partially write if a mid-run DB failure occurs (despite pre-validation).
- `scripts/update-sold-listings.ts` ingests sold prices without explicitly capturing currency or FX, and `scripts/update-historical-prices.ts` computes medians over the raw stored `price` field.

**UI / SSR/CSR**

- UI surfaces include both legacy and USD-normalized totals. Some deal math and view-model paths still reference CAD-named fields for discount/historic computations.
- `/top-deals` is client-only rendered via `next/dynamic({ ssr: false })`, which helps avoid hydration issues but increases risk of perceived “flicker” and increases reliance on client behavior.
- `/api/health` freshness currently keys off `listings.updated_at` and does not report FX “stale/failed” semantics beyond a last-updated timestamp.

### Target State (From the Approved Option A Audit)

**Canonical truth fields (Option A)**

The following become the canonical truth values used for ranking, labeling, and cross-market comparability:

- `total_usd` — canonical numeric for cross-market total comparisons and ordering
- `baseline_median_usd` — canonical baseline used for ranking truth
- `fx_rate_to_usd` — USD per 1 unit of native currency
- `fx_timestamp` — timestamp of the FX snapshot used for the listing/sold snapshot conversion
- `shipping_unknown` — deterministic flag: `shipping_native IS NULL`
- `snapshot_at` / `ingested_at` — explicit ingestion timestamp for listing (and sold) snapshots

**Core invariants**

- Shipping unknown is not a “missing total” state:
  - `shipping_unknown = (shipping_native IS NULL)`
  - `total_native = price_native` when `shipping_unknown = true`
  - `total_usd` is computed from that `total_native` using the captured `fx_rate_to_usd`
- Ranking truth is USD-only:
  - `discount_percent = ((total_usd - baseline_median_usd) / baseline_median_usd) * 100`
  - Display currencies and locale formatting SHALL NOT affect ranking truth
- FX:
  - Rates are sourced from a paid provider (provider not named here)
  - Validation is robust (bounds + drift checks), not currency-direction heuristics
  - On drift trigger: hold last-known good rates, mark the attempted snapshot stale/failed, and surface degradation
  - No partial writes on validation failure
- Precision:
  - Store precise computed values; apply rounding for display only
- UI:
  - UI is render-only (no client-side conversions or “repairs”)
  - Build-time must not require DB; runtime SSR may

**Known governance conflicts (must be carried, not resolved here)**

- `PROJECT_SSOT.md` describes CAD-based historic baseline storage and a free FX source; Option A defines USD-canonical baseline ranking and paid-provider FX. Any implementation that changes SSOT-locked meaning requires explicit unlock or an SSOT update workstream.

---

## 2) Data Model Changes

> Note: This repo uses SQL migrations (`migrations/*.sql`) + `scripts/init-db.ts` (bootstrap schema), not Prisma.

### Listings: snapshot + shipping_unknown + FX snapshot + precision

**Schema changes (required)**

- Add listing snapshot timestamp:
  - `listings.snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - Backfill strategy: `snapshot_at = listings.updated_at` for existing rows (explicitly declaring the mapping for legacy rows only).
- Add shipping unknown flag:
  - `listings.shipping_unknown BOOLEAN NOT NULL DEFAULT FALSE`
  - Backfill strategy: `shipping_unknown = (shipping_native IS NULL)` (or `NOT shipping_known` where shipping_native is absent).
- Add FX snapshot timestamp used for conversion:
  - `listings.fx_timestamp TIMESTAMPTZ NULL` (or `NOT NULL` after backfill)
  - Backfill strategy: for each row with `fx_rate_to_usd` present, set `fx_timestamp` to the corresponding `fx_rates.updated_at` for that row’s `currency` at migration time (best-effort), and mark rows without a resolvable mapping as `fx_timestamp = NULL`.
- Enforce “store precise; round for display”:
  - Increase scale/precision for computed USD values:
    - `listings.total_usd` to `NUMERIC(18, 6)` (or comparable)
    - `listings.fx_rate_to_usd` to `NUMERIC(18, 10)` (or comparable)
  - Leave native amounts in minor units as-is unless evidence requires change:
    - `price_native`, `shipping_native`, `total_native` may remain `NUMERIC(10, 2)` (minor unit precision).

**Migration files (proposed)**

- `migrations/008_option_a_listings_snapshot_fx_precision.sql`
  - Adds columns: `snapshot_at`, `shipping_unknown`, `fx_timestamp`
  - Alters precision for `total_usd` and `fx_rate_to_usd`
  - Adds indexes as needed (e.g., `listings_snapshot_at_idx`, optional)

**Rollback**

- Rollback is “logical” (stop reading new columns):
  - Preserve the new columns; revert application reads/writes to prior fields.
  - Precision widening is not rolled back unless explicitly required (shrinking precision is high-risk).

### FX Rates: run metadata + stale state (to support “hold last-known + mark stale”)

**Schema changes (required to surface degradation)**

- Add run-level tracking table (recommended minimal):
  - `fx_rate_runs(id, provider, started_at, completed_at, status, failure_reason, drift_detected, raw_payload_json, created_at)`
  - This table is the authoritative record of “last success” vs “last failed/stale attempt” without mutating `fx_rates` on failure.

**Migration files (proposed)**

- `migrations/009_option_a_fx_rate_runs.sql`
  - Creates `fx_rate_runs` table
  - Optional: adds an index on `(completed_at DESC)`

**Rollback**

- If instrumentation causes unexpected load, stop writing `fx_rate_runs` but keep the table.

### Sold listings: FX snapshot fields (to compute baseline_median_usd deterministically)

**Schema changes (required)**

- Extend `ebay_sold_listings` to store a normalized sold snapshot comparable to live listings:
  - `currency VARCHAR(3) NOT NULL` (derived from market if API does not provide)
  - `price_native NUMERIC(10, 2) NOT NULL`
  - `shipping_native NUMERIC(10, 2) NULL` (may remain NULL if not available)
  - `shipping_unknown BOOLEAN NOT NULL`
  - `total_native NUMERIC(10, 2) NOT NULL` (per shipping_unknown policy)
  - `fx_rate_to_usd NUMERIC(18, 10) NOT NULL`
  - `fx_timestamp TIMESTAMPTZ NOT NULL`
  - `total_usd NUMERIC(18, 6) NOT NULL`
  - `ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

**Migration files (proposed)**

- `migrations/010_option_a_sold_fx_snapshot.sql`
  - Adds the columns above and backfills best-effort where possible.

**Rollback**

- Keep added columns; allow baseline computation to fall back to legacy behavior until re-approved.

### Historical baselines: baseline_median_usd

**Schema changes (required)**

- Add Option A baseline:
  - `historical_prices.baseline_median_usd NUMERIC(18, 6) NULL`
  - Optional: `historical_prices.baseline_sample_size_usd INTEGER NULL` if sample sizes differ from CAD baseline sample size.

**Migration files (proposed)**

- `migrations/011_option_a_historical_baseline_usd.sql`
  - Adds `baseline_median_usd` (and any associated metadata columns)
  - Adds index to support joins (if required)

**Rollback**

- Keep the column; stop reading it and continue rendering legacy historic fields if necessary.

---

## 3) Ingest Pipeline Changes

### Live listings ingestion (`scripts/update-listings.ts`)

**Step-by-step logic changes (required)**

- Determine native currency:
  - Use listing-provided currency if present; else use market default.
  - Normalize to ISO 4217 uppercase.
- Determine shipping unknown and totals deterministically:
  - `shipping_unknown = (shipping_native IS NULL)` (do not treat this as “missing total”)
  - `total_native = price_native + shipping_native` when known
  - `total_native = price_native` when unknown
- FX snapshot capture per listing:
  - Fetch `fx_rate_to_usd` and `fx_timestamp` together from `fx_rates` for the listing’s currency.
  - Persist both on the listing row.
- Compute `total_usd` precisely (no `.toFixed(2)` in storage math).
- Missing FX rate behavior:
  - Persist the listing row but set `total_usd = NULL` and mark it as non-comparable for USD ranking, OR
  - Skip ingestion entirely (current behavior).
  - This must be explicitly selected and locked (see Open Questions).

**No partial writes (listing ingestion)**

- Each upsert remains atomic per listing (`INSERT ... ON CONFLICT DO UPDATE`).
- The system must never write `total_usd` without also writing its associated `fx_rate_to_usd` and `fx_timestamp`.

### FX rate ingestion (`scripts/update-fx-rates-auto.ts` + `lib/fxRates.ts`)

**Where drift validation / stale FX is enforced**

- Drift + bounds validation is enforced at the FX update job boundary (not in the UI).
- “Hold last-known” behavior means:
  - Do not mutate `fx_rates` if validation fails.
  - Record the failed attempt in `fx_rate_runs` with status + reason.
  - Surface stale/failed state via `/api/health` (and any operator dashboards).

**No partial writes (FX updates)**

- Update all currencies in a single DB transaction:
  - Fetch current rates
  - Fetch new provider rates
  - Validate (bounds + drift)
  - If valid: write all updates and commit
  - If invalid: rollback and exit non-zero

**Paid provider**

- Replace Frankfurter source with a paid provider (provider selection is a required decision; see Open Questions).

### Sold listings ingestion (`scripts/update-sold-listings.ts`)

**Step-by-step logic changes (required)**

- Capture sold snapshot with currency and FX snapshot:
  - Derive currency from market if the API response does not include currency.
  - Apply the same `shipping_unknown` + `total_native` policy (shipping may be unavailable; treat as unknown).
  - Persist `fx_rate_to_usd`, `fx_timestamp`, and computed precise `total_usd` on each sold row.
- Title validity and eligibility filters remain enforced as today (do not broaden without explicit unlock).

---

## 4) Baseline Computation Changes

### Computing `baseline_median_usd`

**Definition**

- `baseline_median_usd` is computed as the median of eligible sold rows’ `total_usd` for a given `(card_id, condition_bucket, language, market)` bucket over the configured rolling window.

**Implementation approach**

- Extend `scripts/update-historical-prices.ts` to compute and upsert:
  - `historical_prices.baseline_median_usd` from `ebay_sold_listings.total_usd`
  - Maintain existing `median_price_cad` until cleanup phase explicitly removes it.
- Ensure the baseline query uses:
  - The SSOT-locked lookback window (currently hardcoded in code; must be locked explicitly before implementation)
  - The SSOT-locked minimum sample size (currently hardcoded in code; must be locked explicitly before implementation)
  - Existing eligibility filters (non-null sold_at, positive prices, valid titles, etc.)

### Recompute cadence and drift expectations

- Baselines are explicitly recomputed artifacts; baseline drift after recompute is allowed.
- Drift must be observable:
  - `historical_prices.last_updated_at` remains the canonical “baseline freshness” timestamp.
  - UI surfaces that label “Historic USD” must expose baseline freshness and sample size where currently supported by SSOT/governance.

---

## 5) UI / SSR Lockdown

### Render-only rules (concrete)

- UI components SHALL render persisted canonical fields (`total_usd`, `baseline_median_usd`, `discount_percent`) and SHALL NOT perform FX conversion or baseline conversion client-side.
- UI components SHALL NOT “repair” totals at render time (no fallback math from legacy CAD-named fields).
- Display currency selection SHALL NOT affect ranking truth; it may only affect formatting.

### SSR/CSR invariants

- Build-time must not require DB connections:
  - DB-backed routes must be runtime (dynamic) and must not execute DB queries during `next build`.
- Runtime SSR may use DB (as currently allowed by the audit).

### Routes likely impacted (high level)

- `/top-deals` — ensure ordering/filters use USD canonical fields and remove client-side computations that cause hydration instability.
- `/` (homepage featured + table) — ensure “Total USD” and “Historic USD” reflect stored canonical USD fields.
- `/cards/[cardId]` and any listing tables — ensure “Best Trusted Deal” logic uses `shipping_unknown` gating and USD-canonical discount truth.
- `/newest`, `/sets/[setId]`, and other deal tables that reuse shared deal view-models.

**UI Consistency Contract**

- All tooltip/overflow rules in `docs/ui/UI_CONSISTENCY_CONTRACT.md` remain binding; Option A work must not introduce layout churn or tooltip behavior regressions.

---

## 6) Phased Rollout Plan

### Phase 0 — Instrumentation & invariants

**Scope**

- Add invariant checks and evidence hooks needed to safely implement and verify Option A, without changing ranking logic yet.
- Add FX run logging (`fx_rate_runs`) and surface status through `/api/health`.

**Expected files to change (high level)**

- `migrations/009_option_a_fx_rate_runs.sql`
- `scripts/update-fx-rates-auto.ts`, `lib/fxRates.ts`
- `app/api/health/route.ts`
- `lib/schema.ts` (optional: add column/table presence checks)

**Risks**

- Additional DB writes for FX run logging.

**Rollback**

- Stop writing `fx_rate_runs`; leave schema in place.

**Acceptance criteria**

- `/api/health` reports FX freshness + last run status deterministically.
- No changes to deal ranking or UI outputs in this phase.

### Phase 1 — Schema + ingest snapshot correctness

**Scope**

- Introduce `snapshot_at`, `shipping_unknown`, `fx_timestamp`, and precision widening on listings.
- Update listing ingestion to compute deterministic totals even when shipping is unknown.
- Store precise values; round only for display.

**Expected files to change (high level)**

- `migrations/008_option_a_listings_snapshot_fx_precision.sql`
- `scripts/update-listings.ts`
- `lib/fxRates.ts`
- `scripts/init-db.ts` (bootstrap schema alignment)

**Risks**

- Schema migration risk if `ALTER COLUMN TYPE` rewrites a large table.
- Backfill semantics: legacy rows may not have a reliable `fx_timestamp` mapping.

**Rollback**

- Revert application logic to read legacy fields; keep new columns.
- If a precision change causes unexpected issues, stop relying on widened precision and treat values as display-rounded until re-approved.

**Acceptance criteria**

- New ingested listings always have:
  - `snapshot_at` populated
  - `shipping_unknown` consistent with `shipping_native`
  - `total_native` deterministic per policy
  - `total_usd` written without display rounding
  - `fx_rate_to_usd` + `fx_timestamp` present whenever `total_usd` is present

### Phase 2 — Baseline USD recompute + backfill

**Scope**

- Extend sold ingestion to store FX snapshots and USD totals.
- Compute and store `baseline_median_usd` in `historical_prices`.
- Backfill `baseline_median_usd` for historical buckets where feasible.

**Expected files to change (high level)**

- `migrations/010_option_a_sold_fx_snapshot.sql`
- `migrations/011_option_a_historical_baseline_usd.sql`
- `scripts/update-sold-listings.ts`
- `scripts/update-historical-prices.ts`

**Risks**

- Sold listings API may not supply shipping; baseline will treat shipping as unknown unless a new source is introduced.
- Baseline drift will occur when recomputed; must be communicated as expected.

**Rollback**

- Stop reading `baseline_median_usd` in queries/UI; keep computing legacy baseline until re-approved.

**Acceptance criteria**

- `historical_prices.baseline_median_usd` is populated for buckets meeting SSOT-locked eligibility thresholds.
- Baseline freshness timestamps are correct and observable.

### Phase 3 — UI stabilization + remove client math

**Scope**

- Move all deal ranking and display logic to canonical stored fields and server-side computation.
- Remove any client-side currency conversions and mixed-unit fallbacks.
- Eliminate flicker sources by enforcing SSR/CSR invariants and deterministic render inputs.

**Expected files to change (high level)**

- `lib/dealViewModel.ts`, `lib/dealMath.ts`, `lib/pricing.ts`
- Deal-querying routes (e.g., `app/top-deals/page.tsx`, homepage routes, card detail routes)
- Shared table components where needed (render-only formatting)

**Risks**

- Hydration mismatches if client-only assumptions remain (e.g., `Date.now()` usage in render paths).
- UI contract regressions (tooltips/overflow).

**Rollback**

- Feature-flag the Option A query paths and fall back to legacy rendering if inconsistencies are detected.

**Acceptance criteria**

- Ranking order is stable and derived from USD-canonical fields.
- No client-side FX conversion remains in deal surfaces.
- No hydration warnings introduced; “flicker” is not observed on core routes.

### Phase 4 — Cleanup

**Scope**

- Remove dead/legacy fields and scripts once Option A is stable and the team explicitly approves cleanup.
- Update governance docs to reflect the new canonical truths (separate docs workstream if required by process).

**Expected files to change (high level)**

- Remove/retire legacy CAD-named computation paths (not necessarily DB columns immediately).
- Remove obsolete “repair” scripts and migrations that are superseded.
- Documentation updates to SSOT and runbooks (may require explicit unlock if SSOT-locked sections must change).

**Risks**

- Cleanup can accidentally introduce regressions if done before sufficient evidence accumulates.

**Rollback**

- Defer cleanup; keep legacy paths gated/off but present.

**Acceptance criteria**

- No remaining mixed-unit computations exist in active code paths.
- SSOT and runbooks accurately describe the canonical truth fields and workflows.

---

## 7) Evidence + Regression Gates

> All Tier-1 pricing changes must follow `SHIFT_LOCK.md` Evidence Gate rules and produce an evidence packet (`docs/EVIDENCE_PACKET_TEMPLATE.md`) before merge.

### Phase 0 — Evidence + gates

**Evidence packet (minimum)**

- DB: `SELECT * FROM fx_rates ORDER BY updated_at DESC;`
- DB: last 5 `fx_rate_runs` rows with status and timestamps
- UI: `/api/health` output contains FX last success vs last attempt status

**Regression checklist**

- `npm run lint`
- `npm run build`
- `REGRESSION_CHECKLIST.md` smoke: `/`, `/top-deals`, `/cards/[id]`, `/watchlist`

**STOP if**

- FX status cannot be determined deterministically (no “last success” signal).

### Phase 1 — Evidence + gates

**Evidence packet (minimum)**

- DB: sample 2 listings per market (US/CA/GB/AU):
  - show `currency`, `price_native`, `shipping_native`, `shipping_unknown`, `total_native`, `fx_rate_to_usd`, `fx_timestamp`, `total_usd`, `snapshot_at`
- DB: verify `shipping_unknown` matches `shipping_native IS NULL`
- UI: “Total USD” value on a known listing matches DB `total_usd` exactly (no recompute)

**Regression checklist**

- All items under “Baseline patch — trust fixes” and “Watchlist v1”

**STOP if**

- Any surface labeled “Total USD” renders a value not equal to the stored `total_usd`.
- Any listing writes `total_usd` without `fx_rate_to_usd` + `fx_timestamp`.

### Phase 2 — Evidence + gates

**Evidence packet (minimum)**

- DB: sample buckets with `baseline_median_usd`, sample size, last_updated_at
- DB: sample sold rows used for baseline show stored `total_usd` + `fx_timestamp`
- UI: “Historic USD” renders `baseline_median_usd` and shows freshness/sample size where applicable

**Regression checklist**

- `REGRESSION_CHECKLIST.md` + additional smoke: `/sets/[setId]`, `/newest`

**STOP if**

- Baseline recompute changes are not observable (no timestamp/sample size surfaced where expected).

### Phase 3 — Evidence + gates

**Evidence packet (minimum)**

- UI: no hydration warnings on `/`, `/top-deals`, `/cards/[id]`
- UI: “best/trusted” surfaces exclude `shipping_unknown = true` listings (verify with a known sample)
- DB vs UI: at least 5 listing IDs across markets confirm discount formula uses USD-only terms

**Regression checklist**

- Entire `REGRESSION_CHECKLIST.md`
- UI Consistency Contract checks for any touched tooltip/table component

**STOP if**

- Any flicker/hydration mismatch is introduced on core surfaces.
- Any mixed-unit comparison is detected in ranking (USD totals vs non-USD baselines).

### Phase 4 — Evidence + gates

**Evidence packet (minimum)**

- Diff inventory: list removed fields/scripts and why they are dead
- DB/UI samples show unchanged behavior for canonical truths post-cleanup

**Regression checklist**

- Entire `REGRESSION_CHECKLIST.md`

**STOP if**

- Cleanup requires changing a SSOT-locked decision without explicit unlock.

---

## 8) Open Questions / Decisions Needed

> Items marked **REQUIRES EXPLICIT UNLOCK** cannot proceed under current LOCKED constraints without owner approval.

1. **Paid FX provider selection (REQUIRES EXPLICIT UNLOCK)**: SSOT currently references Frankfurter (free). Audit requires paid provider. Which provider is authorized, and what are the operational constraints (quota, cost ceiling, failure modes)?
2. **FX bounds + drift thresholds (must be locked)**: The audit requires bounds + drift checks, but SSOT does not currently lock the exact thresholds. What exact bounds and drift thresholds are approved for Tier-1 locking?
3. **Baseline USD vs SSOT CAD baseline (REQUIRES EXPLICIT UNLOCK)**: SSOT describes CAD canonical baseline storage; Option A defines `baseline_median_usd` as canonical ranking baseline. Confirm whether:
   - We add `baseline_median_usd` while preserving CAD baselines (dual-baseline), OR
   - We migrate canonical baselines to USD (stronger conflict with SSOT text).
4. **Baseline lookback window + minimum sample size (must be locked)**: Code currently hardcodes values; SSOT does not lock them explicitly. What values are approved for locking under Option A?
5. **Missing FX rate behavior for ingestion**: Should listings/sold rows be ingested as non-comparable (stored with `total_usd = NULL`) or skipped entirely? This affects completeness vs strictness.
6. **Timestamp type and naming**: Use `snapshot_at` vs `ingested_at`, and `TIMESTAMP` vs `TIMESTAMPTZ`. Existing schema mixes both; confirm the project standard for new canonical time axes.
7. **Design phase constraint interaction (REQUIRES EXPLICIT UNLOCK if interpreted globally)**: `docs/design/DESIGN_PHASES.md` Phase 1 prohibits functional/data behavior changes. Confirm that Option A UI changes are authorized as a separate Tier-1 correctness workstream and not subject to Phase 1 visual-only restrictions.
