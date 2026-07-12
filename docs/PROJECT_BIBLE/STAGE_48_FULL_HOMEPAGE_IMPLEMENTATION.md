# Stage 48 — Full Homepage Pixel-Perfect Implementation

**Branch:** `claude/ab-afisha-architecture-plan-805f5o`  
**GitHub HEAD after stage:** `70d8588b`  
**Date:** 2026-07-12

---

## Summary

Stage 48 applied all pending pixel-perfect corrections to the public homepage
for `bazhenovnv/ab-partner-calendar-v2`. Changes target layout, event section,
quotes section and clean up visual regressions identified in Stage 47 review.

---

## Commits

| SHA | Message |
|-----|---------|
| `f4e81734` | fix(layout): align page canvas, header and hero with Figma |
| `fb03050e` | fix(events): rebuild calendar grid and event cards to Figma |
| `70d8588b` | fix(carousel): implement Figma quotes card with mint border |
| this commit | docs(stage-48): record full homepage pixel-perfect implementation |

---

## Changes Applied

### 1. `apps/frontend/src/app/globals.css`

#### `.pub-events-outer` — remove `min-height: 1428px`
- **Problem:** The `min-height: 1428px` Figma dimension was applied literally,
  causing a giant white empty panel when the events grid is loading or empty.
- **Fix:** Removed `min-height`. Increased bottom padding to `54px` for breathing
  room below the grid. The panel now sizes to its actual content.

#### `.quotes-inner` / `.quotes-card` — mint border card
- **Added:** `.quotes-card` — white `#ffffff` card with `1.5px solid #7CD8B3`
  border, `border-radius: 20px`, `padding: 2rem 2.5rem 2.5rem`.
- `.quotes-inner` max-width updated from `860px` → `900px`; gap set to `0`
  (card is self-contained).
- Mobile breakpoint: `padding: 1.5rem 1.25rem 2rem` for `max-width: 390px`.

### 2. `apps/frontend/src/components/events/EventCard.tsx`

- **Removed** `uppercase` Tailwind class from the event title `<h3>`.
- Titles now render in natural sentence/title case, matching Figma typography.

### 3. `apps/frontend/src/components/events/EventCalendar.tsx`

- **Grid lines:** Each day cell is now wrapped in a `<div>` with
  `border-r border-b border-primary/[0.06]`. The grid container gets
  `border-t border-l border-primary/[0.06]`, producing a full table-style
  grid. Empty leading cells have matching borders.
- **Weekend tint:** `colIndex = (firstDow + i) % 7`. Columns where
  `colIndex === 5 || colIndex === 6` (Сб / Вс) get `bg-primary/[0.025]`
  on the cell wrapper. Weekday labels at index 5/6 get `text-primary/30`.
- **Row gap removed:** `rowGap: '9.355px'` removed from date grid; borders
  now define cell separation. The `9.355px` gap between weekday row and
  date grid (flexbox) is unchanged.
- Accessibility: `role="gridcell"` stays on the `<button>` (the interactive
  element). The wrapper `<div>` is presentational only.

### 4. `apps/frontend/src/components/RotatingQuotesBlock.tsx`

- Wrapped the blockquote, eyebrow, and dots in `.quotes-card`.
- `.quotes-inner` is now a centering shell only; `.quotes-card` is the
  visual card with mint border.

---

## Not Changed (Locked Elements)

- Hero panel structure, gradient, image — untouched
- Filter logic, Event API, EventsSection structure — untouched
- EventCard structure (only typography class removed)
- Main Events Carousel animations — untouched (fixed in Stage 47.1)
- Footer light theme — already correct after Stage 47.1
- Backend, DB schema, middleware, Docker, nginx, SSL — untouched
- All `.env` files — not committed

---

## Assets Status

| Asset | Status |
|-------|--------|
| `public/ab-logo-mark-cropped.png` | Present ✅ |
| `public/hero-composition.png` | Present ✅ |
| `public/fonts/gilroy/` (6 files) | Present ✅ |
| Quote illustrations | Not available — no files in project-assets |
| Footer illustration | Not available — no files in project-assets |

Quote and footer illustrations cannot be added without asset files in
`project-assets/illustrations/`. This is a P3 item requiring a separate
asset delivery.

---

## Deploy Commands

```bash
cd /srv/ab-afisha
git fetch origin
git checkout claude/ab-afisha-architecture-plan-805f5o
git reset --hard origin/claude/ab-afisha-architecture-plan-805f5o

# Staging
docker compose -f docker-compose.staging.yml build --no-cache frontend
docker compose -f docker-compose.staging.yml up -d --no-deps --force-recreate frontend

# Production
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate frontend
```

Optional seed commands if staging DB is empty:
```bash
STAGING_DESIGN_SEED=1 npx ts-node --project tsconfig.json prisma/seed-staging-design.ts
STAGING_DESIGN_SEED=1 npx ts-node --project tsconfig.json prisma/seed-staging-quotes.ts
```

---

## P3 Items (Require Separate Figma Confirmation)

- Header nav button border-radius exact value
- EventCard grid gap exact value (currently `gap-[53px]`)
- Quotes section background color (currently `#f8f9fc`; may be `#f1f1f1`)
- Quote and footer illustration assets — need delivery from designer

---

## Stop Conditions Met

- [x] All P1 corrections applied and committed
- [x] All P2 corrections applied and committed
- [x] No required assets missing for committed changes
- [x] No secrets committed
- [x] No DB schema changes
- [x] No force push
- [x] Audit document created
