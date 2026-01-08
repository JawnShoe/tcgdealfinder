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
