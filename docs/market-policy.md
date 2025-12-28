# Market Support Policy

We ingest live listings from eBay’s Browse API across multiple marketplaces. To keep rankings trustworthy we apply the following rules:

1. **Supported marketplaces**: `EBAY_US`, `EBAY_CA`, `EBAY_GB`, `EBAY_AU` (others can be added later). Each listing retains its source marketplace code. Source of truth: `lib/markets.ts` (`SUPPORTED_MARKETS`, `MARKET_CURRENCIES`, `SUPPORTED_CURRENCIES`).
2. **Currency handling**: every listing stores `sourceCurrency`, `fxRateToCad`, and `fxCapturedAt`. We convert to CAD to keep heuristics comparable, but we always retain the original currency metadata so downstream logic can reason about FX drift.
3. **Ranking + filters**:
   - Default “Top deals” should run per-market (e.g. “Top deals – US”). Cross-market views are allowed only when price columns clearly show the market label; users should be able to filter by market explicitly.
   - When a listing’s market differs from the current view, we badge it with the market code so there’s no silent mixing.
4. **Data contracts**: the `listings` table and API payloads must expose `market`, `sourceCurrency`, `fxRateToCad`, and `fxCapturedAt`. New ingests must populate these for every listing.
5. **Future behaviour**: if a market is temporarily unsupported, ingestion should drop those entries and the UI will display a “US market only” notice.

Implementation steps after this doc:

1. Alter `listings` to add the FX metadata columns.
2. Update `fetchEbayListings` callers to calculate FX metadata when eBay doesn’t already return CAD.
3. Update queries/filters so users can select markets independently.
