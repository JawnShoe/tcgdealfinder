# Rebuild Release Checklist (Week 0)

## Binder-lite docs present

- PRD_LITE.md
- TRUST_METRICS.md
- NON_NEGOTIABLES.md
- CONTRACTS.md
- VISUAL_CONTRACT.md
- RELEASE_CHECKLIST.md
- ADR_LOG.md

## Phase 0 skills present (declarative)

- skills/primitive-enforcer/SKILL.md
- skills/rebuild-contract-guard/SKILL.md
- skills/pr-impact-declaration/SKILL.md

## CI gates

- Lint (hard-pass)
- Typecheck (hard-pass)
- Unit tests (hard-pass)
- E2E smoke (EXEMPT TEMP) - unblock: Playwright config + rebuild route smoke
- Visual regression/CLS (EXEMPT TEMP) - unblock: visual baseline + CLS capture
- A11y smoke (EXEMPT TEMP) - unblock: a11y runner + baseline
- Perf budget (EXEMPT TEMP) - unblock: budget definition + measurement harness

## Exemptions recorded

- EXEMPT (TEMP) gates are labeled in workflow, this checklist, and ADR-0002.

## Runbooks (Ops Readiness)

### Ingestion stale

Symptom signals:

- /rebuild/ops shows Job freshness = STALE or UNAVAILABLE.
- Latest updated_at is older than 6 hours.

Verification steps:

- Open /rebuild/ops and confirm Job freshness status.
- Review logs for "rebuild.ops.render" and "rebuild.data" warnings.

Likely causes:

- Ingestion job not running or failing upstream.
- Source API throttling or credentials expired.
- DB connectivity issues.

Immediate mitigations:

- Enable KILL_FEATURE_REBUILD_DISCOVERY and KILL_FEATURE_REBUILD_LISTING_DETAIL.
- Communicate "data temporarily unavailable" on rebuild surfaces.

Recovery criteria:

- Job freshness returns to OK with a new updated_at within SLO.
- Listings last 24h returns a non-zero count.

### Source down

Symptom signals:

- /rebuild/ops shows API error rate = ERROR or NO DATA.
- /api/health shows degraded status or upstream errors.

Verification steps:

- Check /api/health response body and x-request-id header.
- Query rebuild_api_requests for elevated error rates.

Likely causes:

- Upstream source outage.
- Auth tokens expired.
- Network connectivity issues.

Immediate mitigations:

- Enable KILL_FEATURE_REBUILD_DISCOVERY and KILL_FEATURE_REBUILD_LISTING_DETAIL.
- Disable outbound click tracking via KILL_INTEGRATION_OUTBOUND_CLICK if needed.

Recovery criteria:

- API error rate returns to OK.
- New successful requests recorded within the monitoring window.

### DB slow

Symptom signals:

- /rebuild/ops latency card shows elevated P95.
- Logs show increased durationMs for rebuild routes.

Verification steps:

- Review /rebuild/ops latency metrics.
- Inspect logs for slow requestId samples.

Likely causes:

- DB underprovisioned or overloaded.
- Long-running queries or missing indexes.

Immediate mitigations:

- Enable KILL_ROUTE_REBUILD_OPS if ops queries are causing load.
- Reduce rebuild traffic by enabling KILL_FEATURE_REBUILD_DISCOVERY or KILL_FEATURE_REBUILD_LISTING_DETAIL.

Recovery criteria:

- P95 latency returns to normal range.
- Slow request logs clear.

### Rate-limit triggers

Symptom signals:

- Upstream responses indicate 429/5xx.
- /rebuild/ops API error rate spikes with short windows.

Verification steps:

- Review rebuild_api_requests for status spikes.
- Confirm upstream rate limit headers if available.

Likely causes:

- Burst traffic exceeding upstream limits.
- Misconfigured retry logic.

Immediate mitigations:

- Enable KILL_FEATURE_REBUILD_DISCOVERY temporarily to reduce load.
- Consider disabling outbound clicks via KILL_INTEGRATION_OUTBOUND_CLICK if needed.

Recovery criteria:

- Error rate normalizes and upstream responses return to 2xx.

## Kill switches (rebuild lane)

Defaults: OFF (unset).

- KILL_INTEGRATION_OUTBOUND_CLICK
  - Effect: Disable outbound click recording.
  - Enforced in: app/api/rebuild/outbound-click/route.ts

- KILL_ROUTE_REBUILD_OPS
  - Effect: Disable /rebuild/ops route and render a safe "temporarily disabled" state.
  - Enforced in: app/rebuild/ops/page.tsx

- KILL_FEATURE_REBUILD_DISCOVERY
  - Effect: Disable /rebuild/discovery content and render a safe "temporarily disabled" state.
  - Enforced in: app/rebuild/discovery/page.tsx

- KILL_FEATURE_REBUILD_LISTING_DETAIL
  - Effect: Disable /rebuild/listing/[id] content and render a safe "temporarily disabled" state.
  - Enforced in: app/rebuild/listing/[id]/page.tsx

## Decommission Gates

Required before any legacy deletion PR can merge:

1. **Parity defined + verified**: Rebuild equivalent exists and behavior is documented in Upgrade Ledger (ADR-0019)
2. **Tests updated**: E2E/visual/a11y/perf tests updated as applicable for the migrated surface
3. **Synthetics updated**: If flows change, synthetics (rebuild.synthetics.guarantee.spec.ts) updated to cover new paths
4. **VISUAL_CONTRACT updated**: If user-visible changes, VISUAL_CONTRACT compliance confirmed and any contract updates merged
5. **TRACKER_EVIDENCE row added**: Migration PR recorded in TRACKER_EVIDENCE.md with Before/After/Why and evidence links

## A11y Baseline Evidence (Keyboard-only pass)

Date: 2026-01-11

### /rebuild

- Tab reaches "Browse deals" link and any deal link when data is present.
- Focus outline visible on links and controls (browser default).
- Enter activates "Browse deals".
- Provenance drilldown summary toggles via Enter/Space.
- No keyboard traps observed.

### /rebuild/discovery

- Tab reaches listing links and the Sort select.
- Sort select has an accessible label ("Sort") and is keyboard operable.
- Focus outline visible on links and controls (browser default).
- Enter activates listing links.
- Provenance drilldown summary toggles via Enter/Space.
- No keyboard traps observed.

### /rebuild/listing/[id]

- Tab reaches "Back to Discovery" and "View original listing" links.
- Focus outline visible on links and controls (browser default).
- Enter activates "Back to Discovery".
- Outbound link is focusable and labeled.
- Provenance drilldown summary toggles via Enter/Space.
- No keyboard traps observed.

### Outbound click flow

- "View original listing" is focusable and activates via keyboard.
- Outbound link has visible label; no icon-only controls.

### Component-level checks (rebuild routes)

- Tooltip: none used on rebuild routes.
- Dialog/Menu: none used on rebuild routes.
- Combobox: PreferencesBar Sort select is labeled ("Sort") and keyboard operable.
- Table sorting headers: no sortable tables in rebuild routes.
- Icon-only controls: none present on rebuild routes.
