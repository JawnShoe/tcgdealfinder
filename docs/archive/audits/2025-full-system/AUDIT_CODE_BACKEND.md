> **Archived after Full System Audit closeout (2025-12-26)**

# Backend / API Code Audit (Archived)

```
Audit Artifact (Archived)
Phase: 3B — Backend / API
Created: 2025-12-26
Archived: 2025-12-26
```

---

## 1. Backend Entry Points

### API Route Directories

All API routes live under `app/api/`:

```
app/api/
├── admin/                     # Admin mutations (protected)
│   ├── alerts/
│   │   ├── create/route.ts    # Create alert watchlist entry
│   │   ├── delete/route.ts    # Delete alert
│   │   └── toggle/route.ts    # Toggle alert active state
│   ├── allow-listing/route.ts # Override listing rejection
│   ├── blacklist-seller/route.ts  # Add seller to blacklist
│   ├── hide-listing/route.ts  # Manually hide listing
│   ├── login/route.ts         # Admin login (sets cookie)
│   └── revoke-allow/route.ts  # Remove ALLOW override
│
├── alerts/                    # Public alert subscriptions
│   ├── subscribe/route.ts     # Create email subscription
│   └── unsubscribe/route.ts   # Unsubscribe via token
│
├── cards/[cardId]/
│   └── other-markets/route.ts # Get listings from other markets
│
├── deals/
│   ├── dealsQuery.ts          # Shared query builder (not a route)
│   └── route.ts               # Main deals API
│
├── debug/                     # Debug endpoints (protected)
│   ├── integrity/route.ts     # List REVIEW status listings
│   └── overrides/route.ts     # CRUD for listing overrides
│
├── health/route.ts            # Health check + freshness data
├── historicals/[cardId]/route.ts  # Price history chart data
├── listings/by-ebay-id/route.ts   # Lookup listing by eBay ID
├── market/route.ts            # Set market preference cookie
├── search-cards/route.ts      # Card search autocomplete
└── watchlist-cards/route.ts   # Get card details for watchlist
```

### Server Actions

No explicit server actions (`"use server"` files) exist. All mutations go through API routes.

### Shared Backend Utilities

| File                        | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| `lib/db.ts`                 | PostgreSQL connection pool via `pg`          |
| `lib/adminAuth.ts`          | Admin cookie/header authentication           |
| `lib/debugAuth.ts`          | Debug endpoint authentication (hashed token) |
| `lib/emailSubscriptions.ts` | Subscription CRUD operations                 |
| `lib/emailQueue.ts`         | SendGrid email dispatch                      |
| `lib/rateLimit.ts`          | Sliding window rate limiter (DB-backed)      |
| `lib/cards.ts`              | Card search query                            |
| `lib/blacklist.ts`          | Blacklist/exclusion logic                    |
| `lib/schema.ts`             | Runtime schema column checks                 |

---

## 2. API Route Inventory

