# Definition of Ready Template

**Purpose**: Checklist template for new features to ensure adequate planning before implementation.

**Last Updated**: 2025-12-24

---

## When to Use This Template

Use this template when planning:
- New user-facing features
- Significant refactors
- Tier 2+ backlog items
- Any work requiring >3 PRs or >5 files touched

**Not required for**:
- Bug fixes
- Documentation updates
- UI/copy polish
- Single-file changes

---

## Definition of Ready Checklist

### 1. Scope Definition

**What is being built?**
- [ ] Feature name and one-sentence description provided
- [ ] User-facing behavior clearly described
- [ ] Success criteria defined (what "done" looks like)
- [ ] Explicit non-goals listed (what this feature will NOT do)

**Example**:
```
Feature: Watchlist v2 Sorting
Description: Allow users to sort watchlist by price, discount, or card name
Success criteria: Watchlist page has sort dropdown; sorting persists in localStorage
Non-goals: Server-side watchlist sync, filtering (separate feature)
```

---

### 2. User Impact

**Who benefits and how?**
- [ ] Target user persona identified (casual browser, deal hunter, collector)
- [ ] User problem being solved described
- [ ] Expected user flow documented (step-by-step)

**Example**:
```
Persona: Deal hunter with 20+ watchlist cards
Problem: Cannot find best deals quickly in unsorted list
Flow: Click sort dropdown → Select "Highest discount" → List reorders
```

---

### 3. Technical Scope

**What systems are affected?**
- [ ] Blast radius identified (pages, components, APIs, DB)
- [ ] Tier classification (Tier 1 / 1.5 / 2 / 3)
- [ ] Data changes required (schema, migrations, queries)
- [ ] New dependencies or external services listed

**Example**:
```
Blast radius: /watchlist page, useWatchlist hook, localStorage schema
Tier: 1.5 (enhances existing Watchlist v1)
Data changes: Add sortPreference to localStorage schema
Dependencies: None (uses existing data)
```

---

### 4. Regression Surfaces

**What could break?**
- [ ] Existing features that might be affected listed
- [ ] Regression test plan defined
- [ ] Manual testing checklist created

**Example**:
```
Affected features:
- Watchlist star button (should still work)
- Watchlist empty state (should still render)
- localStorage persistence (must not corrupt existing data)

Regression tests:
- Add/remove cards from watchlist still works
- Watchlist displays correctly on mobile
- Empty watchlist shows empty state
```

---

### 5. Rollback Plan

**How to undo if things go wrong?**
- [ ] Rollback strategy defined (git revert, feature flag, etc.)
- [ ] Data migration rollback procedure documented (if applicable)
- [ ] User-facing impact of rollback described

**Example**:
```
Rollback: Git revert PR commit (no data migration required)
Impact: Users lose sort preference; watchlist reverts to unsorted order
Data safety: Existing watchlist data unaffected (sort is additive)
```

---

### 6. Dependencies and Blockers

**What must be true before starting?**
- [ ] Prerequisites completed (other features, migrations, approvals)
- [ ] Required resources available (API keys, test data, etc.)
- [ ] Blockers identified and resolved

**Example**:
```
Prerequisites: Watchlist v1 must be complete and stable
Resources: None (uses existing watchlist data)
Blockers: None
```

---

### 7. Documentation and Communication

**How will this be documented?**
- [ ] SSOT update plan defined (what sections to update)
- [ ] User-facing documentation needed (README, help text, etc.)
- [ ] Team communication plan (if applicable)

**Example**:
```
SSOT updates:
- Add "Watchlist v2 Sorting" to Completed section
- Update "Watchlist v1 (LOCKED)" to reference v2 enhancements

User docs: None (UI is self-explanatory)
```

---

## Example: Filled Template

```markdown
## Feature: Seller Repetition Trust Badge

### 1. Scope Definition
- Feature: "Seen on X deals" badge for repeat sellers
- Description: Show subtle trust badge when seller appears frequently in deals
- Success criteria: Badge appears on deals table when seller has 3+ deals in 30 days
- Non-goals: Seller reputation score, seller history page, seller blacklist integration

### 2. User Impact
- Persona: Deal hunter evaluating seller trustworthiness
- Problem: No way to know if seller is consistently offering good deals
- Flow: View deals table → See "Seen on 5 deals" badge → Feel more confident in purchase

### 3. Technical Scope
- Blast radius: DealsTable component, deal query, new SellerRepetitionBadge component
- Tier: 1.5 (trust signal enhancement, no scoring changes)
- Data changes: None (uses existing deal data)
- Dependencies: None

### 4. Regression Surfaces
- Affected features: DealsTable rendering, seller display
- Regression tests:
  - Deals table loads without errors
  - Seller names still render correctly
  - Badge only shows for sellers with 3+ deals
  - Badge does not appear for sellers below threshold

### 5. Rollback Plan
- Rollback: Git revert PR commit
- Impact: Badge disappears; no data loss
- Data safety: No schema changes, safe to revert

### 6. Dependencies and Blockers
- Prerequisites: Seller Trust Display (LOCKED) must remain unchanged
- Resources: None
- Blockers: None

### 7. Documentation and Communication
- SSOT updates: Add to Completed section with commit hash
- User docs: None (badge is self-explanatory)
```

---

## Approval Gate

Before implementation begins:

- [ ] Definition of Ready checklist completed
- [ ] User/product owner has reviewed and approved scope
- [ ] Technical approach validated (no Tier 1 violations)
- [ ] Regression plan reviewed
- [ ] SSOT updated with planned work (moved to "ACTIVE WORK")

**If any checkbox is unchecked, work should not begin.**

---

## Post-Implementation Verification

After feature is complete:

- [ ] All Definition of Ready success criteria met
- [ ] Regression tests passed
- [ ] SSOT updated with actual implementation details and commit hashes
- [ ] Rollback plan verified (optional: create restorepoint bundle)

---

**Governance**: This template is maintained as part of the Repo Hardening Pack (2025-12-24).

**Usage**: Copy this template into a new document (e.g., `docs/planning/feature-name-dor.md`) when planning features. Do not modify this template file directly.
