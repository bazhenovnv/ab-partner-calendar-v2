# Stage 46 — Post-Deploy Pixel Audit

**Date:** 2026-07-12  
**Branch:** `claude/ab-afisha-architecture-plan-805f5o`  
**HEAD commit (GitHub):** `01c34631900909d103fe9186630984e7a359ea35`  
**Figma file:** `t7Vg797xBk263TgvZRrO12`, page root `5913:4745`  
**Scope:** Code-level audit against Figma specs. Screenshots provided by user were not visible in the message; findings are based on source code at HEAD + Figma node data from prior sessions.

---

## Deployment State Assessment

| Check | Result | Notes |
|-------|--------|-------|
| GitHub HEAD | `01c34631` | Stage 46 fully pushed |
| `ab-logo-mark-cropped.png` in repo | ✅ Present (10 816 bytes) | SHA `2fcfeb47` |
| `hero-composition.png` in repo | ✅ Present (324 374 bytes) | SHA `531a93be` |
| `globals.css` Stage 46 changes in repo | ✅ Present | Footer light theme, `#ffffff` bg |
| `EventCalendar.tsx` Stage 46 change in repo | ✅ Present | `bg-mint text-black` |
| `SiteFooter.tsx` Stage 46 change in repo | ✅ Present | image logo |
| `seed-staging-design.ts` in repo | ✅ Present | env-gated, NOT yet run |
| Staging Docker container rebuilt since assets commit | ⚠️ **UNKNOWN** | Last confirmed build predates Stage 45.3.1 |
| Staging DB has PUBLISHED events | ❌ **NOT SEEDED** | Seed script not yet executed |

**Root cause of all visible staging discrepancies:** The staging container was last built before the Stage 45.3.1 asset commit (SHA `8c68919`). All subsequent changes — static assets, CSS, TSX — are in GitHub but are NOT active in the running container until a full Docker rebuild + `next build`.

---

## Full Discrepancy Matrix

| # | Severity | Block | Element | Figma Spec | Code State (HEAD `01c34631`) | Status |
|---|----------|-------|---------|------------|------------------------------|--------|
| 1 | **CRITICAL** | Header | Logo image | `w-[62px] h-[67px]`, visible | Code correct; asset in repo; NOT served on staging (no rebuild) | ⛔ Deploy blocker |
| 2 | **CRITICAL** | Hero | Right image `hero-composition.png` | 693×323px panel fill | Code correct; asset in repo (324 KB); NOT served on staging | ⛔ Deploy blocker |
| 3 | **CRITICAL** | Footer | Background + all text colors | `#ffffff`, dark text | Code correct (`globals.css` Stage 46); NOT active on staging (no rebuild) | ⛔ Deploy blocker |
| 4 | **CRITICAL** | Footer | Logo mark | image `ab-logo-mark-cropped.png` `w-[46px] h-[50px]` | Code correct; asset in repo; NOT served on staging | ⛔ Deploy blocker |
| 5 | **CRITICAL** | Calendar | Selected day color | `bg-mint` (`#7CD8B3`) + `text-black` | Code correct (Stage 46); NOT active on staging (no rebuild) | ⛔ Deploy blocker |
| 6 | **CRITICAL** | Events grid | 6 PUBLISHED events | 6 cards with images, date badges, status badges | DB empty — EmptyState shown ("Мероприятия скоро появятся") | ⛔ Seed required |
| 7 | **CRITICAL** | Calendar | Date markers | Dots on 6 event dates | No markers — no events in DB | ⛔ Seed required |
| 8 | **CRITICAL** | MainEventsBanner | 5-card fan carousel | Section visible, 5 cards | Section hidden (`events.length === 0` → returns null) | ⛔ Seed required |
| 9 | **CRITICAL** | RotatingQuotesBlock | Quote text + author | Section visible | Section hidden (no quotes in DB → returns null) | ⛔ Seed required |
| 10 | **MAJOR** | Header | Nav button border-radius | Unconfirmed from Figma panel | `rounded-lg` (8px) — TEMP-UNRESOLVED comment in SiteHeader.tsx | ⚠️ Needs Figma confirm |
| 11 | **MAJOR** | EventCard | Title case | Mixed case in Figma card titles | Code uses `uppercase` on `<h3>` | ⚠️ Verify against Figma |
| 12 | **MAJOR** | EventCard | Gap between cards | Exact Figma gap not confirmed | `gap-[53px]` in grid | ⚠️ Needs Figma confirm |
| 13 | **MINOR** | Calendar | Weekday label color | `text-black` (Figma) | `text-primary/40` (intentional softening — noted in Stage 46 doc) | 🟡 Accepted deviation |
| 14 | **MINOR** | Background | `html`/`body`/PublicShell | `#F1F1F1` | `bg-[#f1f1f1]` in PublicShell + CSS | ✅ Correct in code |
| 15 | **INFO** | HeroSection | CTA scroll anchor | Button → events section | `href="#events"` → EventsSection `id="events"` | ✅ Correct |
| 16 | **INFO** | Footer | Column structure | Brand + 2 nav cols | Code matches: Brand / Наши проекты / Контакты | ✅ Correct |
| 17 | **INFO** | Footer | Legal / copyright / operator | Dark text on white bg | Code correct after Stage 46 | ✅ Correct in code |