| Route                                   | File Path                                       | Reads DB | Writes DB | Side Effects     | Auth Required    |
| --------------------------------------- | ----------------------------------------------- | -------- | --------- | ---------------- | ---------------- |
| `GET /api/deals`                        | `app/api/deals/route.ts`                        | Yes      | No        | None             | No               |
| `GET /api/health`                       | `app/api/health/route.ts`                       | Yes      | No        | None             | No               |
| `GET /api/search-cards`                 | `app/api/search-cards/route.ts`                 | Yes      | No        | None             | No               |
| `GET /api/watchlist-cards`              | `app/api/watchlist-cards/route.ts`              | Yes      | No        | None             | No               |
| `GET /api/listings/by-ebay-id`          | `app/api/listings/by-ebay-id/route.ts`          | Yes      | No        | None             | No               |
| `GET /api/cards/[cardId]/other-markets` | `app/api/cards/[cardId]/other-markets/route.ts` | Yes      | No        | None             | No               |
| `GET /api/historicals/[cardId]`         | `app/api/historicals/[cardId]/route.ts`         | Yes      | No        | None             | No               |
| `POST /api/market`                      | `app/api/market/route.ts`                       | No       | No        | Sets cookie      | No               |
| `POST /api/alerts/subscribe`            | `app/api/alerts/subscribe/route.ts`             | Yes      | Yes       | Rate limited     | No               |
| `GET /api/alerts/unsubscribe`           | `app/api/alerts/unsubscribe/route.ts`           | No       | Yes       | None             | No (token-based) |
| `POST /api/admin/login`                 | `app/api/admin/login/route.ts`                  | No       | No        | Sets cookie      | Secret match     |
| `POST /api/admin/blacklist-seller`      | `app/api/admin/blacklist-seller/route.ts`       | Yes      | Yes       | Deletes listings | Admin            |
| `POST /api/admin/hide-listing`          | `app/api/admin/hide-listing/route.ts`           | Yes      | Yes       | Deletes listing  | Admin            |
| `POST /api/admin/allow-listing`         | `app/api/admin/allow-listing/route.ts`          | Yes      | Yes       | Creates override | Admin            |
| `POST /api/admin/revoke-allow`          | `app/api/admin/revoke-allow/route.ts`           | No       | Yes       | Deletes override | Admin            |
| `POST /api/admin/alerts/create`         | `app/api/admin/alerts/create/route.ts`          | No       | Yes       | None             | Admin            |
| `POST /api/admin/alerts/toggle`         | `app/api/admin/alerts/toggle/route.ts`          | No       | Yes       | None             | Admin            |
| `POST /api/admin/alerts/delete`         | `app/api/admin/alerts/delete/route.ts`          | No       | Yes       | None             | Admin            |
| `GET /api/debug/integrity`              | `app/api/debug/integrity/route.ts`              | Yes      | No        | None             | Debug token      |
| `GET /api/debug/overrides`              | `app/api/debug/overrides/route.ts`              | Yes      | No        | None             | Debug token      |
| `POST /api/debug/overrides`             | `app/api/debug/overrides/route.ts`              | No       | Yes       | None             | Debug token      |
| `DELETE /api/debug/overrides`           | `app/api/debug/overrides/route.ts`              | No       | Yes       | None             | Debug token      |

### Write-Heavy Routes

1. **`POST /api/admin/blacklist-seller`** - Inserts into `seller_blacklist`, then **deletes all listings** for that seller and logs to `rejected_listings`
2. **`POST /api/admin/hide-listing`** - Deletes a listing from `listings`, logs to `rejected_listings`
3. **`POST /api/alerts/subscribe`** - Creates/updates `email_subscriptions`

---

## 3. Database Interaction Paths

### Database Access Method

All DB access goes through `lib/db.ts`:

```typescript
// lib/db.ts:32-37
export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
) {
  return getPool().query<T>(text, params);
}
```

- **Connection**: Uses `pg.Pool` with `DATABASE_URL` from environment
- **Pooling**: Global singleton in dev, fresh pool per cold start in production
- **No ORM**: Raw SQL queries everywhere

### Routes That Talk to DB Directly

All routes that read/write DB call `query()` directly or via helper functions:

| Route                   | DB Function Path                                                         |
| ----------------------- | ------------------------------------------------------------------------ |
| `/api/deals`            | `dealsQuery.ts` → `lib/db.query()`                                       |
| `/api/search-cards`     | `lib/cards.searchCards()` → `lib/db.query()`                             |
| `/api/admin/*`          | Direct `lib/db.query()` calls                                            |
| `/api/alerts/subscribe` | `lib/emailSubscriptions.createOrUpdateSubscription()` → `lib/db.query()` |
| `/api/health`           | Dynamic import `lib/db.query()`                                          |

### Schema Checks at Runtime

Several routes call schema-check functions on every request:

