# Product Truth / Philosophy Audit - Option A (Global Comparability with FX)

Status: Blocked (Merged but not approved)  
Canonical decisions live in: `PROJECT_SSOT.md` + `docs/WORKSTREAMS_MASTER.md`  
Scope: Definitions-only truths/invariants required for Option A (global comparability with FX)  
Last reviewed: 2025-12-29  
Notes: Do not implement until explicitly approved.

**Status**: DRAFT (definitions-only; suitable for locking after explicit approval)  
**Last Updated**: 2025-12-28  
**STOP**: Do not proceed beyond this audit until reviewed and explicitly approved.  
**Note**: Merged but not approved; implementation blocked until APPROVED.

**Scope**: Declarative, testable product truths and invariants required for Option A (“global comparability with FX”).  
**Constraints (LOCKED)**: `PROJECT_SSOT.md` + all LOCKED governance docs are hard constraints. This document introduces no code changes, no fixes, no recommendations, and does not resolve conflicts.

---

## Price & Value Truth

### What Constitutes a Price

- The system SHALL define a listing’s **item price** as the eBay-provided item price amount as captured at ingestion (`price_native`).
- The system SHALL define a listing’s **shipping price** as the eBay-provided shipping amount as captured at ingestion (`shipping_native`), which MAY be NULL.
- The system SHALL define `shipping_unknown` as `shipping_native IS NULL` for that listing snapshot.
- The system SHALL define a listing’s **total native** (`total_native`) as:
  - `price_native + shipping_native` when `shipping_unknown = false`,
  - `price_native` when `shipping_unknown = true`.
- The system SHALL treat taxes, duties, and buyer-location adjustments as **out of scope** for the price model unless explicitly present in the captured eBay price/shipping fields.

### When Price Becomes Final (for This System)

- The system SHALL treat all listing price fields as a **snapshot** whose “finality” is anchored to an explicit ingestion timestamp (`snapshot_at` / `ingested_at`) for that listing snapshot.
- The system SHALL NOT treat a generic `updated_at` value as `snapshot_at` unless the system explicitly defines that mapping for listing snapshots.
- The system SHALL NOT claim that a listing snapshot equals the eventual checkout total on eBay.
- The system SHALL surface a staleness disclaimer where defined by SSOT (“Price may have changed on eBay”) and SHALL treat that disclaimer as a first-class truth, not an error state.

### Immutable Price Fields (Snapshot-Immutability)

- For any persisted listing row, the system SHALL treat the following fields as **internally immutable for that snapshot** (i.e., UI/render code SHALL NOT recompute them): `currency`, `price_native`, `shipping_native`, `shipping_unknown`, `total_native`, `fx_rate_to_usd`, `total_usd`.
- The system SHALL require `currency` to be a normalized, uppercase ISO 4217 code.
- The system SHALL require `fx_rate_to_usd` to mean **USD per 1 unit of `currency`** (rate direction as defined in `lib/fxRates.ts`).
- When `total_native` is present, the system SHALL compute `total_usd` from `total_native * fx_rate_to_usd` and SHALL persist it without display rounding; rounding SHALL be applied for display only.
- When `shipping_unknown = true`, the system SHALL set `total_native = price_native` for that snapshot and SHALL compute `total_usd` from that `total_native` using the snapshot's `fx_rate_to_usd`.

**References**: `PROJECT_SSOT.md` (Deal Systems; Price Integrity Fix), `lib/fxRates.ts` (FX definition).

---

## Deal Quality Semantics

### Formal Definitions

- The system SHALL define **USD** as the canonical ranking currency for Option A.
- The system SHALL define a **baseline** as `baseline_median_usd`: the median of eligible sold listings’ `total_usd` for a given card/bucket over a rolling time window (see Statistical Basis).
- The system SHALL define **undervalued** as “priced below baseline” when a baseline exists:
  - `undervalued ⇔ discount_percent < 0` where `discount_percent` is defined below.
- The system SHALL define **deal** as “undervalued + eligible + trust-safe”, where eligibility includes (at minimum):
  - `shipping_unknown = false`,
  - the listing is not excluded by blacklist/overrides governance,
  - the listing meets seller trust requirements for surfaces that claim “trusted/best”.
- The system SHALL treat `shipping_unknown = true` listings as ineligible for any surface that claims “best” or “trusted” deal ranking.
- The system SHALL define a **trusted seller** as meeting (at minimum) the LOCKED seller trust thresholds defined in `PROJECT_SSOT.md`.
- The system SHALL define the canonical cross-market listing identity as `listing_id` and SHALL suppress duplicate identities across markets using the locked market priority order (US > CA > GB > AU > others).
- The system SHALL define **best** as a deterministic selection within an explicit surface context (e.g., “Top Deals”, “Best Trusted Deal”), with a declared ordering rule and tie-breakers.

### Statistical Basis (Median / Window / Exclusions)

