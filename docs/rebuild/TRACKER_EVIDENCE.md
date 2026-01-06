# REBUILD Tracker Evidence Map

This maps checked items in `docs/rebuild/REBUILD_TRACKER.md` to evidence. If evidence is missing, downgrade to [ ].

## Week 0: Setup & Weaponization

### PRD_LITE.md (signed contract draft)

- PR: #221
- File: `docs/rebuild/PRD_LITE.md`
- Snippet:

```md
## Product Promise

Find actionable undervalued listings you can trust, fast.
```

### TRUST_METRICS.md (trust SLOs and confidence rules)

- PR: #221
- File: `docs/rebuild/TRUST_METRICS.md`
- Snippet:

```md
## Freshness SLOs

- Price/availability data age <= X minutes from source update.
```

### NON_NEGOTIABLES.md (hard gates)

- PR: #221
- File: `docs/rebuild/NON_NEGOTIABLES.md`
- Snippet:

```md
## Hard Gates

- Price/deal indicators MUST NOT mutate after first render; versioned state only.
```

### CONTRACTS.md (tooltip/hydration/skeleton contracts)

- PR: #225
- File: `docs/rebuild/CONTRACTS.md`
- Snippet:

```md
## Hydration Tiers Contract

- Price, confidence, and trust metadata MUST be SSR-only or SSR + hydrate with no mutation.
```

### RELEASE_CHECKLIST.md (Week 0 gate list)

- PR: #225
- File: `docs/rebuild/RELEASE_CHECKLIST.md`
- Snippet:

```md
## CI gates

- Lint (hard-pass)
- Typecheck (hard-pass)
- Unit tests (hard-pass)
```

### ADR_LOG.md seeded (ADR-0001, ADR-0002)

- PR: #225
- File: `docs/rebuild/ADR_LOG.md`
- Snippet:

```md
## ADR-0001: Rebuild lane path + isolation rule

## ADR-0002: Contracts-first + single primitives + fail-hard CI gates
```

### Phase 0 skills declared (SKILL.md)

- PR: #222
- File: `skills/README.md`
- Snippet:

```md
## Activation order (LOCKED)

- Phase 0: primitive-enforcer, rebuild-contract-guard, pr-impact-declaration.
```

### CI gates wired (lint/typecheck/unit/build hard-pass; EXEMPT TEMP gates present)

- PR: #225
- File: `.github/workflows/ci.yml`
- Snippet:

```yml
lint-and-build:
  name: Lint & Build
e2e-smoke:
  name: E2E Smoke (EXEMPT TEMP)
visual-regression:
  name: Visual Regression / CLS (EXEMPT TEMP)
a11y-smoke:
  name: A11y Smoke (EXEMPT TEMP)
perf-budget:
  name: Perf Budget (EXEMPT TEMP)
```

- CI run: https://github.com/JawnShoe/tcgdealfinder/actions/runs/20736641784
- Checks observed:
  - Lint & Build
  - E2E Smoke (EXEMPT TEMP)
  - Visual Regression / CLS (EXEMPT TEMP)
  - A11y Smoke (EXEMPT TEMP)
  - Perf Budget (EXEMPT TEMP)

### REBUILD_TRACKER.md created

- PR: #227
- File: `docs/rebuild/REBUILD_TRACKER.md`
- Snippet:

```md
# REBUILD_TRACKER
```

## Weeks 1-2: Phase 0 - Prove the Architecture (checked items)

### Rebuild lane route scaffold (placeholder UI, SSR-stable)

- PR: #228
- Route: `/rebuild/listing/[id]`
- Import scan proof:

```bash
rg -n 'from "(app|components)/' app/rebuild
(no matches)

rg -n '(from|require\()' app/rebuild
(no matches)
```

- SSR proof snippet:

```tsx
<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
  Confidence (SSR)
</p>
<div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
  {placeholderDeal.confidence} / 100 (placeholder)
</div>
```

- Initial render visibility (no hover) description: Trust metadata renders directly in the page markup.
- DOM snippet:

```tsx
<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
  Trust metadata
</p>
<dl className="mt-3 space-y-2 text-sm text-slate-700">
  <div className="flex items-center justify-between">
    <dt>Source</dt>
    <dd className="font-mono text-slate-900">
      {placeholderDeal.source}
    </dd>
  </div>
  <div className="flex items-center justify-between">
    <dt>Fetched at</dt>
    <dd className="font-mono text-slate-900">
      {placeholderDeal.fetchedAt}
    </dd>
  </div>
  <div className="flex items-center justify-between">
    <dt>Data age</dt>
    <dd className="font-mono text-slate-900">
      {placeholderDeal.dataAgeMinutes}m
    </dd>
  </div>
</dl>
```

### Trust metadata visible at first render (no hover-only meaning)

- PR: #228
- Route: `/rebuild/listing/[id]`
- Import scan proof:

```bash
rg -n 'from "(app|components)/' app/rebuild
(no matches)

rg -n '(from|require\()' app/rebuild
(no matches)
```

- SSR proof snippet:

```tsx
<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
  Trust metadata
</p>
<dl className="mt-3 space-y-2 text-sm text-slate-700">
  <div className="flex items-center justify-between">
    <dt>Source</dt>
    <dd className="font-mono text-slate-900">
      {placeholderDeal.source}
    </dd>
  </div>
</dl>
```

- Initial render visibility (no hover) description: Trust metadata is rendered in the default flow of the page, not behind hover UI.
- DOM snippet:

```tsx
<section className="mt-6 grid gap-4 md:grid-cols-3">
  <div className="rounded-lg border border-slate-200 bg-white p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      Trust metadata
    </p>
    <dl className="mt-3 space-y-2 text-sm text-slate-700">
      <div className="flex items-center justify-between">
        <dt>Source</dt>
        <dd className="font-mono text-slate-900">{placeholderDeal.source}</dd>
      </div>
    </dl>
  </div>
</section>
```

### Confidence/provenance fields rendered from SSR (no client mutation)

- PR: #228
- Route: `/rebuild/listing/[id]`
- Import scan proof:

```bash
rg -n 'from "(app|components)/' app/rebuild
(no matches)

rg -n '(from|require\()' app/rebuild
(no matches)
```

- SSR proof snippet:

```tsx
<div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
  {placeholderDeal.confidence} / 100 (placeholder)
</div>
```

- Initial render visibility (no hover) description: Provenance fields render in a static transparency log section.
- DOM snippet:

```tsx
<h2 className="text-lg font-semibold text-slate-900">
  Transparency log (placeholder)
</h2>
<dd className="mt-1 font-mono text-slate-900">
  {placeholderDeal.parserVersion}
</dd>
```

### Rebuild isolation verified (no legacy imports)

- PR: #228
- Route: `/rebuild/listing/[id]`
- Import scan proof:

```bash
rg -n 'from "(app|components)/' app/rebuild
(no matches)

rg -n '(from|require\()' app/rebuild
(no matches)
```

- SSR proof snippet:

```tsx
<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
  Rebuild listing
</p>
<h1 className="mt-2 text-2xl font-semibold text-slate-900">
  {placeholderDeal.title}
</h1>
```

- Initial render visibility (no hover) description: The rebuild page renders without importing legacy modules.
- DOM snippet:

```tsx
<main className="min-h-screen bg-slate-50">
  <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
      Rebuild lane - placeholder data
    </div>
```
