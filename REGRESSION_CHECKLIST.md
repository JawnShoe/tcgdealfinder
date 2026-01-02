## Baseline patch – trust fixes

- `npm run build`
- `npm run lint`
- Manual smoke:
  - `/top-deals`
  - `/cards/5` Best Trusted Deal block + CTA
  - `/cards/4` change Market to Canada -> 0 visible listings -> empty/intelligence state appears; clear filter -> listings return; watchlist toggle works in empty state
  - `/sets/lost-origin` (representative set view)
  - `/debug/exclusions` toggles for `3d`, `7d`, `30d`
  - Dev-only: `/admin/login` loads in dev; returns 404 in production
  - `/ending-soon` deferral placeholder (no listings fetched)

## Watchlist v1 (Legacy — localStorage only)

- `npm run build`
- `npm run lint`
- Local smoke:
  - `/` (homepage) ⭐ toggles visible on featured grid + desktop/mobile table; starring persists after reload and /watchlist reflects it; no hydration warnings
  - `/newest` Card column shows watchlist star; toggles persist after reload and /watchlist stays in sync
  - `/` featured grid shows each card only once (deduped by card)
  - `/` star toggle adds/removes entry and persists after reload
  - `/top-deals` star toggle works on table rows
  - `/sets/lost-origin` hot-card stars add/remove entries
- `/cards/5` hero star syncs with watchlist
- `/watchlist` reflects saved cards and links to `/cards/[cardId]`

## Watchlist (Flag-based — Tier 2)

- `npm run lint`
- `npm run build`
- Flag OFF smoke (`WATCHLIST_DB_ENABLED=false` or unset):
  - Star toggle on `/` persists after reload
  - `/watchlist` shows starred cards from localStorage
  - DevTools Network: no `/api/watchlist` calls
- Flag ON smoke (`WATCHLIST_DB_ENABLED=true`):
  - Star toggle on `/` persists after reload
  - `/watchlist` shows starred cards from DB
  - DevTools Network: `/api/watchlist` calls succeed

## Featured deals card polish

- `npm run build`
- `npm run lint`
- Manual smoke:
  - `/` Featured Deals cards show price, discount, seller + badge, market flag, ⭐, and CTAs; no score or ends text present

## Seller trust inline sales badge

- `npm run build`
- `npm run lint`
- Manual smoke:
  - `/` and `/top-deals` table rows show “⭐ … sales” for sellers with ≥100 sales without shifting layout
  - Featured deals cards display the inline sales text and still align seller + Trusted badge
  - `/cards/5` listings table includes the same inline badge (line 1: seller 🛡, line 2: ⭐ … sales); mobile/table views remain readable
  - `/top-deals` hides Condition / Score / Price Conf columns (Card, Total, Historic, Discount, Seller, Market, Ends remain)
  - Seller cells render `sellerName 🛡 ⭐ … sales` ordering on both desktop and mobile tables; `/` and `/newest` stay hydration-error free

## Global scale adjustment

- `npm run build`
- `npm run lint`
- Manual smoke at 100% zoom:
  - `/` featured grid + deals table text feels ~10% larger, no unwanted wrapping/scroll
  - `/top-deals` lean column set still fits within viewport width
  - `/newest` table + filter controls look balanced with taller inputs
  - `/cards/5` hero + listings + chart remain readable without overlaps
  - `/watchlist` empty/saved states still align after the typography bump

## Pokémon set ingestion

- `npx tsx scripts/ingest_pokemon_sets.ts`
- `npm run build`
- `npm run lint`
- DB checks:
  - Compare `SELECT COUNT(*) FROM catalog_sets` before/after
  - Spot-check 5 sets across eras (Base, Gym, EX, BW, Sword & Shield, Scarlet & Violet)
- Runtime smoke:
  - `/sets` lists the new sets and paginates
  - Clicking 3 random rows loads `/sets/[setId]` successfully
  - Legacy fallback still works if catalog query fails

## Set browse polish

- `npm run build`
- `npm run lint`
- Manual smoke:
  - `/sets` uses the standard page shell (H1 + subtitle) and groups sets by series newest-first; cards render logos/symbols without broken images
  - `/sets/[setId]` hero shows the logo, metadata grid (series, release date, total cards, catalog coverage), and “Jump to deals/catalog cards” controls
  - “Jump to deals” and “Jump to catalog cards” land in the correct sections; the catalog cards table is padded, readable, and the empty state shows Back/View deals actions
  - Navigating between modern/legacy sets keeps layouts consistent and does not regress card or deal surfaces

## Layout parity / container (SHIFT LOCK focus)

- `npm run build`
- `npm run lint`
- Manual smoke:
  - `/` homepage content sits within the shared max-width container with consistent padding (no edge-flush hero/table)
  - `/top-deals` uses the same shell and shows the lean column set with the two-line seller layout
  - `/newest` shares the same shell and seller layout
  - `/watchlist` must adopt the shared shell/header rhythm
  - `/sets` must adopt the shared shell/header rhythm
  - `/sets/[setId]` must show the hero/header plus padded catalog cards table