- The system SHALL compute sold-price baselines using the **median** (50th percentile), not the mean.
- The system SHALL compute baselines over the LOCKED rolling lookback window defined in `PROJECT_SSOT.md`.
- The system SHALL require the LOCKED minimum eligible sold sample size defined in `PROJECT_SSOT.md` for a baseline to exist.
- The system SHALL exclude sold rows from baseline computation when any of the following are true:
  - sold timestamp is missing,
  - sold price is missing, non-finite, or non-positive,
  - condition bucket is missing,
  - the sold listing title fails the title validity gate.
- The system SHALL define `baseline_median_usd` as a USD-denominated value derived from eligible sold rows’ `total_usd` values.
- The system SHALL NOT compute `discount_percent` or rank listings by mixing USD totals with non-USD baselines (display currencies SHALL NOT affect ranking truth).

### Discount Semantics

- The system SHALL define `discount_percent` as:
  - `discount_percent = ((total_usd - baseline_median_usd) / baseline_median_usd) * 100`
- The system SHALL interpret `discount_percent < 0` as “below baseline” and `discount_percent > 0` as “above baseline”.
- The system SHALL allow display-layer clamping of extreme `discount_percent` values for low-trust sellers, but SHALL NOT change the underlying stored baseline or totals to do so.

### “Best” Semantics (Surface-Scoped)

- For “Top Deals”, the system SHALL define “best” as “most undervalued” using the ordering:
  - lowest `discount_percent` (most negative) first, then lowest `total_usd`, then soonest end time (tie-breakers).
- For “Best Trusted Deal” (card detail highlight), the system SHALL define the “best” selection as a single listing chosen from the trusted/eligible set for that card, where `shipping_unknown = false`, and SHALL define that listing’s displayed total as “item price + shipping”, per SSOT.

**References**: `scripts/update-sold-listings.ts`, `scripts/update-historical-prices.ts`, `lib/pricing.ts`, `PROJECT_SSOT.md` (Deal Systems; Seller Trust; Integrity).

---

## Time & Immutability

### Time Axes (Canonical)

- The system SHALL assign each listing snapshot an explicit ingestion timestamp (`snapshot_at` / `ingested_at`) and SHALL use it as the canonical “as of” timestamp for that snapshot.
- The system SHALL NOT treat a generic `updated_at` value as the canonical ingestion timestamp unless the system explicitly defines that mapping for listing snapshots.
- The system SHALL treat listing end time as `listings.ends_at` when present.
- The system SHALL treat sold time as `ebay_sold_listings.sold_at` (or equivalent) and SHALL use it as the time axis for baseline construction.
- The system SHALL treat baseline compute time as `historical_prices.last_updated_at` (or equivalent) and SHALL use it as the timestamp for baseline freshness.
- The system SHALL treat FX update time as `fx_rates.updated_at` (or equivalent) and SHALL use it as the timestamp for FX freshness.

### Snapshot vs Recompute Rules

- The system SHALL treat live listings as **mutable over time** (new ingestions may update the latest snapshot), but SHALL treat each stored snapshot as internally immutable for rendering (no recomputation in UI).
- The system SHALL treat baselines as **recomputed artifacts** derived from sold data on a schedule; changes in baselines SHALL be expected and SHALL NOT be treated as regressions by default.
- The system SHALL treat FX rates as **recomputed artifacts** derived from an external FX source on a schedule; changes in FX SHALL be expected.

**References**: `PROJECT_SSOT.md` (pipelines + freshness; Deal Systems), `lib/fxRates.ts` (cache + definition).

---

## FX Truth (Option A)

### FX Snapshot Policy

- The system SHALL source FX rates from a paid provider for Option A.
- The system SHALL normalize cross-market monetary comparison into **USD** using a captured FX rate.
- For each listing snapshot with `total_native` present, the system SHALL:
  - select an FX rate `fx_rate_to_usd` for that listing’s `currency`,
  - compute `total_usd` deterministically from `total_native` and `fx_rate_to_usd`,
  - persist both `fx_rate_to_usd` and `total_usd` with the listing snapshot.
- The system SHALL treat `total_usd` as the canonical numeric value for cross-market total comparisons and sorting where “Total USD” is displayed.

### FX Validation (Robust, Non-Brittle)

- The system SHALL validate each candidate FX rate as finite and strictly greater than 0.
- The system SHALL validate each candidate FX rate against broad absolute bounds per the LOCKED thresholds defined in `PROJECT_SSOT.md`.
- The system SHALL validate drift against the prior persisted snapshot for each currency with an existing rate per the LOCKED thresholds defined in `PROJECT_SSOT.md`.
- If drift validation fails, the system SHALL hold the last known-good FX rates, SHALL mark the attempted snapshot as stale/failed, and SHALL surface that degradation state.
- The system SHALL guarantee “no partial writes” for automated FX updates: if validation fails, persisted rates SHALL remain unchanged.
- The system SHALL guarantee that missing FX rates do not silently corrupt totals: listings requiring conversion with an unavailable FX rate SHALL NOT produce a `total_usd` value.

