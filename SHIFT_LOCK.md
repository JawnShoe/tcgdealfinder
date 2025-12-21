## SHIFT LOCK — 2025-12-18

**SSOT Docs:** `DECISIONS.md` + `REGRESSION_CHECKLIST.md`

### Current Locks
- Watchlist v1 is client-only/localStorage; ⭐ renders on homepage table, `/newest`, `/top-deals`, featured deals, and card detail listings. No backend/ingestion/scoring work exists for watchlist.
- Seller trust layout is fixed: seller name + shield on line one and a muted `⭐ X+ sales` line two (sales badge only when feedback ≥ 100).
- Top Deals columns intentionally stay lean (Card, Total, Historic, Discount, Seller, Market, Ends). Hidden columns still exist in data but remain off UI.
- Global UI scale baseline already increased (~8–10%) via global CSS; treat this as the new reference.
- Pokémon set ingestion flows through the Pokémon TCG API v2 with idempotent upserts keyed by canonical set id (series, release date, total cards, symbol/logo).

### Stop Rules
- Do **not** touch ingestion, scoring, canonical IDs, overrides, or deal query logic.
- Do **not** refactor table/deal components; wrap existing content with the existing shared layout/container.
- Keep scope limited to layout/spacing parity; no new features, no redesigns.


### DONE Gate (LOCKED)
- SSOT cannot mark DONE unless: commit hash recorded, `git status` clean, changes pushed, `npm run lint` pass, `npm run build` pass, and regression checklist completed.

### SHIFT Gate (LOCKED)
- Shift change cannot proceed without a restore point (zip and/or bundle) and dirty-file classification.
- Explicit bans: no stash-as-backup, no delete/clean commands.

### Secret Hygiene (LOCKED)
- No secrets in tracked files (configs, docs, samples).
- Evidence Packet or CI must include a secret scan check.

### Tier-1 Evidence Gate (NEW)
- Tier-1 issues (pricing totals, shipping, dedup integrity, seller trust UI, watchlist persistence, best/featured deal numbers) may not receive a “NO FIX REQUIRED” verdict unless an Evidence Packet is attached.
- Missing or partial evidence must be called out as: `INSUFFICIENT EVIDENCE — NEED DB/UI TRACE`.
- **Evidence Packet** must include: (A) DB query + row values for the specific IDs, (B) two same-surface samples, (C) UI path + exact field rendered, (D) single-sentence call (“DB wrong” or “UI wrong”), (E) if a fix exists: minimal diff summary + verification IDs + lint/build status.
- **Shift handoff checklist for open Tier-1 bugs**: state current hypothesis, attach the evidence gathered so far, note what’s ruled out, and list the next step plus acceptance criteria.
- **Seller identity data sources**: Always document whether evidence references buyer Browse APIs or legacy/decommissioned Shopping API data before opening or closing a Tier-1 seller-identity issue.
