# Skill: Primitive Enforcer

## Goal

Prevent variant sprawl from day one.

## Trigger

Any PR that touches UI components OR adds/edits tooltip/skeleton/badge/table/price/error/empty/loading code.

## Non-negotiable rule

One primitive per cross-cutting concern.

## Canonical primitives (placeholders until created)

- TooltipPrimitive (TBD path)
- SkeletonPrimitive (TBD)
- ConfidenceBadgePrimitive (TBD)
- PriceFormatPrimitive (TBD)
- TablePrimitive (TBD)
- Empty/ErrorStatePrimitive (TBD)

## Enforcement behavior (declarative)

- Reviewer/AI MUST STOP if a PR introduces a new component that overlaps a cross-cutting primitive.
- Canonical primitives MUST be reused or extended, not duplicated.

## Required PR evidence

- PR description MUST include: "I used canonical primitive X; no new variants introduced."

## STOP examples (variant sprawl)

- Adding a new tooltip/skeleton/badge/table/price/empty/error component instead of extending the canonical primitive.
- Duplicating formatting helpers for price or confidence display.
- Introducing a new ad-hoc empty/error state pattern when a canonical primitive exists.

## Rebuild Isolation (LOCKED)

- Rebuild implementation must live in a dedicated rebuild namespace/folder tree (name TBD).
- Rebuild code MUST NOT import from legacy paths.
- Legacy is read-only reference; reuse only after passing rebuild contracts.
