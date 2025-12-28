# Product Truth / Philosophy Audit — Option A (Global Comparability with FX)

**Status**: DRAFT (definitions-only; suitable for locking after explicit approval)  
**Last Updated**: 2025-12-28  
**STOP**: Do not proceed beyond this audit until reviewed and explicitly approved.

**Scope**: Declarative, testable product truths and invariants required for Option A (“global comparability with FX”).  
**Constraints (LOCKED)**: `PROJECT_SSOT.md` + all LOCKED governance docs are hard constraints. This document introduces no code changes, no fixes, no recommendations, and does not resolve conflicts.

---

## Price & Value Truth

### What Constitutes a Price

- The system SHALL define a listing’s **item price** as the eBay-provided item price amount as captured at ingestion.
- The system SHALL define a listing’s **shipping price** as the eBay-provided shipping amount as captured at ingestion.
- The system SHALL define a listing’s **total price** as `item price + shipping price` when (and only when) shipping is known.
- The system SHALL treat taxes, duties, and buyer-location adjustments as **out of scope** for the price model unless explicitly present in the captured eBay price/shipping fields.

### When Price Becomes Final (for This System)

- The system SHALL treat all listing price fields as a **snapshot** whose “finality” is anchored to the listing record’s ingestion timestamp (e.g., `listings.updated_at`).
- The system SHALL NOT claim that a listing snapshot equals the eventual checkout total on eBay.
- The system SHALL surface a staleness disclaimer where defined by SSOT (“Price may have changed on eBay”) and SHALL treat that disclaimer as a first-class truth, not an error state.

### Immutable Price Fields (Snapshot-Immutability)

- For any persisted listing row, the system SHALL treat the following fields as **internally immutable for that snapshot** (i.e., UI/render code SHALL NOT recompute them): `currency`, `price_native`, `shipping_native`, `total_native`, `fx_rate_to_usd`, `total_usd`.
- The system SHALL require `currency` to be a normalized, uppercase ISO 4217 code.
- The system SHALL require `fx_rate_to_usd` to mean **USD per 1 unit of `currency`** (rate direction as defined in `lib/fxRates.ts`).
- When `total_native` is present, the system SHALL require `total_usd = round(total_native * fx_rate_to_usd, 2)` for that listing snapshot.
- When shipping is unknown, the system SHALL allow `total_native` and `total_usd` to be NULL and SHALL treat the listing as **non-comparable** for total-based ranking.

**References**: `PROJECT_SSOT.md` (Deal Systems; Price Integrity Fix), `lib/fxRates.ts` (FX definition).

---

## Deal Quality Semantics

### Formal Definitions

- The system SHALL define a **baseline** as the median of eligible sold listings for a given card/bucket over a rolling time window (see Statistical Basis).
- The system SHALL define **undervalued** as “priced below baseline” when a baseline exists:
  - `undervalued ⇔ discount_percent < 0` where `discount_percent` is defined below.
- The system SHALL define **deal** as “undervalued + eligible + trust-safe”, where eligibility includes (at minimum):
  - shipping is known,
  - the listing is not excluded by blacklist/overrides governance,
  - the listing meets seller trust requirements for surfaces that claim “trusted/best”.
- The system SHALL define a **trusted seller** as meeting (at minimum) the locked seller trust threshold: `seller_positive_percent >= 98` AND `seller_feedback_count >= 20`.
- The system SHALL define the canonical cross-market listing identity as `listing_id` and SHALL suppress duplicate identities across markets using the locked market priority order (US > CA > GB > AU > others).
- The system SHALL define **best** as a deterministic selection within an explicit surface context (e.g., “Top Deals”, “Best Trusted Deal”), with a declared ordering rule and tie-breakers.

### Statistical Basis (Median / Window / Exclusions)

- The system SHALL compute sold-price baselines using the **median** (50th percentile), not the mean.
- The system SHALL compute baselines over a **365-day rolling lookback window**.
- The system SHALL require a minimum sold sample size of **5** for a baseline to exist.
- The system SHALL exclude sold rows from baseline computation when any of the following are true:
  - sold timestamp is missing,
  - sold price is missing, non-finite, or non-positive,
  - condition bucket is missing,
  - the sold listing title fails the title validity gate.
- The system SHALL store baseline values canonically in **CAD** (as `median_price_cad`) and SHALL treat CAD as the baseline’s authoritative unit.

### Discount Semantics

- The system SHALL define `discount_percent` as:
  - `discount_percent = ((total_price - baseline_price) / baseline_price) * 100`
- The system SHALL interpret `discount_percent < 0` as “below baseline” and `discount_percent > 0` as “above baseline”.
- The system SHALL allow display-layer clamping of extreme `discount_percent` values for low-trust sellers, but SHALL NOT change the underlying stored baseline or totals to do so.

### “Best” Semantics (Surface-Scoped)

- For “Top Deals”, the system SHALL define “best” as “most undervalued” using the ordering:
  - lowest `discount_percent` (most negative) first, then lowest total price, then soonest end time (tie-breakers).
- For “Best Trusted Deal” (card detail highlight), the system SHALL define the “best” selection as a single listing chosen from the trusted/eligible set for that card, and SHALL define that listing’s displayed total as “item price + shipping” (or “+ shipping at checkout” when unknown), per SSOT.

**References**: `scripts/update-sold-listings.ts`, `scripts/update-historical-prices.ts`, `lib/pricing.ts`, `PROJECT_SSOT.md` (Deal Systems; Seller Trust; Integrity).

---

## Time & Immutability

### Time Axes (Canonical)

- The system SHALL treat listing ingestion time as `listings.updated_at` and SHALL use it as the canonical “as of” timestamp for any listing snapshot.
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

