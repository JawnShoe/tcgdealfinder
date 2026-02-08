# Cleanup Inventory

**Created**: 2026-01-02
**Last Updated**: 2026-02-08
**Status**: CURRENT

---

## Scope

This document tracks low-risk repository cleanup candidates that do not change runtime behavior.

## Current Decisions

- Keep production and CI-linked scripts in `scripts/`.
- Delete unreferenced one-off scripts after reference proof.
- Delete dead API routes only when caller scans show zero relevant internal callers.
- Delete dead `lib/` files only when import scans show zero active imports.

## Do Not Touch Without Separate Scope

- Active product/governance docs referenced by `PROJECT_SSOT.md`, `SHIFT_LOCK.md`, and `docs/INDEX.md`.
- CI-required scripts used by `.github/workflows/**`.
- Any route or module with active callers in `app/`, `components/`, `lib/`, `scripts/`, or `tests/`.

## Verification Standard

Before move/delete actions, include proof for:

- Repo-wide reference search output.
- `npm run lint` pass.
- `npm run test:unit` pass.
- `npm run build` pass.

## Notes

- This file is inventory-only. It does not override SSOT, shift locks, or rebuild contracts.
- Historical-only references are intentionally excluded from active cleanup guidance.
