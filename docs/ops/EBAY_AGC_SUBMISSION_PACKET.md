# eBay AGC Submission Packet - Marketplace Insights API (Sold Data Access)

Status: Active  
Canonical decisions live in: `PROJECT_SSOT.md` + `docs/WORKSTREAMS_MASTER.md`  
Scope: Copy/paste packet for Operator to submit AGC for Marketplace Insights API access  
Last reviewed: 2025-12-29  
Notes: Active until submitted; then mark Submitted/Archived with the approval reference.

**Status**: READY TO SUBMIT (copy/paste)  
**Last Updated**: 2025-12-28  
**AGC Link**: https://developer.ebay.com/my/support/tickets?tab=app-check<br />
**AGC Reference #**: 251228-000007<br />
**STOP**: Sold baselines remain blocked pending approved sold-data source.

---

## 1) App + Keyset Identifiers

- **Product / App name (internal)**: TCG Deal Finder
- **eBay Developer account ID**: `6dade35e-0101-40ad-8b51-481fa3337c89`
- **Keyset**: Production (PRD)
- **App ID (Client ID)**: `Jonathan-Cards-PRD-0e082e800-5cca6df6`

> Note: Do **not** include the Client Secret in any AGC text or screenshots.

---

## 2) Requested Product / API Access

- **Requested product/API**: **Buy Marketplace Insights API** (sales/sold/completed analytics)
- **Purpose**: Ingest sold comps (no PII) to compute per-card USD baselines (`baseline_median_usd`) for cross-market comparability (US/CA/GB/AU).

---

## 3) Expected Call Volume (Estimate)

Current dataset size (production DB, as of 2025-12-28):

- Cards tracked: **~27**
- Markets: **EBAY_US, EBAY_CA, EBAY_GB, EBAY_AU** (4)

Steady-state plan:

- **Scheduled job**: 1 run/day (off-peak), plus manual on-demand runs when adding new cards.
- **Per run**: up to **27 cards × 4 markets × up to 5 pages** (worst case) = **540 requests/day max**.
- **Typical** (often 1 page per card/market): **~108 requests/day**.
- **Hourly average**: ~5–25 requests/hour (single daily batch; throttled).
- **Peak within batch**: capped to **≤ 1 request/second** (single-threaded), so worst-case 540 requests completes in ~10 minutes.

Backfill plan (initial enablement):

- Backfill uses the same capped throughput (≤ 1 req/sec) and may run across multiple days until the 180-day window is populated.

---

## 4) Caching / Backoff / Compliance Plan

- **Cache by persistence**: Store ingested sold rows in DB and only request incremental updates (avoid refetching already-ingested windows).
- **Deduplication**: Enforce stable dedupe keys (market + listing identity) to prevent inflated counts when rerunning jobs.
- **Rate limiting**: Centralized limiter (global concurrency = 1; max QPS = 1).
- **Backoff**:
  - On 429 / rate-limit signals: exponential backoff with jitter; stop after bounded retries; mark run as failed.
  - On 5xx: short retry with backoff; fail closed if persistent.
- **Operational guardrails**: Job logs and `/api/health` surface last-attempt vs last-success status for quick triage.

---

## 5) Data Retention + No-PII Statement (Copy/Paste)

**No PII**:

> We do not store buyer identifiers, names, addresses, emails, or any user PII. We store only listing-level sale metadata needed for price baselines (listing ID, market, timestamps, currency, price/shipping totals, and FX snapshot used for USD normalization).

**Retention**:

> We retain raw sold-comp rows for a rolling 180-day window (for baseline recomputation) and retain only aggregated baseline statistics longer-term. Older raw sold rows are eligible for deletion/purge.

---

## 6) Screenshots to Attach (Checklist)

- eBay Developer Portal: Application/keyset details page showing:
  - Developer account ID
  - Keyset (Production)
  - Client ID (App ID)
- App UI (production or local):
  - Homepage `/` (shows multi-market listings)
  - `/top-deals` (cross-market comparability surfaces)
  - Card detail page `/cards/[cardId]` (shows listing totals)
  - `/api/health` JSON (shows freshness + FX instrumentation)
- GitHub Actions:
  - “Data Pipelines” workflow showing scheduled listing updates and FX updates
  - (After approval) sold ingestion run output showing inserted rows + baseline recompute run

---

## 7) Sandbox / Demo Steps (Copy/Paste)

**Current end-to-end demo (does not require sold access)**:

1. Trigger a listings refresh: GitHub Actions → Data Pipelines → Run workflow → select `update-listings`.
2. Verify `/api/health` shows recent listing update timestamps and FX status is green.
3. Open `/top-deals` and confirm multiple markets are present (US/CA/GB/AU) with normalized totals displayed.

**Post-approval demo (Marketplace Insights enabled)**:

1. Trigger sold ingestion: GitHub Actions → Data Pipelines → Run workflow → select `update-sold-listings` (Marketplace Insights path).
2. Trigger baseline recompute: GitHub Actions → Data Pipelines → Run workflow → select `update-historical-prices`.
3. Verify DB has sold rows and baselines:
   - `SELECT COUNT(*) FROM ebay_sold_listings;`
   - `SELECT COUNT(*) FROM historical_prices WHERE baseline_median_usd IS NOT NULL;`

---

## 8) AGC Form Text (Exact Copy/Paste)

### Title / Summary

> Request access / rate limits for Buy Marketplace Insights API to ingest sold comps (no PII) and compute USD price baselines across eBay US/CA/GB/AU.

### Detail

> We operate TCG Deal Finder, a card deals application that ingests active eBay listings across US/CA/GB/AU and normalizes totals to USD using an hourly FX snapshot. We need official sold/completed analytics access via the Buy Marketplace Insights API to ingest sold comps (listing-level sale metadata only; no buyer PII) and compute per-card USD baselines (median over a 90–180 day window) for global comparability.
>
> Expected usage: 1 scheduled batch/day (off-peak) across ~27 tracked cards and 4 markets. Worst case ~540 requests/day (27×4×5 pages), typical ~108 requests/day (27×4×1 page). We throttle to ≤1 request/second, store results to avoid refetching, and implement exponential backoff + bounded retries on rate-limit responses. We retain raw sold rows for a rolling 180-day window and retain only aggregated baseline statistics longer term.
>
> eBay Developer account ID: [PASTE HERE]
> Keyset: Production (PRD)
> Client ID (App ID): Jonathan-Cards-PRD-0e082e800-5cca6df6
