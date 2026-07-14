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

---

## Stage 58 / 58.2 / 58.3 update — 2026-07-14

### Fixes applied (commit `e8e153d`)

| Fix | Status |
|---|---|
| Event card grid: `wide:grid-cols-3` → `desktop:grid-cols-3` (activates at ≥1440px) | ✅ |
| Hero top padding 52px → hero panel at y=132 matching Figma | ✅ |
| Hero bottom padding 25px → gap hero→events = 25px | ✅ |
| Events section bottom padding 25px → gap events→carousel = 25px | ✅ |
| `html, body { background-color: #f1f1f1 }` explicit | ✅ |

### Canonical scale verification (Stage 58.2)

Figma frame `5913:4745` actual width: **1920px** (design space, confirmed via Figma MCP `get_metadata`).

Figma prototype viewer uses `scaling=min-zoom` — displays the 1920px frame at ~66–75% on a 1280–1440px laptop screen. This viewer zoom is **not a CSS reference**.

Playwright-measured CSS values at 1920px viewport vs Figma node dimensions:

| Element | Figma width | CSS width | Δ |
|---|---:|---:|---:|
| Events outer | 1497 | 1497 | 0 |
| Filters | 588 | 588 | 0 |
| Calendar | 760.866 | 760.9 | +0.034 |
| Hero panel | ~1496 | 1496 | 0 |
| Carousel+Quotes | 1496 | 1496 | 0 |
| Footer | 1496 | 1496 | 0 |

**Canonical desktop scale is LOCKED. Do not reduce panel widths.**

### Background audit (Stage 58.3)

| Element | Required | Computed | OK |
|---|---|---|---|
| `html` | `#F1F1F1` | `rgb(241,241,241)` | ✅ |
| `body` | `#F1F1F1` | `rgb(241,241,241)` | ✅ |
| `PublicShell` root | `#F1F1F1` | `rgb(241,241,241)` | ✅ |
| `main` | transparent | `rgba(0,0,0,0)` | ✅ |
| `.pub-hero` | `#F1F1F1` | `rgb(241,241,241)` | ✅ |
| `.pub-hero-panel` | `#FFFFFF` | `rgb(255,255,255)` | ✅ |
| `.pub-events-section` | transparent | `rgba(0,0,0,0)` | ✅ |
| `.pub-events-outer` | `#FFFFFF` | `rgb(255,255,255)` | ✅ |
| `.pub-main-quotes-wrapper` | transparent | `rgba(0,0,0,0)` | ✅ |
| `.pub-main-quotes-inner` | `#FFFFFF` | `rgb(255,255,255)` | ✅ |
| `header` | `#FFFFFF` | `rgb(255,255,255)` | ✅ |
| `footer` | `#FFFFFF` | `rgb(255,255,255)` | ✅ |

No conflicts found. No CSS changes were required for background architecture.