- The system SHALL normalize cross-market monetary comparison into **USD** using a captured FX rate.
- For each listing snapshot with `total_native` present, the system SHALL:
  - select an FX rate `fx_rate_to_usd` for that listing’s `currency`,
  - compute `total_usd` deterministically from `total_native` and `fx_rate_to_usd`,
  - persist both `fx_rate_to_usd` and `total_usd` with the listing snapshot.
- The system SHALL treat `total_usd` as the canonical numeric value for cross-market total comparisons and sorting where “Total USD” is displayed.

### Baseline FX Handling (CAD → USD)

- The system SHALL treat sold baselines as canonically **CAD**.
- When a “Historic USD” value is displayed, the system SHALL derive it from the canonical CAD baseline via an explicit CAD→USD FX rate from `fx_rates`.
- The system SHALL treat the derived “Historic USD” as **display-only** unless explicitly persisted with its own FX snapshot metadata.

### Required Guarantees

- The system SHALL enforce FX direction validity (e.g., GBP > 1.0, CAD < 1.0) as a hard invariant for automated FX updates.
- The system SHALL guarantee “no partial writes” for automated FX updates: if validation fails, persisted rates SHALL remain unchanged.
- The system SHALL guarantee that missing FX rates do not silently corrupt totals: listings requiring conversion with an unavailable FX rate SHALL NOT produce a `total_usd` value.

**References**: `PROJECT_SSOT.md` (FX Rate Updates section; Deal Systems), `lib/fxRates.ts` (definition + validation).

---

## UI Truth vs Data Truth

### UI Render-Only Rules

- The UI SHALL render persisted totals as-is and SHALL NOT “repair” currency/FX math at render time.
- Any UI surface labeled “Total USD” SHALL render the stored `total_usd` value and SHALL NOT substitute any native-currency field for it.
- Any UI surface labeled “Historic USD” SHALL render a value derived from the canonical baseline (stored in CAD) using the declared FX handling policy.
- The UI SHALL treat missing/unknown values as first-class states (e.g., unknown shipping, missing baseline) and SHALL NOT fabricate values.

### SSR / CSR Invariants

- SSR pages that render deal data SHALL be safe to build without a live database connection (build-time DB access SHALL NOT be required).
- Client-side state (e.g., watchlist v1) SHALL remain client-only per SSOT and SHALL NOT be treated as a source of price truth.
- UI tooltip and overflow behavior SHALL comply with the LOCKED UI Consistency Contract and SHALL NOT be altered by this audit.

**References**: `PROJECT_SSOT.md` (Stop rules; Watchlist v1; Deal Systems), `docs/ui/UI_CONSISTENCY_CONTRACT.md` (LOCKED), `docs/ENV_RUNBOOK.md` (build-time DB independence).

---

## Failure & Degradation Policy

### Price/FX Failures

- If shipping is unknown, the system SHALL:
  - display a non-final shipping state (e.g., “+ shipping at checkout” where defined),
  - treat the listing as non-comparable for total-based deal ranking.
- If an FX rate is missing for a required currency conversion, the system SHALL:
  - fail the conversion explicitly (no `total_usd`),
  - prevent the listing from being treated as USD-comparable.
- If automated FX updates fail validation, the system SHALL:
  - fail loud (non-zero exit),
  - guarantee no partial writes,
  - preserve the last known-good FX table state.

### Baseline Failures

- If a baseline does not exist (insufficient sample or missing data), the system SHALL:
  - treat `discount_percent` as undefined for purposes of calling something “undervalued”,
  - avoid labeling the listing as a “deal” on surfaces that require a baseline.

### Integrity/Trust Failures

- For raw (non-graded) listings, if the listing price violates the configured floor ratio against baseline (e.g., `< 0.35`), the system SHALL mark the listing for integrity review.
- Listings marked for integrity review SHALL be treated as “trust-degraded” and SHALL NOT be presented as “best trusted deal”.

**References**: `PROJECT_SSOT.md` (Integrity + trust philosophy; Deal Systems), `scripts/update-listings.ts` (integrity floor), `lib/fxRates.ts` (FX failure semantics).

---

## Explicit Non-Goals

- The system SHALL NOT promise that displayed totals equal eBay checkout totals (taxes, duties, buyer-location adjustments may differ).
- The system SHALL NOT promise real-time freshness; it SHALL promise only that data is timestamped and freshness is observable.
- The system SHALL NOT promise that any “deal” remains available or purchasable after ingestion.
- The system SHALL NOT attempt to compute a universal “true market value” beyond the declared sold-median baseline model.
- The system SHALL NOT provide financial advice or profit guarantees from cross-market arbitrage.
- The system SHALL NOT retroactively rewrite historical baselines solely due to FX drift (canonical baseline remains CAD unless explicitly migrated under a Tier-1-approved workstream).

---

## Appendix: Implications for Existing System (No Fixes)

- `PROJECT_SSOT.md` contains both (a) a historical audit note claiming “no scheduler” for pipeline scripts and (b) a later section declaring scheduled GitHub Actions pipelines; this is a documentation-level conflict to be reviewed, not resolved here.
- `PROJECT_SSOT.md` declares baselines are stored in CAD and rendered into USD at display time; any existing surfaces that compare USD totals against CAD baselines without an explicit conversion policy would violate this audit’s “no mixed units” truth.
- `docs/market-policy.md` is an active reference document that describes CAD-based normalization and supported markets; where it diverges from SSOT-locked Deal Systems, SSOT remains authoritative.
- SSOT-locked UI governance (`docs/ui/UI_CONSISTENCY_CONTRACT.md`) remains binding; this audit does not authorize tooltip/layout behavior changes.
