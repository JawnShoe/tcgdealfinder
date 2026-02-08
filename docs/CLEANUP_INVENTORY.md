# Repo Necessity Ledger

## Proof Legend

- `P-REQ-CI`: required category by policy (`.github/**` kept).
- `P-REQ-MIG`: required category by policy (`migrations/**` kept).
- `P-BUILD`: build/config required (`package.json`, lockfile, `tsconfig*`, `next.config*`, `eslint*`, `postcss*`, `tailwind*`, etc.).
- `P-RUN`: runtime import/route evidence:
  - `rg -n "from ['"]@/" app components rebuild lib --hidden`
  - `rg -n "from ['"]\.\./" app components rebuild lib --hidden`
  - `find app -maxdepth 4 -type f` + `find app/api -maxdepth 6 -type f`
- `P-SCRIPT`: script references evidence:
  - `rg -n "scripts/" package.json .github --hidden`
  - `rg -n "tsx scripts/" package.json .github --hidden`
- `P-DOCS`: governance/docs evidence (`CLAUDE.md`, `SHIFT_LOCK.md`, `PROJECT_SSOT.md`, `docs/rebuild/*`, runbooks) and doc-reference scans.
- `P-TEST`: test harness evidence (`npm run test:unit`, Playwright command in repo config).
- `P-OPS`: repo/operator tooling evidence (`.claude/*`, `skills/*`, env template, husky hooks) retained for workflow governance.
- `P-DEL`: delete proof for `docs/archive/**` and `scripts/one-off/**`:
  - `rg -n "scripts/one-off/|docs/archive/" package.json .github app components lib scripts tests PROJECT_SSOT.md docs/CLEANUP_INVENTORY.md docs/INDEX.md` => no matches post-edit
  - `npm run lint`, `npm run test:unit`, `npm run build` all pass after deletion

## Directories

