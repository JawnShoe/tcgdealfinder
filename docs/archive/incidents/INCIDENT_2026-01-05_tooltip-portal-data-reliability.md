# Incident: TooltipPopover/Data Reliability — PR #219 Rejected

**Date**: 2026-01-05
**Status**: CLOSED (rejected; rebuild decision)
**Impacted Routes**: `/`, `/top-deals`, `/newest`, `/cards/[id]`

## Summary

Data Reliability (?) tooltip unreliable on hover across multiple routes. PR #219 attempted portal positioning fix via measure-then-show + position recompute; rejected after Operator visual check confirmed tooltip still fails to appear reliably on hover.

## Symptom

Tooltip sometimes appears only after tab away/back. Focus/tab interaction may work when hover does not. Operator confirms still broken on PR #219 branch.

## What Was Attempted

**PR #219**: https://github.com/JawnShoe/tcgdealfinder/pull/219

- Implemented measure-then-show sequence (render tooltip visible but opacity-0 for measurement, then show after positioning)
- Added position recompute on window resize, document visibilitychange, and window focus
- Added Playwright E2E tests for tooltip positioning (not run in CI)
- Changed 5 files: TooltipPopover.tsx, e2e/tooltip-portal.spec.ts, package.json, package-lock.json, playwright.config.ts

## Why It Failed

Operator still cannot reproduce "hover shows tooltip" reliably after PR #219. Therefore fix did not meet acceptance criteria.

## Evidence

- PR #219: https://github.com/JawnShoe/tcgdealfinder/pull/219
- Affected component: `components/TooltipPopover.tsx`
- Impacted routes confirmed: `/`, `/top-deals`, `/newest`, `/cards/[id]`

## Decision

**Reject PR #219** (do not merge).

**Rebuild**: Replace tooltip primitive entirely (TooltipV2 using Floating UI), with a locked interaction contract.

## Lessons / Invariants for Rebuild

- Positioning must be handled by a proven library (Floating UI/Popper)
- Tooltip contract must be global (hover + focus + escape + click-outside)
- No manual portal positioning hacks without CI-run E2E coverage
- Hydration policy: no "pop-in" for critical UI affordances
