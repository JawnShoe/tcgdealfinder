# Rebuild Contracts

## Visual Contract

See docs/rebuild/VISUAL_CONTRACT.md.

## Doctrine Ratification Gate

Any cross-cutting decision (UI behavior, visual system, trust semantics, data interpretation, architecture) that is explicitly marked as "LOCKED", "final", or "canonical" MUST be ratified via a docs-only PR before:

- implementation begins
- implementation guardrails are defined
- enforcement is discussed

Chat agreement alone is not authoritative.

## State & Decision Query Guardrail (LOCKED)

For any question asking about:

- current state ("where are we at")
- next steps
- whether something is correct/complete
- what was previously decided

The Assistant MUST either:

1. Quote the authoritative artifact (file + section or PR), or
2. Respond ONLY with: "STOP — authoritative artifact required."

Inference, memory recall, or conversational summaries are not allowed.

## Rebuild Data Availability Contract (Build-safe)

- If `DATABASE_URL` is missing, rebuild list fetches return empty results and detail fetches return null.
- Rebuild pages MUST render a "data unavailable in this environment" empty state when DB is not configured.
- Rebuild pages MUST NOT fail CI builds due to missing DB configuration.

## Rate Limiting / Abuse Contract (Rebuild Lane)

Public routes:

- App-level rate limiting is not applied to rebuild pages in v0. Abuse mitigation is handled by CDN/WAF baselines (see WAF/CDN Baseline).

Public API endpoints (rebuild):

- MUST enforce segmented rate limits per endpoint class (no single global bucket).
- On limit hit: return 429 with JSON `{ ok: false, error: "rate_limited" }`.
- MUST include `x-request-id` and `retry-after` headers.
- MUST log rate-limit hits with route + requestId.

Internal APIs (if added):

- MUST use separate buckets from public endpoints.

Jobs:

- Job entrypoints must include per-job throttles or gates. If no public job endpoint exists, this is N/A.

## Input Validation Contract (Rebuild Lane)

- API routes that accept input MUST validate payloads at entry.
- Validation failures MUST return 400 with `{ ok: false, error: "invalid_payload" }`.
- Validation failures MUST NOT leak stack traces or internal details.

## Failure / Degradation Contract (Rebuild Lane)

- DB unavailable: follow the Rebuild Data Availability Contract (empty list or null detail + safe empty-state UI).
- Rate limit hit: return 429 with `{ ok: false, error: "rate_limited" }` and log the hit.
- Validation failure: return 400 with `{ ok: false, error: "invalid_payload" }`.
- Unexpected server error: return 500 with `{ ok: false, error: "server_error" }` and log the error with requestId.
- Upstream source unavailable: return 503 with `{ ok: false, error: "upstream_unavailable" }` if a rebuild integration exists (DEFERRED until integrations are introduced).

## Resilience Tiers Contract (C4)

Rebuild routes MUST evaluate and display one of five mutually exclusive resilience tiers. Tier selection is deterministic (same inputs → same tier).

### Tiers (priority order)

| Tier        | Condition                                   | Required Behavior                          |
| ----------- | ------------------------------------------- | ------------------------------------------ |
| LIVE        | DB + integrations healthy, data fresh       | Full data, normal UI                       |
| CACHED      | DB unavailable, cache available and fresh   | Cached data + "Cached" label               |
| STALE       | Cache expired but usable (exceeds 15m SLO)  | Stale data + "Stale" label + stale warning |
| PARTIAL     | Some required fields unavailable or no data | Missing fields hidden + explanation        |
| UNAVAILABLE | No safe data source                         | Empty state + reason + retry guidance      |

### Required surfaces

All rebuild routes MUST wire C4 behavior:

- /rebuild
- /rebuild/discovery
- /rebuild/listing/[id]
- /rebuild/alerts
- /rebuild/ops (displays tier status for all routes)

### Implementation requirements

