# Audit Artifact (Temporary)

**Phase**: 1 — Inventory
**Created**: 2025-12-26
**Collapses into**: PROJECT_SSOT.md
**Delete/Archive after**: Full Audit Closeout

---

# Repository Inventory

## 1) High-Level Repository Summary

### Tech Stack (as observed)

| Layer         | Technology   | Version/Notes                            |
| ------------- | ------------ | ---------------------------------------- |
| Framework     | Next.js      | 14.2.35 (pinned)                         |
| Language      | TypeScript   | 5.4.5                                    |
| UI            | React        | 18.3.1                                   |
| Styling       | Tailwind CSS | 4.1.18 (v4)                              |
| Database      | PostgreSQL   | Via `pg` 8.11.5 (Neon implied from docs) |
| Charts        | Recharts     | 3.5.1                                    |
| Scraping      | Cheerio      | 1.1.2                                    |
| Observability | Sentry       | @sentry/nextjs 10.32.1                   |
| Node Runtime  | Node.js      | >=18.17.0 (20 used in CI)                |
| Package Mgr   | npm          | package-lock.json present                |

### App Type

- **Monolith**: Single Next.js application
- **Hybrid rendering**: Mix of SSR, SSG, and dynamic routes

### Primary Runtime(s)

- Node.js server (Next.js API routes)
- Edge runtime (Sentry edge config present)
- Browser client (React SPA portions)

---

## 2) File Tree Overview

```
tcg-deal-finder/
├── .claude/                    # Claude Code configuration
├── .github/                    # GitHub Actions workflows + Dependabot
│   └── workflows/              # CI, data pipelines, ops workflows (4 files)
├── .husky/                     # Git hooks (pre-commit)
├── .restorepoints/             # Bundle archives (gitignored)
├── app/                        # Next.js App Router pages + API routes
│   ├── admin/                  # Admin panel page
│   ├── alerts/                 # Email alerts subscription page
│   ├── api/                    # API routes (13 route groups)
│   ├── cards/                  # Card detail pages
│   ├── catalog/                # Card catalog browser
│   ├── debug/                  # Debug/diagnostic pages
│   ├── ending-soon/            # Ending soon deals page
│   ├── newest/                 # Newest deals page
│   ├── search/                 # Search page
│   ├── sets/                   # Pokemon sets browser
│   ├── top-deals/              # Top deals page
│   └── watchlist/              # User watchlist page
├── components/                 # React components (31 files)
│   └── home/                   # Homepage-specific components
├── docs/                       # Documentation
│   ├── archive/                # Historical/completed docs (14 files)
│   ├── audit/                  # Audit evidence (2 files)
│   └── ui/                     # UI contracts (1 file)
├── lib/                        # Shared library code
│   └── __tests__/              # Unit + integration tests
├── migrations/                 # SQL migration files (7 files)
├── public/                     # Static assets (empty)
├── scripts/                    # CLI scripts + data pipelines
│   ├── __tests__/              # Script tests
│   ├── migrations/             # Legacy migration (archived)
│   └── one-off/                # One-time utility scripts
└── types/                      # TypeScript type definitions
```

---

## 3) File Counts

**Total files (excluding node_modules, .git, .next)**: 355

### Breakdown by Category

| Category            | Count | Notes                                      |
| ------------------- | ----- | ------------------------------------------ |
| **Frontend (app/)** | 49    | Pages, layouts, API routes                 |
| **Components**      | 31    | React components                           |
| **Library (lib/)**  | 52    | Shared logic + tests                       |
| **Scripts**         | 114   | Data pipelines, utilities, one-off scripts |
| **Docs**            | 26    | Markdown documentation                     |
| **DB Migrations**   | 7     | SQL migration files                        |
| **Types**           | 2     | TypeScript type definitions                |
| **Config/Other**    | ~74   | package.json, configs, workflows, etc.     |

### By File Extension

| Extension | Count |
| --------- | ----- |
| .ts       | 214   |
| .tsx      | 55    |
| .md       | 32    |
| .sql      | 17    |
| .json     | 6     |
| .yml      | 5     |

---

## 4) Entry Points Identified

### Frontend Entry

- `app/layout.tsx` — Root layout
- `app/page.tsx` — Homepage

### API Entry Points

| Route Group                 | Purpose                         |
| --------------------------- | ------------------------------- |
| `/api/deals`                | Main deals query endpoint       |
| `/api/cards/[cardId]`       | Card detail data                |
| `/api/historicals/[cardId]` | Historical price data           |
| `/api/search-cards`         | Card search autocomplete        |
| `/api/watchlist-cards`      | Watchlist card fetching         |
| `/api/market`               | Market preference setting       |
| `/api/listings/by-ebay-id`  | Listing lookup by eBay ID       |
| `/api/alerts/subscribe`     | Email alert subscription        |
| `/api/alerts/unsubscribe`   | Email alert unsubscription      |
| `/api/admin/*`              | Admin panel APIs (6 sub-routes) |
| `/api/debug/*`              | Debug/diagnostic endpoints      |
| `/api/health`               | Health check endpoint           |

### Background Jobs / Schedulers

| Script                                | Purpose                    | Trigger                         |
| ------------------------------------- | -------------------------- | ------------------------------- |
| `scripts/update-listings.ts`          | Refresh eBay listing data  | GitHub Actions cron (\*/30)     |
| `scripts/check-alerts.ts`             | Process email alerts       | Manual dispatch only (disabled) |
| `scripts/update-historical-prices.ts` | Update price history       | GitHub Actions cron (3 AM)      |
| `scripts/update-sold-listings.ts`     | Update sold listing status | GitHub Actions cron (4 AM)      |
| `scripts/update-fx-rates.ts`          | Show/update FX rates       | Manual only                     |

### Admin Surfaces

- `/admin` — Admin panel (blacklist, alerts, listings management)
- `/debug/exclusions` — Quarantined listings debug view (requires token)

---

## Notes (No Speculation)

- Build artifacts excluded from counts (.next/, node_modules/)
- public/ directory exists but is empty
- .restorepoints/ contains bundle archives (gitignored)
- No secrets observed in source files
- Tests organized into unit/ and integration/ directories

---

**Audit Status**: Inventory complete. No code changes made.
