# Phase-1 Visual Contract (LOCKED)

Purpose:
Eliminate "vibecoded / AI slop" risk by enforcing a calm, institutional, data-first UI system that scales.

This contract governs all Phase-1 surfaces:

- Discovery (list + card)
- Set pages (discovery w/ locked filter)
- Seller pages
- Detail / expanded rows

## 1. Visual Philosophy (Non-Negotiable)

Core principles

- Interpret less. Show more.
- Calm beats clever.
- Consistency > personality.
- Trust is earned through restraint.
- If a UI choice feels "cool" but not "necessary," it fails this contract.

## 2. Typography Contract

### A. Font usage

- One font family only
- No decorative fonts
- No mixing serif/sans
- Expensive products use boring fonts perfectly.

### B. Type scale (hard limits)

You may only use these semantic roles:

| Role      | Usage                     |
| --------- | ------------------------- |
| Primary   | Price, card name          |
| Secondary | Deal signal, key metadata |
| Tertiary  | Seller, freshness, labels |
| Meta      | Footnotes, provenance     |

Rules

- No ad-hoc font sizes
- No "just one more size"
- Hierarchy is created by weight + spacing, not size chaos

## 3. Color Contract

### A. Color roles (not colors)

You define roles, then map colors once.

Allowed roles:

- text-primary
- text-secondary
- text-muted
- accent-primary (one only)
- state-positive
- state-negative
- border-subtle
- bg-canvas
- bg-surface

Rules

- One accent color only
- State colors used only for meaning
- No gradients as decoration
- Backgrounds are boring on purpose
- If something is colorful, it must earn it.

## 4. Spacing and Density Contract

### A. Spacing is semantic

Spacing communicates grouping, not aesthetics.

Rules

- Equal spacing = equal importance
- Grouped data must be visually grouped
- White space is allowed (and encouraged)
- No "tightening things up" ad-hoc.

### B. Density discipline

- Discovery list = information-dense but calm
- Card view = slightly more breathing room
- Expanded rows = most relaxed spacing
- Density increases only when meaning increases.

## 5. Motion Contract (Critical)

Allowed motion (ONLY these)

- Opacity
- Subtle translate (<= 4px)
- Background position

Forbidden motion

- Height animation
- Width animation
- Layout reflow
- Springy easing
- Attention-seeking motion

Rules

- Motion must never affect layout
- Motion must never convey meaning alone
- Motion must be fast and subtle
- If motion is noticeable, it is wrong.

## 6. Imagery Contract (Card View)

Rules

- One image only
- Fixed aspect ratio
- No carousels
- No zoom
- No hover effects
- Images support recognition, not persuasion.
- If text and trust disappeared, the card must still work.

## 7. Trust Surface Contract

### A. Always visible (collapsed)

- Price
- Deal signal
- Freshness
- Seller identity

### B. Expanded surfaces

- Confidence (explained, not asserted)
- Price context
- Seller detail (if available)
- Provenance / limitations

Language rules

- No hype
- No certainty without evidence
- Always say what is unknown
- Transparency beats confidence early.

## 8. Interaction Contract (Re-affirmed)

| Action          | Result                      |
| --------------- | --------------------------- |
| Card name       | External listing (commit)   |
| Set name        | Discovery w/ set filter     |
| Pokemon name    | Discovery w/ Pokemon filter |
| Seller name     | Seller page                 |
| Row / card body | Expand                      |
| New expand      | Auto-collapse previous      |

No ambiguity. Ever.

## 9. State and Memory Contract

The system should quietly remember:

- List vs card view
- Sort order
- Filters (within session / reasonable persistence)

Never announce this.
Just feel respectful.

## 10. What This Contract Explicitly Forbids

- Gamification
- Urgency language
- "Hot deal" badges
- Decorative UI
- New primitives without doctrine update
- Silent state changes
- Hidden trust information

If it looks like marketing, it does not belong.

## 11. Litmus Test (use this forever)

Before approving any UI change, ask:

"Would this still feel trustworthy if the prices were wrong?"

If the answer is no - it violates the contract.