1. **Domain-level evaluator**: `lib/rebuild/resilience/evaluateResilience.ts` is a pure function (no IO, no framework imports). Inputs: `dbAvailable`, `cacheAvailable`, `cacheAgeMs`, `requiredFieldsPresent`, `dataCount`. Outputs: `tier`, `explanation`, `uiFlags`.

2. **SSR-first**: Tier label MUST be visible in SSR HTML (`data-testid="resilience-label"` with `data-tier` attribute).

3. **Deterministic**: Same inputs → same outputs. No timestamps, randomness, or environment-dependent branching in tier selection.

4. **Explicit degradation**: No silent failures. Every degraded state MUST be labeled.

### UI Flags

The evaluator returns UI flags for consistent degradation behavior:

- `showRetry`: Display retry guidance
- `showStaleWarning`: Indicate stale data
- `showCachedLabel`: Indicate cached mode
- `showPartialWarning`: Indicate partial data
- `hidePrice`: Hide price when unreliable

### CI enforcement

- Unit tests: `lib/__tests__/unit/rebuildResilienceEvaluator.test.ts` (one test per tier)
- E2E tests: `tests/e2e/rebuild.synthetics.spec.ts` (SSR visibility + data-tier attribute)

## WAF / CDN Baseline (Rebuild Lane)

- Baseline posture: bot mitigation + abuse throttling for public routes and APIs.
- Enforcement lives at CDN/WAF configuration (DEFERRED; not CI-verifiable in repo).
- Any WAF/CDN changes must be documented in ADR with owner and enforcement path.

## SEO Baseline (Rebuild Lane)

Canonical rules:

- /rebuild -> canonical /rebuild
- /rebuild/discovery -> canonical /rebuild/discovery plus only `sort` when non-default; all other params are ignored
- /rebuild/listing/[id] -> canonical /rebuild/listing/<id>

Indexing rules:

- /rebuild, /rebuild/discovery, /rebuild/listing/[id] are indexable.
- /rebuild/alerts and /rebuild/ops are noindex (robots meta + robots.txt disallow).

Metadata rules:

- Title format: Rebuild <Page> | TCG Deal Finder (listing: Rebuild Listing - <title> | TCG Deal Finder).
- Meta description must be present and non-empty on all rebuild routes.

robots/sitemap:

- robots.txt must publish sitemap.xml and disallow /rebuild/ops and /rebuild/alerts.
- sitemap.xml must include /rebuild, /rebuild/discovery, and listing URLs when DB is configured.

## Structured Data Contract (Rebuild Lane)

- WebApplication JSON-LD is emitted site-wide (rebuild routes inherit from root layout).
- Listing detail emits Product JSON-LD with:
  - name, sku, url (canonical rebuild URL)
  - Offer data only when price + currency are known
  - No misleading availability or price claims when data is unknown
- JSON-LD must be SSR and valid JSON (no client-only emission).

## Trust Contract (Rebuild Lane)

Trust signals (conceptual, non-UI):

- Confidence (stored weight + deterministic label).
- Freshness (data age + SLO state).
- Provenance (source + fetched-at).
- Integrity flags (integrity status + shipping known).

Guarantees:

- Trust signals are SSR-first and deterministic (same inputs -> same outputs).
- Confidence display MUST map directly to stored confidence weight (no hidden recalculation).
- Provenance fields required at render: source, fetched_at, data_age.

Degraded states:

- If confidence weight or fetched-at is missing: trust state is "insufficient" and reasons must be disclosed.
- If data is stale, integrity is flagged, or shipping is unknown: trust state is "degraded" and reasons must be disclosed.
- DB unavailable: follow Rebuild Data Availability Contract (safe empty-state, no trust assertions).

## Tooltip / Popover Contract

- MUST use a single canonical tooltip/popover primitive.
- MUST NOT encode critical meaning on hover only.
- Trust metadata MUST be visible at first render in the viewport.
- Tooltip content may only enhance; it must not change meaning or layout.

## Hydration Tiers Contract