- Note: Fix is wrapper/container parity only, not a data/logic change.

## Admin auth invariants

- Manual smoke:
  - Unauthenticated `/admin` returns 404 (notFound)
  - Unauthenticated `/api/admin/*` returns 401
  - `/admin` is the canonical workflow; `/admin/exclusions` redirects to `/admin?tab=exclusions`

## Core Smoke Pack (always run)

- `npm run build` PASS
- `npm run lint` PASS
- Manual smoke:
  - `/` homepage
  - `/top-deals`
  - `/newest`
  - `/ending-soon`
  - `/sets`
  - `/sets/[setId]`
  - `/cards/[cardId]`
  - `/watchlist`
  - `/catalog`
  - `/catalog/sets/[catalogSetId]`
  - `/alerts`
  - `/search`

## Alerts (Tier 2)

- Flag OFF (`ALERTS_ENABLED=false` or unset):
  - `/alerts` shows disabled state ("Alerts Not Enabled")
  - `POST /api/alerts/subscribe` returns 501 and does not write to DB
  - `GET /api/alerts/unsubscribe?token=...` returns 501 and does not write to DB
  - `/alerts/unsubscribe?token=...` shows disabled state
- Flag ON (`ALERTS_ENABLED=true`):
  - `/alerts` shows subscribe form
  - `/alerts?cardId=123` pre-fills card ID and shows card name
  - Subscribe creates active subscription row (verify in DB)
  - Duplicate subscribe is idempotent (no 500s, updates existing)
  - `/alerts/unsubscribe?token=...` works and is idempotent
  - Rate limiting applies to both endpoints (5 requests per 5 minutes per IP)

## Alerts Sending Gate Smoke (T2-7)

- Dry-run works with safe defaults:
  - `npx tsx scripts/check-alerts.ts` (no --send) runs without error
  - Output shows "[BLOCKED]" if any gate missing, or "[GATES] All send gates satisfied"
  - Output shows "Mode: DRY-RUN" and "Emails would send: N"
  - No actual emails sent (verify in SendGrid dashboard or logs)
- Send refuses without explicit env/flag:
  - With `ALERTS_ENABLED=false`: `--send` prints "ALERTS_ENABLED is not set to 'true'" and exits 1
  - With missing `SENDGRID_API_KEY`: prints "SENDGRID_API_KEY is not configured" and exits 1
  - With missing `SITE_BASE_URL`: prints "SITE_BASE_URL is not configured" and exits 1
  - With all above set but `ALERTS_SENDING_ENABLED` not set: prints "ALERTS_SENDING_ENABLED is not set to 'true'" and exits 1
- With all gates satisfied (all 4 env vars set):
  - `--send` mode sends emails (verify in SendGrid dashboard)
  - Respects `MAX_EMAILS_PER_RUN` cap (default 25)
  - Logs show redacted emails (e.g., `j***@example.com`), no raw emails or tokens

## Alerts Idempotency Smoke (T2-8)

- Per-listing idempotency:
  - Same subscriber + same listing: second run shows `[SKIP] ... already sent for listing`
  - Same subscriber + different listing: both are eligible in same run (until cap)
  - Different subscribers + same listing: each subscriber can receive the email
- Database constraint:
  - `email_sends` table has UNIQUE(subscription_id, listing_id)
  - INSERT ... ON CONFLICT DO NOTHING prevents duplicates atomically
- No time-based cooldown suppression:
  - Subscriber can receive multiple emails in quick succession if for different listings

## Health Endpoint Verification (P2.1)

- `/api/health` returns JSON with:
  - `ok`: boolean (true if critical jobs are healthy)
  - `timestamp`: ISO string
  - `jobs`: object with job statuses for:
    - `listings`: { status: "OK"|"STALE"|"UNKNOWN", lastSuccessAt, ageHours, staleThresholdHours: 2 }
    - `historicalPrices`: { status, lastSuccessAt, ageHours, staleThresholdHours: 26 }
    - `soldListings`: { status, lastSuccessAt, ageHours, staleThresholdHours: 26 }
    - `fxRates`: { status, lastSuccessAt, ageHours, staleThresholdHours: 2 }
    - `alertsSending`: { status: "OK"|"DISABLED"|"UNKNOWN", configured: boolean }
  - `freshness`: detailed data per job (same as before, preserved for backward compat)
- Verify `ok: false` when listings or fxRates are STALE
- Verify `alertsSending.status` is "DISABLED" when env vars not configured

## Admin Smoke Pack (run only when PR touches admin routes)

- Manual smoke (requires auth):
  - `/admin`
  - `/admin/exclusions` (redirects to `/admin?tab=exclusions`)
  - `/admin/alerts`
  - `/admin/blacklist`
  - `/admin/listings`
