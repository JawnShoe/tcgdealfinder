# Legacy Quarantine (v1)

Purpose:
Quarantine pre-rebuild implementation files that are provably unused by active surfaces, while keeping the build green.

Scope (Bucket A only):
Move files that have no import references in the repo and are not part of the rebuild lane.

Bucket A allowlist (v1):

- components/FeaturedDealsStrip.tsx
- components/home/HomeContentSafe.tsx
- components/SearchAutocomplete.tsx
- components/WatchlistButton.tsx

Rules:

- Moves only. No edits to quarantined files.
- /legacy/\*\* is reference-only. No imports from legacy paths.
- Each quarantine expansion must include an evidence audit and keep npm run build passing.
