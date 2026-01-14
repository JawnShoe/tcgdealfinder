# Trust Metrics

## Freshness SLOs

- Price/availability data age <= X minutes from source update.
  - X: TBD (initial target: 15m).
  - CI assertion: max(data_age_minutes) <= X at render.
- Seller feedback age <= Y hours from source update.
  - Y: TBD (initial target: 24h).
  - CI assertion: max(seller_feedback_age_hours) <= Y.

## Reliability SLOs

- Input failure rate < 0.1%.
  - Failure = missing critical fields OR parsing errors that change meaning OR invalid normalization (currency, condition, quantity).
  - CI assertion: failure_rate = failures / total_inputs < 0.1% per ingestion run.

## Confidence Score (SSR-only)

- Composite score 0-100 computed server-side only.
- Factor families: freshness, source reputation, price stability, seller signals, rules-based risk flags.
- Deterministic: same inputs => same output.
  - CI assertion: hash(inputs) yields identical score.
- Explainability: every confidence value must be reproducible with same inputs.
- Required provenance fields at render: fetched_at, source, parser_version, confidence_inputs_hash, data_age_minutes.

---

## Track B Baselines (Measured, not vibes)

### B1 Performance Baselines (targets)

Core Web Vitals targets (rebuild lane):

- LCP: <= 2.5s (p75)
- INP: <= 200ms (p75)
- CLS: <= 0.1 (p75)

Measurement method:

- CI gates: Perf Budget + Visual Regression/CLS (required on every PR)
- Periodic: Lighthouse CI baseline + WebPageTest spot checks (as scheduled/needed)
- Optional later: RUM via Next.js web-vitals reporting

Route performance budget (guardrails):

- Must not regress Perf Budget gate
- Must not regress CLS gate

### B1 Measurement + Proof (authoritative)

Enforced metrics (CI must fail on regression):

- CLS: tests/e2e/rebuild-cls.spec.ts (CI job: Visual Regression / CLS).
- LCP, FCP, TBT, performance score: .lighthouserc.cjs (CI job: Perf Budget).
- SSR trust surfaces + no pop-in metadata: tests/e2e/rebuild.synthetics.spec.ts (CI job: E2E Smoke).
- Trust panel no-mutation (listing): tests/e2e/rebuild-trust-panel.spec.ts (CI job: E2E Smoke).

Deferred metrics (not yet enforced; must remain marked DEFERRED):

- INP: DEFERRED (no CI gate yet).
- TTFB: DEFERRED (no CI gate yet).

## Input Validation Metrics (B5)

Validation failure definition:

- A validation failure occurs when an API payload fails schema validation at the boundary.

Detection and enforcement:

- CI unit tests: lib/**tests**/unit/rebuildSecurityBaseline.test.ts (invalid payload returns 400; valid payload passes).
- Runtime logging: validation failures must log route + requestId (see NON_NEGOTIABLES and CONTRACTS).

## Structured Data Validation (B6)

Validation failure definition:

- Missing required JSON-LD keys for WebApplication or Product/Offer.
- Invalid types or empty required fields (title/description, canonical, offer price+currency when present).

Detection and enforcement:

- Unit tests: lib/**tests**/unit/rebuildSeoBaseline.test.ts (canonical + JSON-LD shape).
- E2E smoke: tests/e2e/rebuild.synthetics.spec.ts (SSR HTML includes canonical, robots meta, and JSON-LD).

## Trust Invariants (C1)

Trust properties measured:

- Confidence weight -> label mapping is deterministic.
- Fetched-at timestamp is present for trust surfaces.
- Freshness state (fresh/stale) follows the SLO threshold.
- Integrity flags are surfaced as degraded trust state.

Detection and enforcement:

- Unit tests: lib/**tests**/unit/rebuildTrustInvariants.test.ts (assessment state + invariant violations).
- Unit tests: lib/**tests**/unit/rebuildListingMapper.test.ts (trustAssessment is VERIFIED for good data).

Failure behavior:

- Trust invariant violations fail CI (test:unit).

## Resilience Coverage (C4)

Resilience tier coverage measured:

- All rebuild routes evaluate resilience tier using `evaluateResilience()`.
- Tier label is SSR-visible (`data-testid="resilience-label"` with `data-tier` attribute).
- Tier selection is deterministic (same inputs → same tier).
- No silent degradation (every non-LIVE tier displays explanation).

Detection and enforcement:

- Unit tests: `lib/__tests__/unit/rebuildResilienceEvaluator.test.ts` (one test per tier, deterministic ordering).
- E2E tests: `tests/e2e/rebuild.synthetics.spec.ts` (SSR visibility, data-tier attribute present on all routes).

Failure behavior:

- Missing or incorrect tier logic fails CI (test:unit).
- Missing SSR tier label fails CI (E2E Smoke).

## Perceived Speed Enforcement (C5)

Properties measured (CI-enforced):

- Skeleton coverage exists for rebuild routes (route `loading.tsx` present and exercised).
- Deferred secondary content (if present) renders a skeleton in SSR HTML and swaps without layout shift.
- Intent prefetch is wired for rebuild navigation (hover/focus/touch triggers prefetch; no eager prefetch).

Detection and enforcement:

- E2E: `tests/e2e/rebuild.synthetics.spec.ts` (priority hydration SSR fallback markers; intent-prefetch wiring).
- CLS: `tests/e2e/rebuild-cls.spec.ts` (visual regression budget must remain green).

Failure behavior:

- Missing skeleton markers / broken priority hydration / missing intent-prefetch wiring fails CI (E2E Smoke).