---

## Block-by-Block Detail

### Block 1 — Header

**Figma node `5913:4745` → Group1296 (header logo group)**

| Property | Figma | Code | Match |
|----------|-------|------|-------|
| Logo image | `ab-logo-mark-cropped.png`, W=61.597px H=66.66px | `w-[62px] h-[67px] object-contain` | ✅ |
| Logo text | Montserrat SemiBold 18.69px `#1e1e1e` | `font-semibold text-[#1e1e1e] text-[18.69px]` | ✅ |
| Header height | ~80px | `h-20` (80px) | ✅ |
| Header bg | white | `bg-white` | ✅ |
| Nav button height | 38px | `h-[38px]` | ✅ |
| Nav button border-radius | **UNCONFIRMED** | `rounded-lg` (8px) | ⚠️ |
| Nav button shadow | `0 4px 4px 0 rgba(0,0,0,0.25)` | `shadow-[0_4px_4px_0_rgba(0,0,0,0.25)]` | ✅ |

**Staging visibility:** Logo NOT visible — asset not in running container.

---

### Block 2 — Hero

**Figma node `5913:4980`**

| Property | Figma | Code | Match |
|----------|-------|------|-------|
| Section bg | `#F1F1F1` | `pub-hero { background: #f1f1f1 }` | ✅ |
| Panel size | 1495×323px | `.pub-hero-panel` CSS | ✅ (CSS from prior stages) |
| Panel bg | white | CSS | ✅ |
| Panel radius | 28.3px | CSS | ✅ |
| Panel shadow | `0 4px 4px 0 rgba(0,0,0,0.25)` | CSS | ✅ |
| H1 | Montserrat Bold 43px `#0D2344` | CSS | ✅ |
| CTA button | `bg-[#7cd8b3]` h-47px w-212px, text black | CSS class `pub-hero-btn` | ✅ (code) |
| Right image | `hero-composition.png` 693×323 | Code correct | ⛔ NOT SERVED on staging |

---

### Block 3 — EventsSection (Filters + Calendar + Events Grid)

**Figma nodes `5913:4757` (calendar), filter panel**

**Events outer wrapper:**

| Property | Figma | Code | Match |
|----------|-------|------|-------|
| Width | 1497px | `.pub-events-outer max-width: 1497px` | ✅ |
| Radius | 35.604px | CSS | ✅ |
| Shadow | `0 0 9.129px rgba(0,0,0,0.3)` | CSS | ✅ |
| Background | white | CSS | ✅ |

**Filter column:**

| Property | Figma | Code | Match |
|----------|-------|------|-------|
| Width | 588px | `.pub-events-filters-col { width: 588px }` | ✅ |
| Height | 632px | CSS | ✅ |
| Radius | 40.23px | CSS | ✅ |
| Shadow | `0 0 9.549px rgba(0,0,0,0.3)` | CSS | ✅ |

**Calendar column:**

| Property | Figma | Code | Match |
|----------|-------|------|-------|
| Width | 760.866px | `.pub-events-calendar-col { width: 760.866px }` | ✅ |
| Height | 631.824px | CSS | ✅ |
| Radius | 40.228px | CSS | ✅ |
| Shadow | `0 0 9.355px rgba(0,0,0,0.3)` | CSS | ✅ |
| Background | `rgba(255,255,255,0.21)` | CSS | ✅ |
| Outer gap (Header→grid) | 29.002px | `style={{ gap: '29.002px' }}` | ✅ |
| Inner gap (weekdays→dates) | 9.355px | `style={{ gap: '9.355px' }}` | ✅ |
| Selected day bg | `#7CD8B3` (mint) | `bg-mint` (Stage 46) | ✅ code — ⛔ staging not rebuilt |
| Selected day text | `text-black` | `text-black` (Stage 46) | ✅ code — ⛔ staging not rebuilt |
| Selected day size | 43.97×43.014px | `style width/height` | ✅ |
| Selected day radius | `rounded-[93.554px]` | ✅ | ✅ |
| Selected day shadow | `drop-shadow(0 0 4.779px rgba(0,0,0,0.3))` | ✅ | ✅ |
| Date markers | Triangle corner indicator | `borderTop + borderLeft` CSS trick | ✅ |
| DB events for markers | 6 events on calendar | **0 events — NOT SEEDED** | ⛔ |

