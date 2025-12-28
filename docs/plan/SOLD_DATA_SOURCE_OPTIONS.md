# Sold Data Source Options (for Option A USD Baselines)

**Status**: DRAFT  
**Last Updated**: 2025-12-28  
**STOP**: USD sold baselines are blocked until an approved sold-data source is selected.

## Context

- Phase 2 requires sold comps per `card_id` to compute strict USD baselines (`baseline_median_usd`, minComps=30).
- PR #103 (FindingService `findCompletedItems`) is rejected due to quota/RateLimiter failures and the completed-items access path being deprecated/restricted.

---

## Option A — eBay Marketplace Insights API (official)

**What it is**: eBay’s official Marketplace Insights API (Buy APIs) for sales/price insights data (see docs).

**Pros**

- Official, compliant source with clear terms of use.
- Reduces reliance on deprecated/unstable endpoints.

**Cons / Risks**

- Requires explicit access approval / scope enablement from eBay.
- Quota/capability constraints are unknown until granted.

**Access / approval steps (recommended)**

1. **Who to contact**: eBay Developer Program Support (Technical Support ticket) at `https://developer.ebay.com/support`.
2. **Where in the portal**: Support → Technical Support → create a new ticket (wording may vary).
3. **What to request (copy/paste checklist)**:
   - Request: enable **Marketplace Insights API** access for the production keyset used by this repo.
   - Request: enable the Marketplace Insights OAuth scope (commonly `https://api.ebay.com/oauth/api_scope/buy.marketplace.insights`; current token requests return `invalid_scope` in this repo’s keyset).
   - Provide: use case (“compute per-card sold-comp baselines for a card deals app”), intended markets (US/CA/GB/AU), expected call volume, and that no user PII is stored.
   - Ask: confirm rate limits/quotas, any required agreements, and whether sandbox access is available for integration testing.

---

## Option B — Vetted third-party licensed provider

**What it is**: A commercial provider licensed to distribute eBay sold/market data (or equivalent) with explicit reuse rights.

**Pros**

- Potentially faster to obtain than eBay-gated APIs.
- Vendor SLAs, support, and stable contracts can reduce operational risk.

**Cons / Risks**

- Cost + licensing/legal review required.
- Provenance and mapping quality (provider → `card_id`) must be validated to avoid silent baseline corruption.

---

## Option C — Active-listings baseline (requires Product Truth unlock)

**What it is**: Use active listing totals as a baseline proxy (ask-price baseline), instead of sold comps.

**Pros**

- Immediately available from existing ingestion data.

**Cons / Risks**

- Not a sold-truth baseline; conflicts with the intended meaning of “sold baseline” and would require an explicit Product Truth / Philosophy unlock before proceeding.
