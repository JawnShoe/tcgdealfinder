# Tier 2 Architecture — Watchlist + Alerts MVP

**Purpose**: Document the DB schema and feature flag behavior for Tier 2 features.

**Last Updated**: 2025-12-31

---

## Feature Flags

| Flag                   | Default | Purpose                                            |
| ---------------------- | ------- | -------------------------------------------------- |
| `WATCHLIST_DB_ENABLED` | `false` | Enable DB-backed watchlist (replaces localStorage) |
| `ALERTS_ENABLED`       | `false` | Enable email alerts system                         |

See `docs/ENV_RUNBOOK.md` for full environment variable documentation.

---

## Schema Mapping

### watchlist_entries

**Source**: `migrations/013_add_watchlist_entries.sql`

| Column       | Type        | Constraints                                | Purpose                   |
| ------------ | ----------- | ------------------------------------------ | ------------------------- |
| `id`         | SERIAL      | PRIMARY KEY                                | Auto-increment ID         |
| `owner_id`   | UUID        | NOT NULL                                   | Anonymous user identifier |
| `card_id`    | INTEGER     | NOT NULL, FK → cards(id) ON DELETE CASCADE | Card being watched        |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                    | When the card was added   |

**Unique constraint**: `(owner_id, card_id)` — prevents duplicate entries.

**Indexes**:

- `watchlist_entries_owner_created_idx` on `(owner_id, created_at DESC)` — efficient per-user lookups
- `watchlist_entries_card_id_idx` on `(card_id)` — reverse lookups

---

### email_subscriptions

**Source**: `scripts/init-db.ts` + `migrations/005_add_subscription_last_emailed.sql`

| Column                 | Type         | Constraints                                | Purpose                           |
| ---------------------- | ------------ | ------------------------------------------ | --------------------------------- |
| `id`                   | SERIAL       | PRIMARY KEY                                | Auto-increment ID                 |
| `card_id`              | INTEGER      | NOT NULL, FK → cards(id) ON DELETE CASCADE | Card being subscribed to          |
| `email`                | TEXT         | NOT NULL                                   | Subscriber email address          |
| `min_discount_percent` | NUMERIC(5,2) | NOT NULL, DEFAULT 5                        | Minimum discount to trigger alert |
| `unsubscribe_token`    | TEXT         | NOT NULL                                   | Token for one-click unsubscribe   |
| `created_at`           | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                    | When subscription was created     |
| `confirmed_at`         | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                    | When subscription was confirmed   |
| `unsubscribed_at`      | TIMESTAMPTZ  | NULL                                       | When unsubscribed (soft delete)   |
| `last_emailed_at`      | TIMESTAMPTZ  | NULL                                       | When last alert email was sent    |

**Unique constraint**: Partial unique index on `(card_id, lower(email))` WHERE `unsubscribed_at IS NULL` — prevents duplicate active subscriptions.

**Indexes**:

- `email_subscriptions_active_idx` — partial unique on active subscriptions
- `email_subscriptions_last_emailed_idx` on `(last_emailed_at)` WHERE `unsubscribed_at IS NULL` — cooldown queries

---

## API Endpoints

### Watchlist API (`/api/watchlist`)

**Feature flag**: `WATCHLIST_DB_ENABLED`

When flag is OFF (default): Returns 501 Not Implemented with message.

When flag is ON:

| Method   | Purpose               | Body                 | Response                       |
| -------- | --------------------- | -------------------- | ------------------------------ |
| `GET`    | List watched cards    | —                    | `{ items: WatchlistCard[] }`   |
| `POST`   | Add card to watchlist | `{ cardId: number }` | `{ ok: true, watched: true }`  |
| `DELETE` | Remove from watchlist | `{ cardId: number }` | `{ ok: true, watched: false }` |

**User identification**: Uses anonymous `anon_id` cookie (UUID). Auto-generated if missing.

**Idempotency**: Add/remove are idempotent — no error on duplicate add or missing remove.

---

## UI Rollout Strategy

**Global DB mode (Option A complete)**: When `WATCHLIST_DB_ENABLED=true`, all star buttons across the entire site use the DB-backed API via `WatchlistProvider`. The provider hydrates watched IDs once via `GET /api/watchlist` on initial load, then all toggle operations use `POST/DELETE /api/watchlist`.

**Fallback behavior**: If the API returns 501 (feature disabled) or encounters network/server errors, the provider automatically falls back to localStorage for the remainder of the session. This ensures UX remains functional even if the DB backend is misconfigured or unavailable.

