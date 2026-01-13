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
