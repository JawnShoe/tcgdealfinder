# UI Baseline Verification Checklist

> **Purpose:** Quick manual check (< 2 min) to confirm table layout hasn't regressed after changes.
> **Last updated:** 2024-12-15

---

## Routes to Verify

| Route | Variant |
|-------|---------|
| `/` (homepage) | `default` |
| `/newest` | `newest` |

---

## Viewports

| Name | Dimensions |
|------|------------|
| Desktop | 1440 × 900 |
| Mobile | 390 × 844 |

---

## Verification Checklist

### Layout

- [ ] **No horizontal scroll** on desktop tables at 1440px width
- [ ] Mobile layout switches to card-style (not table rows)
- [ ] Thumbnails render without distortion (64×64 on desktop, consistent sizing)

### Column Headers (Desktop)

**Homepage (`/`):**
| # | Header | Alignment |
|---|--------|-----------|
| 1 | Card | left |
| 2 | Total USD | right, nowrap |
| 3 | Historic USD | right, nowrap |
| 4 | Discount | right |
| 5 | Seller | left |
| 6 | Market | left |
| 7 | Ends | left |

**Newest (`/newest`):**
| # | Header | Alignment |
|---|--------|-----------|
| 1 | Card | left |
| 2 | Total USD | right, nowrap |
| 3 | Historic USD | right, nowrap |
| 4 | Discount | right |
| 5 | Price conf. | center, nowrap |
| 6 | Seller | left |
| 7 | Market | left |
| 8 | Ends | left |

### Cell Formatting

- [ ] **Missing historic price** shows `--` (never blank, never "Unscored")
- [ ] **Missing discount** shows `--` (never blank, never "N/A")
- [ ] **Currency** displays as `$X.XX` format (USD, no currency code suffix)
- [ ] **Discount** displays as `-X%` with minus sign, green color for good discounts
- [ ] **Market** shows flag emoji + short code (`🇺🇸 US` or `🇨🇦 CA`)
  - [ ] Tooltip on hover shows full market name
- [ ] **Ends** shows relative time (e.g., "2h 15m", "1d 3h")

### Confidence Chip (`/newest` and card detail pages)

- [ ] Shows `High`, `Med`, or `Low` label only (never raw numbers)
- [ ] Chip has appropriate color: green (high), amber (medium), slate (low)
- [ ] Tooltip includes `n=X` sample size when available

### Seller Column

- [ ] Long seller names truncate with ellipsis (no layout break)
- [ ] **TrustedBadge** (checkmark icon) appears for trusted sellers
  - [ ] Tooltip shows: `Trusted seller: 98%+ positive feedback, 20+ ratings`

### Interactive Elements

- [ ] Sort dropdown present and functional (changes row ordering)
- [ ] Condition filter dropdown works
- [ ] Market filter dropdown works
- [ ] Pagination controls appear when > 50 results

### Edge Cases to Spot-Check

- [ ] At least one row with **no historic data** (shows fallback badge)
- [ ] At least one row with a **trusted seller badge**
- [ ] At least one row with a **long listing title** (truncates properly in card column)

---

## Screenshot Capture Instructions

1. **Browser:** Chrome (latest stable)
2. **Zoom:** 100%
3. **Clear cache:** Not required
4. **DevTools viewport:** Use exact dimensions from table above

### File Naming Convention

Save to `docs/baseline/`:

| File | Route | Viewport |
|------|-------|----------|
| `home-desktop.png` | `/` | 1440×900 |
| `home-mobile.png` | `/` | 390×844 |
| `newest-desktop.png` | `/newest` | 1440×900 |
| `newest-mobile.png` | `/newest` | 390×844 |

**Optional:** Annotated versions with `-annotated` suffix (e.g., `home-desktop-annotated.png`)

---

## Notes

- Content (specific cards/deals) may differ between runs — focus on **layout and formatting**, not specific data values.
- If using seed data, note the seed in commit message.
- Admin column only visible when `isAdmin` prop is true — not part of baseline check unless specifically testing admin mode.