**Flag OFF (default)**: All star buttons use localStorage directly. No API calls are made.

---

## Implementation Files

| File                         | Purpose                               |
| ---------------------------- | ------------------------------------- |
| `lib/featureFlags.ts`        | Feature flag utility functions        |
| `lib/WatchlistContext.tsx`   | Unified watchlist state provider      |
| `lib/watchlistDb.ts`         | Watchlist DB query functions          |
| `lib/anonId.ts`              | Anonymous user ID cookie handling     |
| `lib/emailSubscriptions.ts`  | Email subscription DB query functions |
| `app/api/watchlist/route.ts` | Watchlist REST API endpoints          |

---

## Alerts Sending — Go-Live Gates (T2-7)

The `check-alerts.ts` script implements multi-layer safety gates to prevent accidental production sends.

### Usage

```bash
# Dry-run mode (default) — computes alerts, sends nothing
npx tsx scripts/check-alerts.ts

# Explicit dry-run
npx tsx scripts/check-alerts.ts --dry-run

# Send mode — actually sends emails (requires all gates)
npx tsx scripts/check-alerts.ts --send
```

### Required Environment Variables (for --send mode)

| Variable                 | Required | Default | Purpose                                         |
| ------------------------ | -------- | ------- | ----------------------------------------------- |
| `ALERTS_ENABLED`         | Yes      | `false` | Feature flag for alerts system                  |
| `SENDGRID_API_KEY`       | Yes      | —       | SendGrid API key                                |
| `SITE_BASE_URL`          | Yes      | —       | Base URL for email links (no localhost in prod) |
| `ALERTS_SENDING_ENABLED` | Yes      | `false` | Explicit send gate (required even with --send)  |
| `MAX_EMAILS_PER_RUN`     | No       | `25`    | Hard cap on emails per run                      |

### Gate Validation Order

1. **Feature flag**: `ALERTS_ENABLED=true`
2. **Provider key**: `SENDGRID_API_KEY` must be set
3. **Base URL**: `SITE_BASE_URL` must be set (localhost blocked in production)
4. **Explicit send gate**: `ALERTS_SENDING_ENABLED=true` (only checked in --send mode)

If any gate fails in --send mode, the script exits with code 1 and prints the missing requirement.

### Safety Controls

| Control       | Description                                                       |
| ------------- | ----------------------------------------------------------------- |
| Rate limit    | `MAX_EMAILS_PER_RUN` hard cap (default 25); logs when cap reached |
| Idempotency   | Uses `email_subscriptions.last_emailed_at` cooldown (see below)   |
| PII redaction | Emails logged as `u***@domain.com`; no tokens in logs             |
| Cooldown      | 6-hour cooldown per subscription prevents email spam              |

### Idempotency Mechanism

Idempotency is enforced via `email_subscriptions.last_emailed_at`:

- `getActiveSubscriptionsForCard()` filters out subscriptions emailed within 6 hours
- `markSubscriptionEmailed()` updates `last_emailed_at` after each send
- Each subscriber gets at most one email per cooldown window
- Different subscribers can each receive emails for the same listing (correct behavior)

**Schema**: `email_subscriptions.last_emailed_at` (TIMESTAMPTZ, nullable)
**Query filter**: `last_emailed_at IS NULL OR last_emailed_at < NOW() - INTERVAL '6 hours'`

### Dry-run vs Send Mode

| Mode        | Alerts logged | Emails sent | Gates required                     |
| ----------- | ------------- | ----------- | ---------------------------------- |
| `--dry-run` | Yes           | No          | Gates 1-3 (warns if fail)          |
| `--send`    | Yes           | Yes         | All 4 gates (fails if any missing) |

### Example Output

```
============================================================
TCG Deal Finder — Alerts Check
Mode: DRY-RUN
MAX_EMAILS_PER_RUN: 25
============================================================
[GATES] All send gates satisfied

Found 2 active watch(es)

Checking watch #1 → card 42 (Near Mint)
    [DRY-RUN] Would send to j***@example.com (sub #5)
  [ALERT] Watch #1 fired → discount 15.2% off >= 10.0% → listing 12345

============================================================
SUMMARY
============================================================
Mode: DRY-RUN
Watches checked: 2
Alerts triggered: 1
Emails would send: 1
============================================================
```

---

**Governance**: This document is maintained as part of Tier 2 MVP implementation.