**References**: `PROJECT_SSOT.md` (FX Rate Updates section; Deal Systems), `lib/fxRates.ts` (definition + validation).

---

## UI Truth vs Data Truth

### UI Render-Only Rules

- The UI SHALL render persisted totals as-is and SHALL NOT “repair” currency/FX math at render time.
- Any UI surface labeled “Total USD” SHALL render the stored `total_usd` value and SHALL NOT substitute any native-currency field for it.
- Any UI surface labeled “Historic USD” SHALL render `baseline_median_usd` and SHALL NOT mix units (e.g., compare USD totals against non-USD baselines).
- Display currencies and locale formatting SHALL NOT affect deal ranking truth (ordering/labels SHALL derive from canonical USD fields).
- The UI SHALL treat missing/unknown values as first-class states (e.g., unknown shipping, missing baseline) and SHALL NOT fabricate values.

### SSR / CSR Invariants

- SSR pages that render deal data SHALL be safe to build without a live database connection (build-time DB access SHALL NOT be required); runtime SSR MAY require DB access.
- Client-side state (e.g., watchlist v1) SHALL remain client-only per SSOT and SHALL NOT be treated as a source of price truth.
- UI tooltip and overflow behavior SHALL comply with the LOCKED UI Consistency Contract and SHALL NOT be altered by this audit.

**References**: `PROJECT_SSOT.md` (Stop rules; Watchlist v1; Deal Systems), `docs/rebuild/VISUAL_CONTRACT.md` (LOCKED), `docs/ENV_RUNBOOK.md` (build-time DB independence).

---

## Failure & Degradation Policy

### Price/FX Failures

- If shipping is unknown (`shipping_unknown = true`), the system SHALL:
  - set `total_native = price_native` and compute `total_usd` from that total,
  - display a non-final shipping state (e.g., “+ shipping at checkout” where defined),
  - treat the listing as non-comparable for total-based deal ranking (e.g., exclude from “best/trusted” surfaces).
- If an FX rate is missing for a required currency conversion, the system SHALL:
  - fail the conversion explicitly (no `total_usd`),
  - prevent the listing from being treated as USD-comparable.
- If automated FX updates fail validation, the system SHALL:
  - fail loud (non-zero exit),
  - guarantee no partial writes,
  - preserve the last known-good FX table state and mark the attempted snapshot as stale/failed.

### Baseline Failures

- If a baseline does not exist (insufficient sample or missing data), the system SHALL:
  - treat `discount_percent` as undefined for purposes of calling something “undervalued”,
  - avoid labeling the listing as a “deal” on surfaces that require a baseline.

### Integrity/Trust Failures

- For raw (non-graded) listings, if the listing price violates the LOCKED integrity floor ratio threshold against baseline (as defined in `PROJECT_SSOT.md`), the system SHALL mark the listing for integrity review.
- Listings marked for integrity review SHALL be treated as “trust-degraded” and SHALL NOT be presented as “best trusted deal”.

**References**: `PROJECT_SSOT.md` (Integrity + trust philosophy; Deal Systems), `scripts/update-listings.ts` (integrity floor), `lib/fxRates.ts` (FX failure semantics).

---

## Explicit Non-Goals

- The system SHALL NOT promise that displayed totals equal eBay checkout totals (taxes, duties, buyer-location adjustments may differ).
- The system SHALL NOT promise real-time freshness; it SHALL promise only that data is timestamped and freshness is observable.
- The system SHALL NOT promise that any “deal” remains available or purchasable after ingestion.
- The system SHALL NOT attempt to compute a universal “true market value” beyond the declared sold-median baseline model.
- The system SHALL NOT provide financial advice or profit guarantees from cross-market arbitrage.
- The system SHALL NOT retroactively rewrite historical baselines solely due to FX drift.

---

## Appendix: Implications for Existing System (No Fixes)

- `PROJECT_SSOT.md` contains both (a) a historical audit note claiming “no scheduler” for pipeline scripts and (b) a later section declaring scheduled GitHub Actions pipelines; this is a documentation-level conflict to be reviewed, not resolved here.
- `PROJECT_SSOT.md` declares baselines are stored in CAD and rendered into USD at display time; this audit defines `baseline_median_usd` as the canonical baseline for Option A ranking truth, which is a documentation-level conflict to be reviewed, not resolved here.
- `PROJECT_SSOT.md` includes FX validation direction-check heuristics; this audit defines robust FX validation via bounds + drift checks, which is a documentation-level conflict to be reviewed, not resolved here.
- `docs/market-policy.md` is an active reference document that describes CAD-based normalization and supported markets; where it diverges from SSOT-locked Deal Systems, SSOT remains authoritative.
- SSOT-locked UI governance (`docs/rebuild/VISUAL_CONTRACT.md`) remains binding; this audit does not authorize tooltip/layout behavior changes.