| Path                                         | Category  | Decision | Reason                                                                             | Proof     |
| -------------------------------------------- | --------- | -------- | ---------------------------------------------------------------------------------- | --------- |
| `.claude`                                    | Ops       | KEEP     | Contains required build/tooling workflow files.                                    | P-OPS     |
| `.claude/agents`                             | Ops       | KEEP     | Contains required build/tooling workflow files.                                    | P-OPS     |
| `.claude/commands`                           | Ops       | KEEP     | Contains required build/tooling workflow files.                                    | P-OPS     |
| `.github`                                    | CI        | KEEP     | Required CI/governance directory.                                                  | P-REQ-CI  |
| `.github/workflows`                          | CI        | KEEP     | Required CI/governance directory.                                                  | P-REQ-CI  |
| `.husky`                                     | Build     | KEEP     | Contains required build/tooling workflow files.                                    | P-BUILD   |
| `app`                                        | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/alerts`                                 | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/alerts/unsubscribe`                     | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api`                                    | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api/alerts`                             | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api/alerts/subscribe`                   | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api/alerts/unsubscribe`                 | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api/deals`                              | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api/health`                             | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api/rebuild`                            | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api/rebuild/alerts`                     | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api/rebuild/alerts/evaluate`            | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api/rebuild/alerts/history`             | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api/rebuild/alerts/subscribe`           | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api/rebuild/alerts/unsubscribe`         | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api/rebuild/ops`                        | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api/rebuild/ops/alerts`                 | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api/rebuild/ops/blacklist`              | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api/rebuild/ops/exclusions`             | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api/rebuild/ops/listings`               | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api/rebuild/ops/login`                  | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/api/rebuild/outbound-click`             | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/discovery`                              | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/listing`                                | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/listing/[id]`                           | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/ops`                                    | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/ops/alerts`                             | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/ops/blacklist`                          | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/ops/exclusions`                         | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `app/ops/listings`                           | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `components`                                 | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `components/rebuild`                         | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `docs`                                       | Docs      | KEEP     | Contains active governance/runbook/reference docs.                                 | P-DOCS    |
| `docs/archive`                               | Docs      | DELETE   | Historical/archive directory removed under delete-only policy (no active callers). | P-DEL     |
| `docs/archive/audit`                         | Docs      | DELETE   | Historical/archive directory removed under delete-only policy (no active callers). | P-DEL     |
| `docs/archive/audits`                        | Docs      | DELETE   | Historical/archive directory removed under delete-only policy (no active callers). | P-DEL     |
| `docs/archive/audits/2025-full-system`       | Docs      | DELETE   | Historical/archive directory removed under delete-only policy (no active callers). | P-DEL     |
| `docs/archive/audits/2026-01-doc-redundancy` | Docs      | DELETE   | Historical/archive directory removed under delete-only policy (no active callers). | P-DEL     |
| `docs/archive/audits/2026-01-inventory`      | Docs      | DELETE   | Historical/archive directory removed under delete-only policy (no active callers). | P-DEL     |
| `docs/archive/audits/2026-01-reachability`   | Docs      | DELETE   | Historical/archive directory removed under delete-only policy (no active callers). | P-DEL     |
| `docs/archive/incidents`                     | Docs      | DELETE   | Historical/archive directory removed under delete-only policy (no active callers). | P-DEL     |
| `docs/archive/plan`                          | Docs      | DELETE   | Historical/archive directory removed under delete-only policy (no active callers). | P-DEL     |
| `docs/archive/rebaseline`                    | Docs      | DELETE   | Historical/archive directory removed under delete-only policy (no active callers). | P-DEL     |
| `docs/ops`                                   | Docs      | KEEP     | Contains active governance/runbook/reference docs.                                 | P-DOCS    |
| `docs/rebuild`                               | Docs      | KEEP     | Contains active governance/runbook/reference docs.                                 | P-DOCS    |
| `lib`                                        | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/__tests__`                              | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/__tests__/integration`                  | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/__tests__/unit`                         | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/observability`                          | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/rebuild`                                | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/rebuild/alerts`                         | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/rebuild/compliance`                     | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/rebuild/currency`                       | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/rebuild/data`                           | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/rebuild/dedupe`                         | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/rebuild/discovery`                      | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/rebuild/intelligence`                   | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/rebuild/intelligence/rules`             | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/rebuild/observability`                  | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/rebuild/prefs`                          | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/rebuild/resilience`                     | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/rebuild/scripts`                        | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/rebuild/security`                       | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/rebuild/seo`                            | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/rebuild/signals`                        | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `lib/rebuild/trust`                          | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `migrations`                                 | Migration | KEEP     | Required migration directory.                                                      | P-REQ-MIG |
| `public`                                     | Asset     | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `public/brand`                               | Asset     | KEEP     | Contains active runtime surface files.                                             | P-RUN     |
| `scripts`                                    | Script    | KEEP     | Contains active ops/CI/manual scripts.                                             | P-SCRIPT  |
| `scripts/__tests__`                          | Script    | KEEP     | Contains active ops/CI/manual scripts.                                             | P-SCRIPT  |
| `scripts/__tests__/unit`                     | Test      | KEEP     | Contains active tests and harness files.                                           | P-TEST    |
| `scripts/migrations`                         | Script    | KEEP     | Contains active ops/CI/manual scripts.                                             | P-SCRIPT  |
| `scripts/migrations/archive`                 | Script    | KEEP     | Contains active ops/CI/manual scripts.                                             | P-SCRIPT  |
| `scripts/one-off`                            | Script    | DELETE   | Historical/archive directory removed under delete-only policy (no active callers). | P-DEL     |
| `skills`                                     | Ops       | KEEP     | Contains required build/tooling workflow files.                                    | P-OPS     |
| `skills/pr-impact-declaration`               | Ops       | KEEP     | Contains required build/tooling workflow files.                                    | P-OPS     |
| `skills/pr-impact-declaration/templates`     | Ops       | KEEP     | Contains required build/tooling workflow files.                                    | P-OPS     |
| `skills/primitive-enforcer`                  | Ops       | KEEP     | Contains required build/tooling workflow files.                                    | P-OPS     |
| `skills/rebuild-contract-guard`              | Ops       | KEEP     | Contains required build/tooling workflow files.                                    | P-OPS     |
| `tests`                                      | Test      | KEEP     | Contains active tests and harness files.                                           | P-TEST    |
| `tests/e2e`                                  | Test      | KEEP     | Contains active tests and harness files.                                           | P-TEST    |
| `tests/fixtures`                             | Test      | KEEP     | Contains active tests and harness files.                                           | P-TEST    |
| `types`                                      | Runtime   | KEEP     | Contains active runtime surface files.                                             | P-RUN     |

## Files