**Events grid:**

| Property | Figma | Code | Match |
|----------|-------|------|-------|
| Grid cols | 3 columns (desktop) | `grid-cols-1 tablet:grid-cols-2 wide:grid-cols-3` | ✅ |
| Card gap | ~53px | `gap-[53px]` | ⚠️ Needs Figma confirm |
| Card title case | Mixed case in Figma mockup | `uppercase` class on `<h3>` | ⚠️ Verify |
| Date badge | Day number + month abbreviation | Day/month from `formatEventDateParts` | ✅ |
| Status badge | LIVE / COMPLETED | Status labels rendered | ✅ |
| DB state | 6 event cards | **EmptyState rendered** (no events in DB) | ⛔ |

---

### Block 4 — MainEventsBanner

**Figma node `5913:4884`:** W=1496, H=945, bg=white, radius=20, shadow=`0 0 10px rgba(0,0,0,0.3)`

| Property | Figma | Code | Match |
|----------|-------|------|-------|
| Outer wrapper | W=1496 radius=20 shadow | `.pub-main-events-outer` CSS | ✅ |
| Title | "Главные события" Bold 26px `#0D2344` | `.pub-main-events-title` CSS | ✅ |
| Card size | 268×395px, `rounded-[18.259px]` | `.pub-carousel-card` CSS | ✅ |
| Gallery height | 428px | `.pub-carousel-gallery { height: 428px }` | ✅ |
| Fan transforms | offset ±1: 310px scale(0.82) rotate(5°), ±2: 545px scale(0.68) rotate(11°) | `getCardStyle()` in code | ✅ |
| Section visibility | Shown (5 mainEvent events) | **Hidden — 0 mainEvent events in DB** | ⛔ |

---

### Block 5 — RotatingQuotesBlock

**Figma quotes section (CSS class `quotes-section`)**

| Property | Code | Match |
|----------|------|-------|
| Section visibility | Shown when quotes.length > 0 | **Hidden — 0 quotes in DB** | ⛔ |
| Auto-rotation | 5s interval, 350ms fade | ✅ Implemented |
| Dot navigation | Rendered for quotes.length > 1 | ✅ Implemented |

---

### Block 6 — Footer

**Figma node area `5913:4996`** — Light background, dark text.

| Property | Figma | Code (Stage 46) | Staging |
|----------|-------|-----------------|---------|
| Background | `#ffffff` | `background: #ffffff` | ⛔ Old dark bg on staging (no rebuild) |
| Logo mark | image `~57×53px` | `<img> w-[46px] h-[50px]` | ⛔ Image not served |
| Logo text color | `#1e1e1e` | `color: #1e1e1e` | ⛔ No rebuild |
| Tagline color | `rgba(13,35,68,0.55)` | `color: rgba(13,35,68,0.55)` | ⛔ No rebuild |
| Col title | Gilroy Bold 1rem `#323232` | `font-gilroy font-weight:700 color:#323232` | ⛔ No rebuild |
| Link color | `#323232` | `color: #323232` | ⛔ No rebuild |
| Link hover | `#0D2344` | `:hover { color: #0D2344 }` | ⛔ No rebuild |
| Divider | `rgba(0,0,0,0.1)` | `border-top: 1px solid rgba(0,0,0,0.1)` | ⛔ No rebuild |
| Legal link color | `rgba(0,0,0,0.45)` | `color: rgba(0,0,0,0.45)` | ⛔ No rebuild |
| Copyright color | `rgba(0,0,0,0.4)` | `color: rgba(0,0,0,0.4)` | ⛔ No rebuild |
| Operator color | `rgba(0,0,0,0.3)` | `color: rgba(0,0,0,0.3)` | ⛔ No rebuild |
| Structure (3 cols) | Brand / Наши проекты / Контакты | Matches | ✅ |
| Legal links | from `LEGAL_LINKS` | ✅ | ✅ |
| Copyright | `© {year} АБ Афиша Бухгалтера` | ✅ | ✅ |
| Operator | ООО «АБ ГРУПП» · ОГРН · ИНН | ✅ | ✅ |

---

## CRITICAL Findings (Ordered by Priority)