| Function                           | Purpose                                           |
| ---------------------------------- | ------------------------------------------------- |
| `ensureListingsMarketColumn()`     | Check if `listings.market` column exists          |
| `ensureHistoricalMarketColumn()`   | Check if `historical_prices.market` column exists |
| `ensureListingsIntegrityColumns()` | Check if integrity columns exist                  |
| `ensureDealConfidenceColumn()`     | Check if `deal_confidence_weight` exists          |

These hit the DB on every request to `information_schema.columns`. Results could be cached.

---

## 4. Admin / Auth Behavior

### Admin Authentication System

**Location**: `lib/adminAuth.ts`

**Cookie**: `admin_auth` (value must equal `"1"`)

```typescript
// lib/adminAuth.ts:4-9
export const ADMIN_AUTH_COOKIE = "admin_auth";

export function isAdminAuthenticated(): boolean {
  const cookieValue = cookies().get(ADMIN_AUTH_COOKIE)?.value;
  return cookieValue === "1";
}
```

**Two auth sources**:

1. **Cookie**: `admin_auth=1` (httpOnly, secure, sameSite: strict, 7-day max age)
2. **Header**: `x-admin-secret` must match `process.env.ADMIN_SECRET`

```typescript
// lib/adminAuth.ts:22-38
export function checkAdminApiAuth(request: Request): {
  authorized: boolean;
  source: "cookie" | "header" | null;
} {
  // Check cookie first
  const cookieValue = cookies().get(ADMIN_AUTH_COOKIE)?.value;
  if (cookieValue === "1") {
    return { authorized: true, source: "cookie" };
  }
  // Check header
  const headerSecret = request.headers.get("x-admin-secret");
  const envSecret = process.env.ADMIN_SECRET;
  if (envSecret && headerSecret === envSecret) {
    return { authorized: true, source: "header" };
  }
  return { authorized: false, source: null };
}
```

**Login flow** (`app/api/admin/login/route.ts`):

1. POST with `{ secret: "..." }` in body
2. If matches `ADMIN_SECRET` env var, sets `admin_auth=1` cookie
3. Returns 401 otherwise

### Routes Requiring Admin Auth

| Route                              | Check Function        |
| ---------------------------------- | --------------------- |
| `POST /api/admin/blacklist-seller` | `checkAdminApiAuth()` |
| `POST /api/admin/hide-listing`     | `checkAdminApiAuth()` |
| `POST /api/admin/allow-listing`    | `checkAdminApiAuth()` |
| `POST /api/admin/revoke-allow`     | `checkAdminApiAuth()` |
| `POST /api/admin/alerts/create`    | `checkAdminApiAuth()` |
| `POST /api/admin/alerts/toggle`    | `checkAdminApiAuth()` |
| `POST /api/admin/alerts/delete`    | `checkAdminApiAuth()` |

### Debug Authentication System

**Location**: `lib/debugAuth.ts`

**Cookie**: `dbg_admin` (stores SHA-256 hash of token)

**Three auth sources** (priority order):

1. Cookie with hashed token
2. `x-debug-token` header (raw token)
3. `?token=...` query param (raw token, triggers cookie set + redirect)

**Routes requiring debug auth**:

- `GET /api/debug/integrity`
- `GET/POST/DELETE /api/debug/overrides`

---

## 5. Email / Alert Triggers

### Email Sending

**Location**: `lib/emailQueue.ts`

**Service**: SendGrid API (`https://api.sendgrid.com/v3/mail/send`)

**Env vars**:

- `SENDGRID_API_KEY` - Required for actual sending
- `ALERTS_EMAIL_FROM` - From address (default: `alerts@example.com`)

**Behavior when not configured**:

```typescript
// lib/emailQueue.ts:14-20
if (!SENDGRID_API_KEY) {
  console.warn(
    "[email] SENDGRID_API_KEY not configured. Email would have been:",
    payload
  );
  return;
}
```

### Email Subscription Routes

| Route                                   | Action                                                      |
| --------------------------------------- | ----------------------------------------------------------- |
| `POST /api/alerts/subscribe`            | Creates/updates subscription in `email_subscriptions` table |
| `GET /api/alerts/unsubscribe?token=...` | Sets `unsubscribed_at` on subscription                      |

