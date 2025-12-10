# TCG Deal Finder (Pokémon)

Simple Next.js App Router starter for underpriced Pokémon card listings.

## Prerequisites
- Node.js 18.17+ and npm
- A Postgres connection string in `DATABASE_URL`

## Setup
1) Install dependencies:
```bash
npm install
```

2) Create your environment file:
```bash
cp .env.example .env.local
```
Then fill in `DATABASE_URL`, `EBAY_APP_ID`, `EBAY_PARTNER_CAMPAIGN_ID`, and `EBAY_PARTNER_CUSTOM_ID`.

3) Run the dev server:
```bash
npm run dev
```

Open http://localhost:3000 to view the app. The health check is available at http://localhost:3000/api/health.