| Priority | ID | Finding | Root Cause | Fix |
|----------|----|---------|------------|-----|
| 1 | C-01 | **All Stage 46 CSS/TSX not active on staging** — Footer still dark, selected day still wrong color, logo mark text still shows | Container not rebuilt | `docker compose build frontend && docker compose up -d frontend` |
| 2 | C-02 | **Static assets not served** — Header logo, hero image, footer logo all broken/invisible | Container not rebuilt (assets added after last build) | Same rebuild as C-01 |
| 3 | C-03 | **Zero events in DB** — Calendar blank, events grid shows EmptyState, MainEventsBanner hidden | Seed script not executed | `STAGING_DESIGN_SEED=1 npx ts-node --project tsconfig.json prisma/seed-staging-design.ts` |
| 4 | C-04 | **No quotes in DB** — RotatingQuotesBlock hidden | No quotes seeded (seed-staging-design only seeds events) | Insert ≥1 quote via admin panel or SQL |

---

## MAJOR Findings (Ordered by Priority)

| Priority | ID | Finding | Root Cause | Proposed Fix |
|----------|----|---------|------------|-------------|
| 1 | M-01 | **Header nav button border-radius unconfirmed** — `rounded-lg` (8px) is a visual estimate; marked TEMP-UNRESOLVED in code | Figma panel for nav buttons not found in audit sessions | Fetch Figma node for nav button group explicitly and confirm |
| 2 | M-02 | **EventCard title uppercase** — `<h3 className="... uppercase">` — Figma event card titles appear mixed-case in mockup | Uppercase was applied in an earlier stage | Verify Figma card node; if mixed-case → remove `uppercase` class |
| 3 | M-03 | **EventCard grid gap unconfirmed** — `gap-[53px]` between cards | Gap not explicitly extracted from Figma in prior stages | Fetch Figma events grid node and confirm exact row/column gap |

---

## MINOR / Accepted Deviations

| ID | Finding | Decision |
|----|---------|----------|
| D-01 | Calendar weekday labels: `text-primary/40` (soft) vs Figma `text-black` | Intentional softening for visual hierarchy — accepted, noted in Stage 46 doc |
| D-02 | EventCard no-image fallback: shows "АБ" text placeholder | Not visible when DB is seeded with real events |

---

## Proposed Fix Order

```
Step 1 — REBUILD STAGING (unblocks C-01, C-02, C-03 partially)
  docker compose build frontend
  docker compose up -d frontend
  # Verify: curl -I https://<STAGING>/ab-logo-mark-cropped.png → 200
  # Verify: footer background is white
  # Verify: calendar selected day is mint on click

Step 2 — SEED EVENTS (unblocks C-03, C-04 partial)
  cd apps/backend
  STAGING_DESIGN_SEED=1 npx ts-node --project tsconfig.json prisma/seed-staging-design.ts
  # Verify: GET /api/events/public?limit=6 → 6 events
  # Verify: MainEventsBanner carousel appears
  # Verify: Calendar shows date markers

Step 3 — SEED QUOTES (unblocks C-04)
  INSERT ≥1 quote via admin panel → RotatingQuotesBlock becomes visible

Step 4 — CONFIRM M-01 (Header nav radius)
  Fetch Figma node for nav button group explicitly
  Adjust rounded-* if needed → commit + rebuild

Step 5 — CONFIRM M-02 (EventCard title case)
  Fetch Figma EventCard node
  Remove uppercase if Figma is mixed-case → commit + rebuild

Step 6 — CONFIRM M-03 (EventCard gap)
  Fetch Figma events grid node → confirm gap value
  Adjust gap-[Npx] if needed → commit + rebuild
```

---

## Files Audited

| File | SHA at HEAD | Stage Last Touched |
|------|-------------|-------------------|
| `apps/frontend/src/components/layout/SiteHeader.tsx` | `816a87f9` | 45.3.1 |
| `apps/frontend/src/components/layout/SiteFooter.tsx` | `014584f3` | 46 |
| `apps/frontend/src/components/layout/PublicShell.tsx` | `3fd528f5` | 45.4 |
| `apps/frontend/src/components/HeroSection.tsx` | `7427dea4` | 45.3 |
| `apps/frontend/src/components/events/EventCalendar.tsx` | `92808221` | 46 |
| `apps/frontend/src/components/events/EventsSection.tsx` | `e278a1bd` | 44–45 |
| `apps/frontend/src/components/events/EventCard.tsx` | `e741b93d` | 44–45 |
| `apps/frontend/src/components/events/EventFilters.tsx` | `189f809e` | 44–45 |
| `apps/frontend/src/components/events/MainEventsBanner.tsx` | `962492b7` | 44–45 |
| `apps/frontend/src/components/RotatingQuotesBlock.tsx` | `45d56604` | 44–45 |
| `apps/frontend/src/app/globals.css` | (Stage 46) | 46 |
| `apps/frontend/public/ab-logo-mark-cropped.png` | `2fcfeb47` | 45.3.1 |
| `apps/frontend/public/hero-composition.png` | `531a93be` | 45.3 |
| `apps/backend/prisma/seed-staging-design.ts` | Stage 46 | 46 |