- SSR-only: rendered entirely on the server with no client mutation.
- SSR + hydrate: server-rendered, then hydrated without semantic change.
- CSR-only: client-rendered only; NOT allowed for trust-critical data.
- Price, confidence, and trust metadata MUST be SSR-only or SSR + hydrate with no mutation.
- Hydration MUST NOT change values shown on first render.

## Skeleton / Loading Contract

- Skeletons MUST reserve final dimensions to prevent layout shift.
- Skeletons MUST be replaced by final content without CLS.
- Loading states MUST NOT hide already-available trust metadata.

## Perceived Speed Contract (Rebuild Lane)

Skeleton coverage (dimension-correct):

- Every rebuild route MUST have a `loading.tsx` that uses rebuild skeleton primitives (`components/rebuild/Skeleton.tsx`).
- Skeletons MUST reserve final dimensions (no unknown/auto height for primary sections).
- CLS MUST remain within the enforced budget (see `tests/e2e/rebuild-cls.spec.ts`).

Priority hydration (ordering):

- Trust surfaces (confidence, provenance, resilience, compliance disclosure) MUST be SSR-first and MUST NOT be deferred.
- Secondary, below-the-fold content MAY be deferred only via `components/rebuild/PriorityHydration.tsx` with a skeleton fallback.
- Deferred fallbacks MUST be SSR-visible and MUST swap to content without layout shift.

Prefetch on intent (rebuild-only):

- Rebuild-to-rebuild navigation links MUST use `components/rebuild/IntentPrefetchLink.tsx`.
- Eager prefetch MUST be disabled (`prefetch={false}`); prefetch MUST occur only on intent (hover/focus/touch).

Enforcement (CI):

- Perceived speed behavior is enforced by `tests/e2e/rebuild.synthetics.spec.ts` and CLS budget by `tests/e2e/rebuild-cls.spec.ts`.

## Route Performance Contracts (Rebuild Lane)

### /rebuild (Home)

- First paint MUST include: header, resilience label, compliance disclosure, and provenance summary (fetched-at when DB is configured).
- Streaming: not used. SSR-only for the shell and trust surfaces.
- Loading/empty/error: must use rebuild skeleton/empty/error patterns without CLS.
- Images: any above-the-fold image MUST declare fixed dimensions (width/height) or reserved space.
- Caching: none (dynamic SSR; no ISR guarantees).

### /rebuild/discovery

- First paint MUST include: header, resilience label, compliance disclosure, and provenance summary (fetched-at when DB is configured).
- Streaming: not used. SSR-only for the shell and trust surfaces.
- Loading/empty/error: must use rebuild skeleton/empty/error patterns without CLS.
- Images: any above-the-fold image MUST declare fixed dimensions (width/height) or reserved space.
- Caching: none (dynamic SSR; no ISR guarantees).

### /rebuild/listing/[id]

- First paint MUST include: price, confidence, trust panel, and provenance (no client-only trust).
- Streaming: not used for trust/price surfaces; SSR-only for trust/price.
- Loading/empty/error: must use rebuild skeleton/empty/error patterns without CLS.
- Images: any above-the-fold image MUST declare fixed dimensions (width/height) or reserved space.
- Caching: none (dynamic SSR; no ISR guarantees).

### /rebuild/alerts

- First paint MUST include: alerts shell + compliance disclosure.
- Streaming: not used; SSR shell only (static SSR is acceptable).
- Loading/empty/error: must use rebuild skeleton/empty/error patterns without CLS.
- Images: any above-the-fold image MUST declare fixed dimensions (width/height) or reserved space.
- Caching: static SSR is acceptable; no runtime cache guarantees.

### /rebuild/ops

- First paint MUST include: ops shell + dashboard section headers.
- Streaming: not used; SSR-only for the shell.
- Loading/empty/error: must use rebuild skeleton/empty/error patterns without CLS.
- Images: any above-the-fold image MUST declare fixed dimensions (width/height) or reserved space.
- Caching: none (dynamic SSR; no ISR guarantees).
