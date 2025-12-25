# Evidence Packet Template

**Purpose**: Standardized format for documenting Tier-1 system issues and fixes.

**Last Updated**: 2025-12-24

---

## When to Use This Template

Use this template when:

- Investigating a potential data integrity issue (DB vs UI mismatch)
- Documenting a Tier-1 system bug before applying a fix
- Creating an audit trail for locked system changes

---

## Evidence Packet Structure

### A) Database Query + Row Values

**Query executed**:

```sql
-- Paste the exact query used to investigate the issue
SELECT column1, column2, ...
FROM table_name
WHERE condition;
```

**Result**:

| column1 | column2 | ... |
| ------- | ------- | --- |
| value1  | value2  | ... |

**Observation**: [Describe what the data shows]

---

### B) Two Same-Surface UI Samples

Capture at least two UI samples from the same surface to establish pattern.

**Sample 1**:

- **URL**: [Full URL path]
- **Screenshot/Description**: [What the UI shows]
- **Timestamp**: [When captured]

**Sample 2**:

- **URL**: [Full URL path]
- **Screenshot/Description**: [What the UI shows]
- **Timestamp**: [When captured]

**Pattern observed**: [What the two samples demonstrate]

---

### C) UI Path + Exact Field Rendered

**Navigation path**: [e.g., Homepage → Top Deals → Card Row]

**Component chain**: [e.g., `TopDealsPage` → `DealsTable` → `DealRow` → `PriceCell`]

**Exact field rendered**: [e.g., `deal.currentPrice` from `listings.current_price`]

**Expected value**: [What should appear]

**Actual value**: [What actually appears]

---

### D) Single-Sentence Verdict

**Verdict**: [ ] DB wrong | [ ] UI wrong

**Explanation**: [One sentence explaining why this verdict was reached]

---

### E) Fix Summary + Verification IDs (if applicable)

**Fix applied**: [Brief description of the fix]

**Files changed**:

- `path/to/file1.ts` (line X-Y)
- `path/to/file2.ts` (line A-B)

**Commit**: [Commit hash]

**PR**: [PR number if applicable]

**Verification steps**:

1. [Step to verify fix]
2. [Step to verify fix]

**Verification result**: [ ] PASS | [ ] FAIL

---

## Example Evidence Packet

### A) Database Query + Row Values

```sql
SELECT id, card_name, current_price, market_price
FROM listings
WHERE card_id = 12345
ORDER BY updated_at DESC
LIMIT 1;
```

| id    | card_name    | current_price | market_price |
| ----- | ------------ | ------------- | ------------ |
| 99001 | Charizard EX | 45.99         | 52.00        |

**Observation**: DB shows current_price = 45.99, market_price = 52.00

### B) Two Same-Surface UI Samples

**Sample 1**:

- **URL**: `/top-deals`
- **Screenshot/Description**: Charizard EX row shows "$45.99" in Price column
- **Timestamp**: 2025-12-24 10:15 UTC

**Sample 2**:

- **URL**: `/cards/12345`
- **Screenshot/Description**: Best Deal card shows "$45.99"
- **Timestamp**: 2025-12-24 10:16 UTC

**Pattern observed**: Both surfaces show $45.99, matching DB

### C) UI Path + Exact Field Rendered

**Navigation path**: Homepage → Top Deals → Charizard EX row

**Component chain**: `TopDealsPage` → `DealsTable` → `DealRow` → `PriceCell`

**Exact field rendered**: `deal.currentPrice` from `listings.current_price`

**Expected value**: $45.99

**Actual value**: $45.99

### D) Single-Sentence Verdict

**Verdict**: [x] DB wrong | [ ] UI wrong

**Explanation**: The market_price in DB is stale (last API sync failed), causing incorrect savings calculation.

### E) Fix Summary + Verification IDs

**Fix applied**: Re-ran price sync job; market_price updated to current API value.

**Files changed**: N/A (data fix only)

**Commit**: N/A

**Verification steps**:

1. Re-query DB: `SELECT market_price FROM listings WHERE id = 99001`
2. Verify UI savings calculation on `/top-deals`

**Verification result**: [x] PASS | [ ] FAIL

---

## Governance

This template is part of the Tier-1 Evidence Gate process defined in SHIFT_LOCK rules. All Tier-1 system changes must include a completed evidence packet before merge.

**Reference**: See `PROJECT_SSOT.md` → Process & Collaboration section.
