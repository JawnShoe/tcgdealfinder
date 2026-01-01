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

**Governance**: This document is maintained as part of Tier 2 MVP implementation.