**Note**: These routes do NOT send emails directly. Email sending happens via the `ops-enable-alerts.yml` GitHub Action workflow which calls `scripts/check-alerts.ts`.

### Alert Processing (External)

Email alerts are triggered by:

- GitHub Action: `.github/workflows/ops-enable-alerts.yml`
- Script: `scripts/check-alerts.ts`

This is outside API route scope but is the actual email sender.

---

## 6. Error Handling & Safety

### Route-by-Route Analysis

| Route                   | Try/Catch | Returns Safe Response            | Input Validation                   |
| ----------------------- | --------- | -------------------------------- | ---------------------------------- |
| `/api/deals`            | No        | Yes (via dealsQuery)             | Param parsing                      |
| `/api/health`           | Yes       | Yes                              | N/A                                |
| `/api/search-cards`     | Yes       | Returns `[]` on error            | Query length check                 |
| `/api/alerts/subscribe` | Yes       | Returns 500 with generic message | Email, cardId, discount validation |
| `/api/admin/*`          | Partial   | Yes                              | Input validation present           |
| `/api/debug/*`          | Yes       | Returns 500 with generic message | Parameter validation               |

### Rate Limiting

Only one route has rate limiting:

**`POST /api/alerts/subscribe`** - Rate limited via `lib/rateLimit.ts`:

- 5 requests per 5 minutes per IP
- Uses `rate_limits` table for sliding window
- Returns 429 with `Retry-After` header

### Missing Guards Observed

1. **No global rate limiting** - Only `/api/alerts/subscribe` is rate limited
2. **No CSRF protection** - API routes rely on SameSite cookies
3. **Debug routes return 404** on auth failure (security by obscurity)

---

## 7. Findings & Follow-ups

### Confirmed Risks

1. **Static admin cookie value** - Cookie value is literally `"1"`, not a session token. If cookie is leaked, attacker has admin access until expiry (7 days). Documented in `lib/adminAuth.ts:8-9`.

2. **No rate limiting on most routes** - Only `/api/alerts/subscribe` has rate limiting. All other routes could be hammered without restriction.

3. **Schema checks on every request** - Functions like `ensureListingsMarketColumn()` query `information_schema` on every page load. Performance overhead.

### Unknowns

1. **IP extraction reliability** - `lib/rateLimit.ts:23-47` extracts IP from headers. If not behind proxy, groups all requests as `"unknown"`.

2. **Rate limit table cleanup** - Cleanup runs with 1% probability per request. Could grow unbounded if low traffic.

3. **Email bounce handling** - No webhook for SendGrid bounces visible in API routes.

### Candidate Follow-up Workstreams

1. **Session-based admin auth** - Replace `admin_auth=1` with cryptographic session tokens
2. **Global rate limiting middleware** - Protect all mutation routes
3. **Cache schema checks** - In-memory cache for `ensureXxxColumn()` results
4. **CSRF token implementation** - For non-cookie auth flows
5. **Structured error responses** - Consistent error format across all routes

---

## Appendix: Evidence Commands

```bash
# Starting HEAD
git rev-parse HEAD
# 6c4de49f24e8d0b7f0feb013dfc8126d7c8c249b

# API route count
find app/api -name "route.ts" | wc -l
# 21

# Admin auth pattern
rg "checkAdminApiAuth" app/api
# 7 files use it

# Email-related files
rg "sendgrid|SENDGRID" --files-with-matches
# lib/emailQueue.ts, .env.example, PROJECT_SSOT.md, etc.
```

---

**LOCKED**: Phase 3B backend audit only; no code/config/workflow edits
**VERIFIED**: Single audit doc created; evidence path-cited; no secrets logged
**REGRESSION**: N/A (read-only)
**OPEN QUESTIONS**: Rate limit reliability on direct connections; email bounce handling

---

**End of Phase 3B Audit**
