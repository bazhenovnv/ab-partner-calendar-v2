# HOMEPAGE_COMPARISON — Stage 52

**Date:** 2026-07-13  
**Branch:** `claude/ab-afisha-architecture-plan-805f5o`  
**HEAD:** see git log  
**Viewport:** 1920×1080, browser zoom 100%  
**Backend:** Not running — all data-dependent blocks show empty/fallback state.

## Screenshot files

| File | Resolution | Description |
|---|---|---|
| `HOMEPAGE_CURRENT_1920.png` | 1920×1887 (full-page) | Current staging at 1920px viewport, no backend |
| `HOMEPAGE_FOOTER_CROP.png` | 1920×400 | Footer crop |
| `HOMEPAGE_QUOTES_CROP.png` | 1920×744 | Mid-page crop showing quotes section area |

## Verified fixes this stage

| Fix | Status |
|---|---|
| Calendar prev-month dates rendered | ✅ |
| Calendar weekend tint `bg-mint/[0.10]` | ✅ |
| Calendar selected-day `bg-selected-day text-white` | ✅ |
| Reset filter always visible, greyed when no filters | ✅ |
| Reset filter has ↺ icon | ✅ |
| Footer stationery `notebook-stationery.png` added | ✅ |
| Footer stationery registered in `05_ASSET_REGISTRY.md` | ✅ |
| Quotes layout: three-column geometry (left area / card / right area) | ✅ |
| Quotes person placeholder areas (MISSING_APPROVED_ASSET) preserved | ✅ |
| Main Events carousel: keyboard navigation (ArrowLeft/ArrowRight) | ✅ |
| Main Events carousel: 5-card fan transforms | ✅ |
| Main Events carousel: pagination dots + arrows | ✅ |
| Build passes (`pnpm --filter frontend build`) | ✅ |

## Blocks not verifiable without backend

| Block | Reason |
|---|---|
| MainEventsBanner | Needs `main.length > 0` — requires running backend with seed data |
| RotatingQuotesBlock | Needs `qs.length > 0` — requires running backend with quote seed data |
| EventCard grid (3×2) | Needs events with a selected date — requires running backend |
| Event cover images | ASSET-004 — must come from backend seed |

## Open issues remaining

| ID | Status after Stage 52 |
|---|---|
| `UI-001` | OPEN — 1920px comparison pending full staging deployment |
| `UI-002` | PARTIAL — calendar geometry fixed; full staging comparison pending |
| `ASSET-001` | MISSING_APPROVED_ASSET — no standalone person cutout found |
| `ASSET-002` | MISSING_APPROVED_ASSET — no standalone person cutout found |
| `ASSET-003` | CLOSED — `notebook-stationery.png` registered and deployed to footer |
| `ASSET-004` | MISSING_APPROVED_ASSET — must come from backend seed |
| `UI-003` | OPEN — carousel functional but not renderable without backend |
| `UI-004` | BLOCKED_BY_ASSET — quotes geometry implemented; person assets still missing |
| `UI-005` | PARTIAL — stationery added to footer; verified with screenshot |

## Scale verification

At 1920px viewport:
- No `transform: scale` found in active CSS
- No `zoom` CSS property found
- Content panels use `max-width: 1496px` centered
- Full page width: 1920px ✅