| Path                                                                            | Category  | Decision | Reason                                                                    | Proof     |
| ------------------------------------------------------------------------------- | --------- | -------- | ------------------------------------------------------------------------- | --------- |
| `.claude/agents/implementer.md`                                                 | Ops       | KEEP     | Repository workflow/tooling metadata retained for contributor operations. | P-OPS     |
| `.claude/agents/planner.md`                                                     | Ops       | KEEP     | Repository workflow/tooling metadata retained for contributor operations. | P-OPS     |
| `.claude/agents/simplifier.md`                                                  | Ops       | KEEP     | Repository workflow/tooling metadata retained for contributor operations. | P-OPS     |
| `.claude/agents/verifier.md`                                                    | Ops       | KEEP     | Repository workflow/tooling metadata retained for contributor operations. | P-OPS     |
| `.claude/commands/merge-decision-packet.md`                                     | Ops       | KEEP     | Repository workflow/tooling metadata retained for contributor operations. | P-OPS     |
| `.claude/settings.example.json`                                                 | Ops       | KEEP     | Repository workflow/tooling metadata retained for contributor operations. | P-OPS     |
| `.claude/settings.json`                                                         | Ops       | KEEP     | Repository workflow/tooling metadata retained for contributor operations. | P-OPS     |
| `.env.example`                                                                  | Ops       | KEEP     | Repository workflow/tooling metadata retained for contributor operations. | P-OPS     |
| `.github/PULL_REQUEST_TEMPLATE.md`                                              | CI        | KEEP     | CI config required category.                                              | P-REQ-CI  |
| `.github/dependabot.yml`                                                        | CI        | KEEP     | CI config required category.                                              | P-REQ-CI  |
| `.github/workflows/ci.yml`                                                      | CI        | KEEP     | CI config required category.                                              | P-REQ-CI  |
| `.github/workflows/data-pipelines.yml`                                          | CI        | KEEP     | CI config required category.                                              | P-REQ-CI  |
| `.github/workflows/dependabot-auto-merge.yml`                                   | CI        | KEEP     | CI config required category.                                              | P-REQ-CI  |
| `.github/workflows/job-silence-watchdog.yml`                                    | CI        | KEEP     | CI config required category.                                              | P-REQ-CI  |
| `.github/workflows/ops-enable-alerts.yml`                                       | CI        | KEEP     | CI config required category.                                              | P-REQ-CI  |
| `.gitignore`                                                                    | Build     | KEEP     | Build/config/toolchain required for install/lint/test/build.              | P-BUILD   |
| `.husky/pre-commit`                                                             | Build     | KEEP     | Build/config/toolchain required for install/lint/test/build.              | P-BUILD   |
| `.lighthouserc.cjs`                                                             | Build     | KEEP     | Build/config/toolchain required for install/lint/test/build.              | P-BUILD   |
| `.prettierignore`                                                               | Build     | KEEP     | Build/config/toolchain required for install/lint/test/build.              | P-BUILD   |
| `.prettierrc.json`                                                              | Build     | KEEP     | Build/config/toolchain required for install/lint/test/build.              | P-BUILD   |
| `AGENTS.md`                                                                     | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `CLAUDE.md`                                                                     | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `PROJECT_SSOT.md`                                                               | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `README.md`                                                                     | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `REGRESSION_CHECKLIST.md`                                                       | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `SHIFT_LOCK.md`                                                                 | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `app/alerts/error.tsx`                                                          | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/alerts/loading.tsx`                                                        | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/alerts/page.tsx`                                                           | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/alerts/unsubscribe/page.tsx`                                               | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/api/alerts/subscribe/route.ts`                                             | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/api/alerts/unsubscribe/route.ts`                                           | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/api/deals/dealsQuery.ts`                                                   | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/api/deals/route.ts`                                                        | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/api/health/route.ts`                                                       | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/api/rebuild/alerts/evaluate/route.ts`                                      | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/api/rebuild/alerts/history/route.ts`                                       | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/api/rebuild/alerts/subscribe/route.ts`                                     | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/api/rebuild/alerts/unsubscribe/route.ts`                                   | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/api/rebuild/ops/alerts/route.ts`                                           | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/api/rebuild/ops/blacklist/route.ts`                                        | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/api/rebuild/ops/exclusions/route.ts`                                       | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/api/rebuild/ops/listings/route.ts`                                         | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/api/rebuild/ops/login/route.ts`                                            | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/api/rebuild/outbound-click/route.ts`                                       | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/discovery/loading.tsx`                                                     | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/discovery/not-found.tsx`                                                   | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/discovery/page.tsx`                                                        | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/error.tsx`                                                                 | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/global-error.tsx`                                                          | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/globals.css`                                                               | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/icon.svg`                                                                  | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/layout.tsx`                                                                | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/listing/[id]/error.tsx`                                                    | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/listing/[id]/loading.tsx`                                                  | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/listing/[id]/page.tsx`                                                     | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/loading.tsx`                                                               | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/ops/alerts/AlertsToolClient.tsx`                                           | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/ops/alerts/page.tsx`                                                       | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/ops/blacklist/BlacklistToolClient.tsx`                                     | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/ops/blacklist/page.tsx`                                                    | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/ops/error.tsx`                                                             | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/ops/exclusions/ExclusionsToolClient.tsx`                                   | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/ops/exclusions/page.tsx`                                                   | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/ops/listings/ListingsToolClient.tsx`                                       | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/ops/listings/page.tsx`                                                     | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/ops/loading.tsx`                                                           | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/ops/page.tsx`                                                              | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/page.tsx`                                                                  | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/robots.ts`                                                                 | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `app/sitemap.ts`                                                                | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/CardIdentity.tsx`                                                   | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/ConfidenceChip.tsx`                                                 | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/MarketFlag.tsx`                                                     | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/SellerNameWithTooltip.tsx`                                          | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/SellerSeenBadge.tsx`                                                | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/SiteFooter.tsx`                                                     | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/SiteHeader.tsx`                                                     | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/TooltipPopover.tsx`                                                 | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/TooltipPopoverClientOnly.tsx`                                       | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/TrustedBadge.tsx`                                                   | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/WhyDealHint.tsx`                                                    | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/rebuild/AlertCard.tsx`                                              | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/rebuild/AlertsHistory.tsx`                                          | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/rebuild/AlertsShell.tsx`                                            | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/rebuild/AlertsSubscribe.tsx`                                        | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/rebuild/ComplianceDisclosure.tsx`                                   | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/rebuild/ConfidenceBadge.tsx`                                        | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/rebuild/ConfidenceMethodology.tsx`                                  | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/rebuild/DiscoveryFiltersBar.tsx`                                    | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/rebuild/DiscoveryPaginationControls.tsx`                            | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/rebuild/ExpandableDealList.tsx`                                     | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/rebuild/IntentPrefetchLink.tsx`                                     | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/rebuild/OutboundDealLink.tsx`                                       | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/rebuild/PredictiveSignalsPanel.tsx`                                 | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/rebuild/PreferencesBar.tsx`                                         | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/rebuild/PriorityHydration.tsx`                                      | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/rebuild/ProvenanceDrilldown.tsx`                                    | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/rebuild/ResilienceLabel.tsx`                                        | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `components/rebuild/Skeleton.tsx`                                               | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `docs/BACKUP_POLICY.md`                                                         | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/CLEANUP_INVENTORY.md`                                                     | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/DB_MIGRATIONS_RUNBOOK.md`                                                 | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/DEFINITION_OF_READY.md`                                                   | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/ENV_RUNBOOK.md`                                                           | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/EVIDENCE_PACKET_TEMPLATE.md`                                              | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/INDEX.md`                                                                 | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/RELEASES.md`                                                              | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/TIER2_ARCHITECTURE.md`                                                    | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/WORKSTREAMS_MASTER.md`                                                    | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/archive/BACKFILL_QUICKSTART.md`                                           | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/CLEANUP_SUMMARY_2024-12.md`                                       | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/DECISIONS.md`                                                     | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/LAYOUT_FIX_SUMMARY.md`                                            | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/MARKET_FILTER_FIX.md`                                             | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/MULTI_MARKET_FIX.md`                                              | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/MULTI_MARKET_SUMMARY.md`                                          | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/README.md`                                                        | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/SELLER_STORE_NAME_IMPLEMENTATION.md`                              | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/VERIFICATION_CHECKLIST.md`                                        | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audit/PRODUCT_TRUTH_PHILOSOPHY_AUDIT_OPTION_A.md`                 | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audits/2025-full-system/AUDIT_CLOSEOUT.md`                        | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audits/2025-full-system/AUDIT_CODE_BACKEND.md`                    | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audits/2025-full-system/AUDIT_CODE_DATA.md`                       | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audits/2025-full-system/AUDIT_CODE_FRONTEND.md`                   | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audits/2025-full-system/AUDIT_CODE_OPS.md`                        | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audits/2025-full-system/AUDIT_DOCS_ACTION_PLAN.md`                | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audits/2025-full-system/AUDIT_DOCS_CLASSIFICATION.md`             | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audits/2025-full-system/AUDIT_DOCS_INVENTORY.md`                  | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audits/2025-full-system/AUDIT_EXTERNAL_DEPENDENCIES.md`           | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audits/2025-full-system/AUDIT_OPEN_RISKS_RESOLUTION.md`           | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audits/2025-full-system/AUDIT_WORKFLOWS_INVENTORY.md`             | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audits/2025-full-system/CURRENT_STATE_SNAPSHOT.md`                | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audits/2025-full-system/README.md`                                | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audits/2026-01-doc-redundancy/DOC_REDUNDANCY_AUDIT.md`            | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audits/2026-01-inventory/REPO_INVENTORY_AUDIT.md`                 | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audits/2026-01-reachability/LEGACY_SURFACE_REACHABILITY_AUDIT.md` | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audits/DB_ARCHITECTURE_EVIDENCE.md`                               | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/audits/EXPERT_AUDIT_2025-12-25.md`                                | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/browse_api_migration_audit.md`                                    | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/incidents/INCIDENT_2026-01-05_tooltip-portal-data-reliability.md` | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/plan/OPTION_A_IMPLEMENTATION_PLAN.md`                             | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/rebaseline/CRITICALITY_MAP.md`                                    | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/rebaseline/MODULE_REVIEW_PLAN.md`                                 | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/rebaseline/REPO_PACKET_2025-12-29.md`                             | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/store_name_source_audit.md`                                       | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/storefront_enrichment_audit.md`                                   | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/archive/ui-baseline.md`                                                   | Docs      | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `docs/market-policy.md`                                                         | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/ops/EBAY_AGC_SUBMISSION_PACKET.md`                                        | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/rebuild/ADR_LOG.md`                                                       | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/rebuild/CONTRACTS.md`                                                     | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/rebuild/LEGACY_QUARANTINE.md`                                             | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/rebuild/NON_NEGOTIABLES.md`                                               | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/rebuild/PRD_LITE.md`                                                      | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/rebuild/REBUILD_TRACKER.md`                                               | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/rebuild/RELEASE_CHECKLIST.md`                                             | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/rebuild/TRACKER_EVIDENCE.md`                                              | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/rebuild/TRUST_METRICS.md`                                                 | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/rebuild/VISUAL_CONTRACT.md`                                               | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `docs/surfaces.md`                                                              | Docs      | KEEP     | Active governance/runbook/reference documentation.                        | P-DOCS    |
| `eslint.config.mjs`                                                             | Build     | KEEP     | Build/config/toolchain required for install/lint/test/build.              | P-BUILD   |
| `instrumentation.ts`                                                            | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/integration/consistency.test.ts`                                 | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/integration/schema.test.ts`                                      | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/integration/softExclusion.test.ts`                               | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/integration/variantContradiction.test.ts`                        | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/adminAuth.test.ts`                                          | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/baselineUsd.test.ts`                                        | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/clampNonNegative.test.ts`                                   | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/collectorNumber.test.ts`                                    | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/dealConfidence.test.ts`                                     | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/dealScore.test.ts`                                          | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/dealSort.test.ts`                                           | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/fxRates.test.ts`                                            | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/language.test.ts`                                           | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/markets.test.ts`                                            | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/rateLimit.test.ts`                                          | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/rebuildActionEngine.test.ts`                                | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/rebuildCrossMarketDedupe.test.ts`                           | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/rebuildCurrencyContract.test.ts`                            | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/rebuildDiscoveryPreset.test.ts`                             | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/rebuildDiscoveryQuery.test.ts`                              | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/rebuildIntelligenceEngine.test.ts`                          | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/rebuildListingMapper.test.ts`                               | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/rebuildMarketplaceCompliance.test.ts`                       | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/rebuildObservabilityMetrics.test.ts`                        | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/rebuildPredictiveSignals.test.ts`                           | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/rebuildResilienceEvaluator.test.ts`                         | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/rebuildSecurityBaseline.test.ts`                            | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/rebuildSeoBaseline.test.ts`                                 | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/rebuildTrustInvariants.test.ts`                             | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/rebuildUrlBuilders.test.ts`                                 | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/__tests__/unit/sentryScrubbing.test.ts`                                    | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/adminAuth.ts`                                                              | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/alertsConfig.ts`                                                           | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/anonId.ts`                                                                 | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/blacklist.ts`                                                              | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/db.ts`                                                                     | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/dealConfidence.ts`                                                         | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/dealFormatting.ts`                                                         | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/dealScore.ts`                                                              | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/dealSort.ts`                                                               | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/debugAuth.ts`                                                              | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/ebay.ts`                                                                   | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/emailSubscriptions.ts`                                                     | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/featureFlags.ts`                                                           | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/filters.ts`                                                                | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/marketPreference.ts`                                                       | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/markets.ts`                                                                | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/money.ts`                                                                  | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/observability/logging.ts`                                                  | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/observability/metrics.ts`                                                  | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/priceGuard.ts`                                                             | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/pricing.ts`                                                                | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rateLimit.ts`                                                              | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rateLimitRetry.ts`                                                         | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/alerts/alerts.ts`                                                  | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/alerts/featureFlags.ts`                                            | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/alerts/validation.ts`                                              | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/compliance/disclosure.ts`                                          | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/compliance/marketplaceCompliance.ts`                               | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/compliance/outboundClickIntegrity.ts`                              | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/currency/cad.ts`                                                   | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/currency/canonical.ts`                                             | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/data/alertsOps.ts`                                                 | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/data/blacklist.ts`                                                 | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/data/createOrUpdateSubscription.ts`                                | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/data/dataAvailability.ts`                                          | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/data/exclusions.ts`                                                | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/data/getRebuildListingById.ts`                                     | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/data/getRebuildOpsSnapshot.ts`                                     | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/data/getRecentDeals.ts`                                            | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/data/listingMapper.ts`                                             | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/data/listingsOps.ts`                                               | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/data/resolveListingIdByCardId.ts`                                  | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/data/schema.ts`                                                    | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/data/unsubscribeByToken.ts`                                        | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/db.ts`                                                             | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/dedupe/crossMarketDedupe.ts`                                       | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/discovery/discoveryPersistence.ts`                                 | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/discovery/discoveryQuery.ts`                                       | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/intelligence/evaluateIntelligence.ts`                              | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/intelligence/index.ts`                                             | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/intelligence/rules/descriptionHeuristicsRule.ts`                   | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/intelligence/rules/index.ts`                                       | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/intelligence/rules/missingKeyFieldsRule.ts`                        | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/intelligence/rules/priceOutlierRule.ts`                            | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/intelligence/rules/sellerMismatchRule.ts`                          | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/intelligence/rules/stockImageRule.ts`                              | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/intelligence/types.ts`                                             | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/observability/logging.ts`                                          | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/observability/metrics.ts`                                          | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/prefs/actionPrefs.ts`                                              | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/prefs/rebuildPrefs.ts`                                             | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/resilience/evaluateResilience.ts`                                  | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/scripts/baselineUsd.ts`                                            | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/scripts/collectorNumber.ts`                                        | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/scripts/ebayStorefront.ts`                                         | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/scripts/emailQueue.ts`                                             | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/scripts/fxRates.ts`                                                | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/scripts/language.ts`                                               | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/scripts/tcgplayerClient.ts`                                        | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/security/rateLimit.ts`                                             | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/security/validation.ts`                                            | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/seo/canonical.ts`                                                  | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/seo/meta.ts`                                                       | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/seo/siteUrl.ts`                                                    | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/seo/sitemap.ts`                                                    | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/seo/structuredData.ts`                                             | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/signals/predictiveSignals.ts`                                      | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/trust/trustAssessment.ts`                                          | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/rebuild/urls.ts`                                                           | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/schema.ts`                                                                 | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/sellerDisplay.ts`                                                          | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `lib/stockImages.ts`                                                            | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `middleware.ts`                                                                 | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `migrations/001_add_fx_rates.sql`                                               | Migration | KEEP     | Canonical migration required category.                                    | P-REQ-MIG |
| `migrations/002_add_listing_integrity_fields.sql`                               | Migration | KEEP     | Canonical migration required category.                                    | P-REQ-MIG |
| `migrations/003_add_catalog_set_fields.sql`                                     | Migration | KEEP     | Canonical migration required category.                                    | P-REQ-MIG |
| `migrations/004_add_seller_blacklist_history.sql`                               | Migration | KEEP     | Canonical migration required category.                                    | P-REQ-MIG |
| `migrations/005_add_subscription_last_emailed.sql`                              | Migration | KEEP     | Canonical migration required category.                                    | P-REQ-MIG |
| `migrations/006_add_listings_card_id_idx.sql`                                   | Migration | KEEP     | Canonical migration required category.                                    | P-REQ-MIG |
| `migrations/007_add_rate_limits.sql`                                            | Migration | KEEP     | Canonical migration required category.                                    | P-REQ-MIG |
| `migrations/009_option_a_fx_rate_runs.sql`                                      | Migration | KEEP     | Canonical migration required category.                                    | P-REQ-MIG |
| `migrations/010_option_a_listings_snapshot_fx_precision.sql`                    | Migration | KEEP     | Canonical migration required category.                                    | P-REQ-MIG |
| `migrations/011_option_a_sold_fx_snapshot.sql`                                  | Migration | KEEP     | Canonical migration required category.                                    | P-REQ-MIG |
| `migrations/012_option_a_historical_baseline_usd.sql`                           | Migration | KEEP     | Canonical migration required category.                                    | P-REQ-MIG |
| `migrations/013_add_watchlist_entries.sql`                                      | Migration | KEEP     | Canonical migration required category.                                    | P-REQ-MIG |
| `migrations/014_add_email_sends.sql`                                            | Migration | KEEP     | Canonical migration required category.                                    | P-REQ-MIG |
| `migrations/015_add_rebuild_observability.sql`                                  | Migration | KEEP     | Canonical migration required category.                                    | P-REQ-MIG |
| `next-env.d.ts`                                                                 | Build     | KEEP     | Build/config/toolchain required for install/lint/test/build.              | P-BUILD   |
| `next.config.mjs`                                                               | Build     | KEEP     | Build/config/toolchain required for install/lint/test/build.              | P-BUILD   |
| `package-lock.json`                                                             | Build     | KEEP     | Build/config/toolchain required for install/lint/test/build.              | P-BUILD   |
| `package.json`                                                                  | Build     | KEEP     | Build/config/toolchain required for install/lint/test/build.              | P-BUILD   |
| `postcss.config.js`                                                             | Build     | KEEP     | Build/config/toolchain required for install/lint/test/build.              | P-BUILD   |
| `public/brand/logo.png`                                                         | Asset     | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `public/favicon-16.png`                                                         | Asset     | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `public/favicon-16.svg`                                                         | Asset     | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `public/favicon-32.png`                                                         | Asset     | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `public/favicon-32.svg`                                                         | Asset     | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `scripts/__tests__/unit/collectorNumberGating.test.ts`                          | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `scripts/__tests__/unit/marketCurrency.test.ts`                                 | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `scripts/__tests__/unit/update-historical-prices.test.ts`                       | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `scripts/backfill-card-language.ts`                                             | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/backfill-collector-numbers.ts`                                         | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/backfill-deal-confidence.ts`                                           | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/backfill-market.ts`                                                    | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/backfill-seller-store-names.ts`                                        | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/check-alerts.ts`                                                       | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/data-sanity-gate.sh`                                                   | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/debug-discounts.ts`                                                    | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/debug-listings.ts`                                                     | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/e2e-test-alerts.ts`                                                    | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/ebay-rate-limits.ts`                                                   | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/enrich-single-listing.ts`                                              | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/fix-gbp-listings.ts`                                                   | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/import-tcgplayer-catalog.ts`                                           | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/ingest_pokemon_sets.ts`                                                | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/init-db.ts`                                                            | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/migrations/012_create_listing_overrides.sql`                           | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/migrations/20251212_add_listing_grade_columns.sql`                     | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/migrations/20251213_add_listing_match_fields.sql`                      | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/migrations/20251213_add_shipping_known.sql`                            | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/migrations/20251215_drop_seller_store_name.sql`                        | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/migrations/20251216_collector_number_hardening.sql`                    | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/migrations/20251217_add_deal_confidence_weight.sql`                    | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/migrations/20251218_add_card_language.sql`                             | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/migrations/20251219_add_market_partition.sql`                          | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/migrations/add-seller-store-name-tracking.ts`                          | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/migrations/archive/README.md`                                          | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/migrations/archive/add_listing_integrity_fields.sql`                   | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/one-off/README.md`                                                     | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/add-pokemontcg-cols.ts`                                        | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/audit-listing-markets.ts`                                      | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/audit-seller-data.ts`                                          | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-186.ts`                                                  | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-active-server.ts`                                        | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-all-cards-columns.ts`                                    | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-all-variants.ts`                                         | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-api-key.ts`                                              | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-app-cards.ts`                                            | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-cards-schema.ts`                                         | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-cards.ts`                                                | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-empty-final.ts`                                          | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-empty.ts`                                                | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-env.ts`                                                  | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-giratina-app.ts`                                         | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-listing-177383271547.ts`                                 | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-listing-collector.ts`                                    | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-listing-details.ts`                                      | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-lugia-st.ts`                                             | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-lugia.ts`                                                | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-progress.ts`                                             | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-reject-columns.ts`                                       | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-schema.ts`                                               | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-search-config.ts`                                        | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-seller-schema.ts`                                        | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-store-names-status.ts`                                   | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-subsets.ts`                                              | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-tg.ts`                                                   | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/check-urls.ts`                                                 | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/debug-ca-listing.ts`                                           | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/debug-card-detail-seller.ts`                                   | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/direct-db-check.ts`                                            | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/final-check.ts`                                                | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/final-verify.ts`                                               | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/find-test-case.ts`                                             | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/import-pokemontcg-catalog.ts`                                  | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/progress.ts`                                                   | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/purge-blacklisted-listings.ts`                                 | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/quick-check.ts`                                                | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/rebuild-historical-prices.ts`                                  | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/run-migration-012.ts`                                          | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/run-migration.ts`                                              | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/show-db-info.ts`                                               | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-abort.ts`                                                 | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-all-cards.ts`                                             | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-api-health.ts`                                            | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-api-seller-field.ts`                                      | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-api-tg.ts`                                                | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-api.ts`                                                   | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-blacklist.ts`                                             | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-cards.mjs`                                                | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-cards.ts`                                                 | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-env.ts`                                                   | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-fetch.ts`                                                 | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-final.ts`                                                 | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-homepage-market-display.ts`                               | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-market-display-standard.ts`                               | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-market-filter.ts`                                         | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-market-formatting.ts`                                     | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-market-integration.ts`                                    | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-page-fetch.ts`                                            | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-seller-display.ts`                                        | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-silver-tempest.ts`                                        | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-stock-images.ts`                                          | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/test-subset.ts`                                                | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/update-test-case.ts`                                           | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/verify-catalog-setup.ts`                                       | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/verify-db-markets.ts`                                          | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/verify-db.ts`                                                  | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/verify-ebay-store-name.ts`                                     | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/verify-market-display.ts`                                      | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/one-off/verify-seller-fix.ts`                                          | Script    | DELETE   | Unreferenced historical/debug file removed under delete-only policy.      | P-DEL     |
| `scripts/primitive-enforcer.sh`                                                 | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/run-migration.ts`                                                      | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/seed-cards.ts`                                                         | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/test-multi-market.ts`                                                  | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/update-fx-rates-auto.ts`                                               | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/update-fx-rates.ts`                                                    | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/update-historical-prices.ts`                                           | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/update-listings.ts`                                                    | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/update-sold-listings.ts`                                               | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/validate-multi-market.ts`                                              | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/verify-migration-005.ts`                                               | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/verify-migration-006.ts`                                               | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/verify-pages-load.ts`                                                  | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `scripts/visual-contract-guardrails.sh`                                         | Script    | KEEP     | Referenced by package scripts, CI workflow, or active ops docs.           | P-SCRIPT  |
| `sentry.client.config.ts`                                                       | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `sentry.edge.config.ts`                                                         | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `sentry.server.config.ts`                                                       | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `skills/README.md`                                                              | Ops       | KEEP     | Repository workflow/tooling metadata retained for contributor operations. | P-OPS     |
| `skills/pr-impact-declaration/SKILL.md`                                         | Ops       | KEEP     | Repository workflow/tooling metadata retained for contributor operations. | P-OPS     |
| `skills/pr-impact-declaration/templates/PR_IMPACT_TEMPLATE.md`                  | Ops       | KEEP     | Repository workflow/tooling metadata retained for contributor operations. | P-OPS     |
| `skills/primitive-enforcer/SKILL.md`                                            | Ops       | KEEP     | Repository workflow/tooling metadata retained for contributor operations. | P-OPS     |
| `skills/rebuild-contract-guard/SKILL.md`                                        | Ops       | KEEP     | Repository workflow/tooling metadata retained for contributor operations. | P-OPS     |
| `tailwind.config.js`                                                            | Build     | KEEP     | Build/config/toolchain required for install/lint/test/build.              | P-BUILD   |
| `tests/e2e/discovery-v1.spec.ts`                                                | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/home-canonical.spec.ts`                                              | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/no-legacy-routes-404.spec.ts`                                        | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/playwright.config.ts`                                                | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/rebuild-a11y.spec.ts`                                                | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/rebuild-alerts.spec.ts`                                              | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/rebuild-cls.spec.ts`                                                 | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/rebuild-confidence-drilldown.spec.ts`                                | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/rebuild-confidence-methodology.spec.ts`                              | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/rebuild-ends-at.spec.ts`                                             | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/rebuild-expandable-rows.spec.ts`                                     | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/rebuild-home-title-hitarea.spec.ts`                                  | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/rebuild-market-filter.spec.ts`                                       | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/rebuild-ops-metrics.spec.ts`                                         | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/rebuild-route-404.spec.ts`                                           | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/rebuild-scan-power-grid.spec.ts`                                     | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/rebuild-sort-persistence.spec.ts`                                    | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/rebuild-trust-panel.spec.ts`                                         | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/rebuild.synthetics.guarantee.spec.ts`                                | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/e2e/rebuild.synthetics.spec.ts`                                          | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tests/fixtures/rebuild_seed.sql`                                               | Test      | KEEP     | Part of active test harness used by repo verification.                    | P-TEST    |
| `tsconfig.json`                                                                 | Build     | KEEP     | Build/config/toolchain required for install/lint/test/build.              | P-BUILD   |
| `types/deal.ts`                                                                 | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
| `types/dealsApi.ts`                                                             | Runtime   | KEEP     | Active runtime/imported route/component/module or served asset.           | P-RUN     |
