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
- Playwright config: `tests/e2e/playwright.config.ts`
- Playwright test: `tests/e2e/rebuild-trust-panel.spec.ts`
- Import scan proof:

```bash
rg -n 'from\s+["'']@/(app|components|lib|server|pages)/' app/rebuild
(no matches)

rg -n 'from\s+["'']\.\./' app/rebuild
(no matches)
```

- SSR proof snippet:

```tsx
<dt>Confidence</dt>
<dd data-testid="trust-confidence">
  {rebuildListing.trust.confidence}
</dd>
```

- SSR response assertions (HTML response):

```ts
const response = await request.get(routeUrl);
const body = await response.text();
expect(body).toContain("Confidence");
expect(body).toContain('data-testid="trust-confidence"');
```

### Trust metadata visible at first render (no hover-only meaning)

- PR: #228
- Route: `/rebuild/listing/[id]`
- Playwright test: `tests/e2e/rebuild-trust-panel.spec.ts`
- SSR response assertions (HTML response):

```ts
expect(body).toContain("Source");
expect(body).toContain("Fetched at");
expect(body).toContain("Data age");
expect(body).toContain('data-testid="trust-source"');
expect(body).toContain('data-testid="trust-fetched-at"');
expect(body).toContain('data-testid="trust-data-age"');
```

- Visibility assertions (no hover):

```ts
const trustPanel = page.getByTestId("trust-panel");
await expect(trustPanel).toBeVisible();
await expect(page.getByTestId("trust-confidence")).toBeVisible();
await expect(page.getByTestId("trust-source")).toBeVisible();
await expect(page.getByTestId("trust-fetched-at")).toBeVisible();
await expect(page.getByTestId("trust-data-age")).toBeVisible();
```

### Confidence/provenance fields rendered from SSR (no client mutation)

- PR: #228
- Route: `/rebuild/listing/[id]`
- Playwright test: `tests/e2e/rebuild-trust-panel.spec.ts`
- SSR response proof (values asserted in HTML):

```ts
expect(body).toContain('data-testid="trust-confidence"');
expect(body).toContain('data-testid="trust-source"');
expect(body).toContain('data-testid="trust-fetched-at"');
expect(body).toContain('data-testid="trust-data-age"');
expect(body).toContain('data-testid="transparency-panel"');
expect(body).toContain('data-testid="transparency-sources"');
expect(body).toContain('data-testid="transparency-pipeline-version"');
expect(body).toContain('data-testid="explainability-inputs"');
```

- No-mutation comparison proof:

```ts
const before = {
  confidence: (await confidence.textContent())?.trim() ?? "",
  source: (await source.textContent())?.trim() ?? "",
  fetchedAt: (await fetchedAt.textContent())?.trim() ?? "",
  dataAge: (await dataAge.textContent())?.trim() ?? "",
  transparencySources: (await transparencySources.textContent())?.trim() ?? "",
  transparencyFetchedAt:
    (await transparencyFetchedAt.textContent())?.trim() ?? "",
  transparencyComputedAt:
    (await transparencyComputedAt.textContent())?.trim() ?? "",
  transparencyPipelineVersion:
    (await transparencyPipelineVersion.textContent())?.trim() ?? "",
  explainabilityInputs:
    (await explainabilityInputs.textContent())?.trim() ?? "",
};
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(250);
const after = {
  confidence: (await confidence.textContent())?.trim() ?? "",
  source: (await source.textContent())?.trim() ?? "",
  fetchedAt: (await fetchedAt.textContent())?.trim() ?? "",
  dataAge: (await dataAge.textContent())?.trim() ?? "",
  transparencySources: (await transparencySources.textContent())?.trim() ?? "",
  transparencyFetchedAt:
    (await transparencyFetchedAt.textContent())?.trim() ?? "",
  transparencyComputedAt:
    (await transparencyComputedAt.textContent())?.trim() ?? "",
  transparencyPipelineVersion:
    (await transparencyPipelineVersion.textContent())?.trim() ?? "",
  explainabilityInputs:
    (await explainabilityInputs.textContent())?.trim() ?? "",
};
expect(after).toEqual(before);
```

### Rebuild isolation verified (no legacy imports)

- PR: #228
- Route: `/rebuild/listing/[id]`
- Import scan proof:

```bash
rg -n 'from\s+["'']@/(app|components|lib|server|pages)/' app/rebuild
(no matches)

rg -n 'from\s+["'']\.\./' app/rebuild
(no matches)
```
