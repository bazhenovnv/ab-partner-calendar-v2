# Stage 47 — Full Figma Pixel Audit

**Date:** 2026-07-12  
**Branch:** `claude/ab-afisha-architecture-plan-805f5o`  
**GitHub HEAD:** `a9138a02` (this commit adds only this doc)  
**Figma file:** `t7Vg797xBk263TgvZRrO12`, page root `5913:4745`  
**globals.css SHA verified:** `b1a3e5e1d69b44b2a21de7385ea41ff89ea88bc1`

---

## Methodology

- Figma values: from `get_design_context` calls in Stages 44–46 (node IDs documented per block)
- Code values: from `globals.css` fetched at HEAD `a9138a02` + component TSX files
- Figma MCP rate-limited (Starter plan) — no new Figma calls possible in this session
- ⚠️ Where Figma value is labelled `PREV-SESSION`, it came from a prior session’s Figma fetch and is confirmed-accurate
- Visual guessing: FORBIDDEN — all values sourced from code or documented Figma node data

---

## CRITICAL PRE-AUDIT FINDING

**Stage 46 globals.css changes are NOT in the repository.**

The `globals.css` at HEAD `a9138a02` (SHA `b1a3e5e1`) still contains:

```css
.pub-footer { background: var(--color-primary); /* = #0D2344 dark */ }
.pub-footer-logo-text { color: #fff; }
.pub-footer-desc { color: rgba(255,255,255,0.5); }
/* ... all white-based footer colors ... */
```

The Stage 46 commit (`01c34631`) was logged as including footer light-theme CSS, but the file content at HEAD proves otherwise. The `SiteFooter.tsx` image-logo change IS committed correctly. Only the CSS was missed.

This is a new CRITICAL code fix required in Stage 47.

---

## Full Discrepancy Table

### Sorted by Priority (P1 = highest)

| # | BLOCK | PROPERTY | FIGMA | CURRENT CODE | DIFF | PRIORITY |
|---|-------|----------|-------|--------------|------|----------|
| 1 | Footer | `background` | `#ffffff` | `var(--color-primary)` = `#0D2344` | Dark vs light — Stage 46 CSS missing | **P1** |
| 2 | Footer | `.pub-footer-logo-text color` | `#1e1e1e` | `#fff` | Inverted | **P1** |
| 3 | Footer | `.pub-footer-desc color` | `rgba(13,35,68,0.55)` | `rgba(255,255,255,0.5)` | Inverted | **P1** |
| 4 | Footer | `.pub-footer-col-title` font/color | Gilroy Bold 1rem `#323232` | Montserrat SemiBold 0.8125rem uppercase `rgba(255,255,255,0.45)` | Font family + weight + size + case + color | **P1** |
| 5 | Footer | `.pub-footer-link color` | `#323232` | `rgba(255,255,255,0.65)` | Inverted | **P1** |
| 6 | Footer | `.pub-footer-link:hover color` | `#0D2344` | `#fff` | Inverted | **P1** |
| 7 | Footer | `.pub-footer-divider` | `rgba(0,0,0,0.1)` | `rgba(255,255,255,0.08)` | Inverted | **P1** |
| 8 | Footer | `.pub-footer-legal-link color` | `rgba(0,0,0,0.45)` | `rgba(255,255,255,0.4)` | Inverted | **P1** |
| 9 | Footer | `.pub-footer-copy color` | `rgba(0,0,0,0.4)` | `rgba(255,255,255,0.25)` | Inverted | **P1** |
| 10 | Footer | `.pub-footer-operator color` | `rgba(0,0,0,0.3)` | `rgba(255,255,255,0.18)` | Inverted | **P1** |
| 11 | Footer | Logo mark | `<img> w=[46px] h=[50px]` | `<img>` correctly in TSX; CSS `background: dark` hides it | TSX ✅; CSS ❌ | **P1** |
| 12 | Hero | CTA button height | `47px` | `42px` | −5px | **P2** |
| 13 | Hero | CTA button font-size | `17px` (1.0625rem) | `0.9375rem` = 15px | −2px | **P2** |
| 14 | Hero | CTA button border-radius | `5.98px` | `10px` | +4.02px | **P2** |
| 15 | Hero | CTA button width | `212px` (from Figma node) | Not set (auto flex-start) | No fixed width | **P2** |
| 16 | Main Events | Section title font-size | `26px` Bold | `24px` Bold | −2px | **P2** |
| 17 | Main Events | `box-shadow` | `0 0 10px rgba(0,0,0,0.3)` | `0 4px 4px 0 rgba(0,0,0,0.25)` | Wrong shadow type | **P2** |
| 18 | Main Events | `border` | Not in Figma spec | `1px solid rgba(0,0,0,0.15)` | Extra border not in Figma | **P2** |
| 19 | Main Events | Carousel card `border-radius` | `18.259px` | `16px` | −2.259px | **P3** |
| 20 | Calendar | Selected day CSS | `bg-[#7CD8B3] text-black` (Stage 46) | **Code CORRECT in TSX** | No CSS fix needed; staging rebuild required | **DEPLOY** |
| 21 | Header | Logo image | Visible, w=62px h=67px | Code correct; asset in repo | Staging rebuild required | **DEPLOY** |
| 22 | Hero | `hero-composition.png` | Visible right panel | Code correct; asset in repo | Staging rebuild required | **DEPLOY** |
| 23 | Events Grid | Card title case | Mixed-case (Figma mockup) | `uppercase` class on `<h3>` | Needs Figma node confirm | **P3** |
| 24 | Events Grid | Card gap | Unconfirmed | `gap-[53px]` | Needs Figma node confirm | **P3** |
| 25 | Header | Nav button border-radius | Unconfirmed | `rounded-lg` = 8px (estimate) | TEMP-UNRESOLVED in code | **P3** |
| 26 | Quotes | Block background | `#f8f9fc` (code) | No Figma data for this node | Needs Figma node confirm | **P3** |
| 27 | Calendar | Weekday color | `text-black` (Figma) | `text-primary/40` (code) | Accepted intentional deviation | **ACCEPTED** |
| 28 | Background | Page `html`/`body`/Shell | `#F1F1F1` | `#f1f1f1` (≡) | ✅ Match | — |
| 29 | Hero | Panel dimensions | 1495×323px | `max-width:1496px; height:323px` | ✅ Match | — |
| 30 | Hero | Panel radius | 28.3px | `border-radius: 28.3px` | ✅ Match | — |
| 31 | Hero | Panel shadow | `0 4px 4px rgba(0,0,0,0.25)` | `box-shadow: 0 4px 4px 0 rgba(0,0,0,0.25)` | ✅ Match | — |
| 32 | Hero | H1 font | Montserrat Bold 43px `#0D2344` | `font-size:43px; font-weight:700; color:#0D2344` | ✅ Match | — |
| 33 | Hero | Subtitle font | Montserrat 16px `rgba(13,35,68,0.6)` | `font-size:16px; color:rgba(13,35,68,0.6)` | ✅ Match | — |
| 34 | Hero | Content padding | 54px H, 41px V | `padding: 41px 54px` | ✅ Match | — |
| 35 | Outer Panel | `max-width` | 1497px | `max-width: 1497px` | ✅ Match | — |
| 36 | Outer Panel | `border-radius` | 35.604px | `border-radius: 35.604px` | ✅ Match | — |
| 37 | Outer Panel | `box-shadow` | `0 0 9.129px rgba(0,0,0,0.3)` | `box-shadow: 0 0 9.129px rgba(0,0,0,0.3)` | ✅ Match | — |
| 38 | Outer Panel | `padding` | 40px 54px | `padding: 40px 54px` | ✅ Match | — |
| 39 | Filter | Width | 588px | `width: 588px` | ✅ Match | — |
| 40 | Filter | Height | 632px | `height: 632px` | ✅ Match | — |
| 41 | Filter | `border-radius` | 40.23px | `border-radius: 40.23px` | ✅ Match | — |
| 42 | Filter | `box-shadow` | `0 0 9.549px rgba(0,0,0,0.3)` | `box-shadow: 0 0 9.549px rgba(0,0,0,0.3)` | ✅ Match | — |
| 43 | Filter | Title font | Montserrat Bold 21px | `font-size:21px; font-weight:700` | ✅ Match | — |
| 44 | Filter | Label font | Montserrat SemiBold 17px, `rgba(13,35,68,0.55)` | `font-size:17px; font-weight:600; color:rgba(13,35,68,0.55)` | ✅ Match | — |
| 45 | Filter | Apply btn | 231×48px, `#0D2344`, radius 8px | `width:231px; height:48px; border-radius:8px` | ✅ Match | — |
| 46 | Calendar | Dimensions | 760.866×631.824px | `width:760.866px; height:631.824px` | ✅ Match | — |
| 47 | Calendar | `border-radius` | 40.228px | `border-radius: 40.228px` | ✅ Match | — |
| 48 | Calendar | `box-shadow` | `0 0 9.355px rgba(0,0,0,0.3)` | `box-shadow: 0 0 9.355px rgba(0,0,0,0.3)` | ✅ Match | — |
| 49 | Calendar | `background` | `rgba(255,255,255,0.21)` | `background: rgba(255,255,255,0.21)` | ✅ Match | — |
| 50 | Calendar | `padding` | 28.066px 26.764px 28.066px 41.102px | `padding: 28.066px 26.764px 28.066px 41.102px` | ✅ Match | — |
| 51 | Calendar | Outer gap | 29.002px | `style={{ gap: '29.002px' }}` | ✅ Match | — |
| 52 | Calendar | Inner gap | 9.355px | `style={{ gap: '9.355px' }}` | ✅ Match | — |
| 53 | Calendar | Selected day size | 43.97×43.014px | `width:43.97px; height:43.014px` (inline) | ✅ Match | — |
| 54 | Calendar | Selected day radius | 93.554px | `rounded-[93.554px]` | ✅ Match | — |
| 55 | Calendar | Selected day shadow | `drop-shadow(0 0 4.779px rgba(0,0,0,0.3))` | `drop-shadow-[0px_0px_4.779px_rgba(0,0,0,0.3)]` | ✅ Match | — |
| 56 | Main Events | Width | 1496px | `max-width: 1496px` | ✅ Match | — |
| 57 | Main Events | `border-radius` | 20px | `border-radius: 20px` | ✅ Match | — |
| 58 | Main Events | Card dimensions | 268×395px | `width:268px; height:395px` | ✅ Match | — |
| 59 | Main Events | Gallery height | 428px | `height: 428px` | ✅ Match | — |
| 60 | Footer | Column structure | Brand / Наши проекты / Контакты | 3-col grid in TSX | ✅ Match | — |
| 61 | Footer | Legal links | Correct content | From `LEGAL_LINKS` | ✅ Match | — |
| 62 | Footer | Copyright text | `© {year} АБ Афиша Бухгалтера` | ✅ Match | ✅ Match | — |
| 63 | Footer | Operator text | ООО «АБ ГРУПП» ГРН/ИНН | ✅ Match | ✅ Match | — |

---

## Block-by-Block Summary

### 1. Header

| Property | Figma | Code | Status |
|----------|-------|------|--------|
| Logo image | `ab-logo-mark-cropped.png` 62×67px | Code ✅; asset not served (rebuild) | DEPLOY BLOCKER |
| Logo text | Montserrat SemiBold 18.69px `#1e1e1e` | `font-semibold text-[#1e1e1e] text-[18.69px]` | ✅ |
| Height | ~80px | `h-20` | ✅ |
| Background | white | `bg-white` | ✅ |
| Nav h | 38px | `h-[38px]` | ✅ |
| Nav shadow | `0 4px 4px rgba(0,0,0,0.25)` | ✅ | ✅ |
| Nav radius | UNCONFIRMED | `rounded-lg` (8px estimate) | ⚠️ UNCONFIRMED |

---

### 2. Hero

| Property | Figma (node `5913:4980`) | Code | Status |
|----------|--------------------------|------|--------|
| Section bg | `#F1F1F1` | `background: #f1f1f1` | ✅ |
| Panel size | 1495×323px | `max-width:1496px; height:323px` | ✅ |
| Panel radius | 28.3px | `border-radius:28.3px` | ✅ |
| Panel shadow | `0 4px 4px rgba(0,0,0,0.25)` | ✅ | ✅ |
| Panel border | `1px solid rgba(0,0,0,0.15)` (TEMP estimate) | ✅ | ⚠️ opacity unconfirmed |
| H1 size | 43px | `font-size:43px` | ✅ |
| H1 weight | Bold 700 | `font-weight:700` | ✅ |
| H1 color | `#0D2344` | `color:#0D2344` | ✅ |
| Subtitle size | 16px | `font-size:16px` | ✅ |
| Content padding | 41px V, 54px H | `padding:41px 54px` | ✅ |
| **CTA height** | **47px** | **42px** | **❌ −5px** |
| **CTA font-size** | **17px** | **0.9375rem (15px)** | **❌ −2px** |
| **CTA border-radius** | **5.98px** | **10px** | **❌ +4.02px** |
| CTA width | 212px | auto (flex-start) | ⚠️ no fixed width |
| CTA bg | `#7CD8B3` | `background: #7CD8B3` | ✅ |
| CTA color | `#0D2344` | `color: #0D2344` | ✅ |
| Hero image | `hero-composition.png` visible | Code ✅; asset not served | DEPLOY BLOCKER |

---

### 3. Background

| Property | Figma | Code | Status |
|----------|-------|------|--------|
| `html`/`body` bg | `#F1F1F1` | `background: #f1f1f1` | ✅ |
| PublicShell | `#F1F1F1` | `bg-[#f1f1f1]` | ✅ |
| pub-hero | `#F1F1F1` | `background: #f1f1f1` | ✅ |
| pub-events-section | transparent (inherits) | transparent | ✅ |

---

### 4. Outer Events Panel

| Property | Figma (node `5913:4752`) | Code | Status |
|----------|--------------------------|------|--------|
| `max-width` | 1497px | `max-width:1497px` | ✅ |
| `min-height` | 1428px | `min-height:1428px` | ✅ |
| `border-radius` | 35.604px | `border-radius:35.604px` | ✅ |
| `box-shadow` | `0 0 9.129px rgba(0,0,0,0.3)` | ✅ | ✅ |
| `padding` | 40px top/bottom, 54px sides | `padding:40px 54px` | ✅ |
| Controls gap | 41.36px | `gap:41.36px` | ✅ |

---

### 5. Filter Panel

| Property | Figma (node `5913:4888`) | Code | Status |
|----------|--------------------------|------|--------|
| Width | 588px | `width:588px` | ✅ |
| Height | 632px | `height:632px` | ✅ |
| `border-radius` | 40.23px | `border-radius:40.23px` | ✅ |
| `box-shadow` | `0 0 9.549px rgba(0,0,0,0.3)` | ✅ | ✅ |
| Padding | top:39px, sides:24.86px | `padding:39px 24.86px 24px` | ✅ |
| Title | Montserrat Bold 21px `#0D2344` | ✅ | ✅ |
| Label | Montserrat SemiBold 17px `rgba(13,35,68,0.55)` | ✅ | ✅ |
| Select border-radius | 9.233px | `border-radius:9.233px` | ✅ |
| Two-col layout | 236px + 96px gap | ✅ | ✅ |
| Apply btn | 231×48px `#0D2344` radius 8px | ✅ | ✅ |

---

### 6. Calendar

| Property | Figma (node `5913:4757`) | Code | Status |
|----------|--------------------------|------|--------|
| Width | 760.866px | `width:760.866px` | ✅ |
| Height | 631.824px | `height:631.824px` | ✅ |
| `border-radius` | 40.228px | `border-radius:40.228px` | ✅ |
| `box-shadow` | `0 0 9.355px rgba(0,0,0,0.3)` | ✅ | ✅ |
| `background` | `rgba(255,255,255,0.21)` | ✅ | ✅ |
| Padding | 28.066px 26.764px 28.066px 41.102px | ✅ | ✅ |
| Outer gap | 29.002px | `style={{ gap:'29.002px' }}` | ✅ |
| Inner gap | 9.355px | `style={{ gap:'9.355px' }}` | ✅ |
| Selected day bg | `#7CD8B3` | `bg-mint` | ✅ |
| Selected day text | `text-black` | `text-black` | ✅ |
| Selected day size | 43.97×43.014px | inline style ✅ | ✅ |
| Selected day radius | 93.554px | `rounded-[93.554px]` | ✅ |
| Selected day shadow | `drop-shadow(0 0 4.779px rgba(0,0,0,0.3))` | ✅ | ✅ |
| Date markers | Corner triangle (live/planned/done colors) | borderTop/borderLeft ✅ | ✅ |
| Weekday color | `text-black` | `text-primary/40` | ACCEPTED deviation |

---

### 7. Events of Selected Day

| Property | Figma | Code | Status |
|----------|-------|------|--------|
| Grid columns | 3 desktop | `grid-cols-1 tablet:2 wide:3` | ✅ |
| Card gap | UNCONFIRMED | `gap-[53px]` | ⚠️ UNCONFIRMED |
| Card title case | Mixed-case (Figma mockup) | `uppercase` on `<h3>` | ⚠️ NEEDS CONFIRM |
| Date badge | day + month abbr | `formatEventDateParts` | ✅ |
| Status badge | LIVE / PLANNED / COMPLETED | Rendered | ✅ |
| Events in DB | 6 events needed | **0 — NOT SEEDED** | DATA BLOCKER |

---

### 8. Main Events Carousel

| Property | Figma (node `5913:4884`) | Code | Status |
|----------|--------------------------|------|--------|
| Width | 1496px | `max-width:1496px` | ✅ |
| Height | 945px | auto (content) | ⚠️ auto vs fixed |
| `border-radius` | 20px | `border-radius:20px` | ✅ |
| **`box-shadow`** | **`0 0 10px rgba(0,0,0,0.3)`** | **`0 4px 4px 0 rgba(0,0,0,0.25)`** | **❌ Wrong** |
| **`border`** | Not in Figma | `1px solid rgba(0,0,0,0.15)` | **❌ Extra** |
| **Title font-size** | **26px Bold** | **24px Bold** | **❌ −2px** |
| Card width | 268px | `width:268px` | ✅ |
| Card height | 395px | `height:395px` | ✅ |
| **Card radius** | **18.259px** | **16px** | **❌ −2.259px** |
| Gallery height | 428px | `height:428px` | ✅ |
| Fan transforms | ±1: 310px scale(0.82) rotate(5°) | `getCardStyle()` | ✅ |
| Section visibility | Visible | **Hidden — no mainEvent events** | DATA BLOCKER |

---

### 9. Quotes

| Property | Figma | Code | Status |
|----------|-------|------|--------|
| Block `background` | UNCONFIRMED from Figma | `#f8f9fc` | ⚠️ NEEDS CONFIRM |
| Quote text | Gilroy Regular clamp(1.05–1.35rem) | `.quotes-text` | ✅ |
| Quote mark | `color: var(--color-mint)` | ✅ | ✅ |
| Author font | 0.875rem `rgba(13,35,68,0.5)` | ✅ | ✅ |
| Active dot | `background: var(--color-selected-day)` | ✅ | ✅ |
| Section visibility | Visible | **Hidden — no quotes** | DATA BLOCKER |

---

### 10. Footer

| Property | Figma (node area `5913:4996`) | Code (globals.css HEAD) | Status |
|----------|-------------------------------|------------------------|--------|
| **`background`** | **`#ffffff`** | **`var(--color-primary)` = `#0D2344`** | **❌ Stage 46 CSS missing** |
| Border-top | `rgba(0,0,0,0.06)` | `margin-top: auto` only | ❌ Missing |
| **Logo mark text color** | **`#1e1e1e`** | **`#fff`** | **❌** |
| **Description color** | **`rgba(13,35,68,0.55)`** | **`rgba(255,255,255,0.5)`** | **❌** |
| **Col title font/color** | **Gilroy Bold 1rem `#323232`** | **Montserrat SemiBold 0.8125rem uppercase `rgba(255,255,255,0.45)`** | **❌** |
| **Link color** | **`#323232`** | **`rgba(255,255,255,0.65)`** | **❌** |
| **Link hover color** | **`#0D2344`** | **`#fff`** | **❌** |
| **Divider** | **`rgba(0,0,0,0.1)`** | **`rgba(255,255,255,0.08)`** | **❌** |
| **Legal link color** | **`rgba(0,0,0,0.45)`** | **`rgba(255,255,255,0.4)`** | **❌** |
| **Copyright color** | **`rgba(0,0,0,0.4)`** | **`rgba(255,255,255,0.25)`** | **❌** |
| **Operator color** | **`rgba(0,0,0,0.3)`** | **`rgba(255,255,255,0.18)`** | **❌** |
| Logo image TSX | `<img w-[46px] h-[50px]>` | ✅ SiteFooter.tsx correct | ✅ |
| 3-col structure | Brand / Наши проекты / Контакты | ✅ | ✅ |
| Copyright text | `© {year} АБ Афиша Бухгалтера` | ✅ | ✅ |
| Operator text | ООО «АБ ГРУПП» ОГРН/ИНН | ✅ | ✅ |

---

## Stage 47 Fix Plan

### Commit 1 — globals.css: Footer light theme (MISSED Stage 46)

```
File: apps/frontend/src/app/globals.css
Section: .pub-footer and all .pub-footer-* selectors

Fix:
.pub-footer {
  background: #ffffff;
  margin-top: auto;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
.pub-footer-logo-text { color: #1e1e1e; }
.pub-footer-logo-accent { color: #0D2344; } /* removed mint accent */
.pub-footer-desc { color: rgba(13, 35, 68, 0.55); }
.pub-footer-col-title {
  font-family: var(--font-gilroy);
  font-weight: 700;
  font-size: 1rem;
  color: #323232;
  text-transform: none; /* remove uppercase */
  letter-spacing: normal;
}
.pub-footer-link { color: #323232; }
.pub-footer-link:hover { color: #0D2344; }
.pub-footer-divider { border-top: 1px solid rgba(0, 0, 0, 0.1); }
.pub-footer-legal-link { color: rgba(0, 0, 0, 0.45); }
.pub-footer-legal-link:hover { color: rgba(0, 0, 0, 0.75); }
.pub-footer-copy { color: rgba(0, 0, 0, 0.4); }
.pub-footer-operator { color: rgba(0, 0, 0, 0.3); }
```

### Commit 2 — globals.css: Hero CTA + Main Events fixes

```
File: apps/frontend/src/app/globals.css

.pub-hero-btn {
  height: 47px;       /* was 42px */
  font-size: 1.0625rem; /* was 0.9375rem → 17px */
  border-radius: 5.98px; /* was 10px */
  width: 212px;        /* was auto */
  /* keep: bg, color, font-weight, shadow, padding */
}

.pub-main-events-outer {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3); /* was 0 4px 4px 0 rgba(0,0,0,0.25) */
  border: none; /* remove extra border not in Figma */
}

.pub-main-events-title {
  font-size: 26px; /* was 24px */
}

.pub-carousel-card {
  border-radius: 18.259px; /* was 16px */
}
```

### After Commit 2 — Manual Server Actions

```bash
# 1. Rebuild container
docker compose build frontend && docker compose up -d frontend

# 2. Seed events
cd apps/backend
STAGING_DESIGN_SEED=1 npx ts-node --project tsconfig.json prisma/seed-staging-design.ts

# 3. Seed quotes
STAGING_DESIGN_SEED=1 npx ts-node --project tsconfig.json prisma/seed-staging-quotes.ts
```

### Commit 3 — Confirm P3 items after rebuild + Figma node fetch

- M-01: Nav button border-radius — confirm from Figma
- M-02: EventCard title case — confirm from Figma
- M-03: EventCard gap — confirm from Figma
- Quotes background — confirm from Figma

---

## Summary: Defect Counts

| Priority | Count | Description |
|----------|-------|-------------|
| P1 | 11 | Footer: full CSS inversion (missed Stage 46) |
| P2 | 7 | Hero CTA (h/font/radius), Main Events (shadow/border/title/card-radius) |
| P3 | 4 | Nav radius, EventCard (case/gap), Quotes bg |
| DEPLOY | 3 | Logo (header+footer), hero-composition.png — rebuild required |
| DATA | 3 | Events, mainEvents, Quotes — seeds required |
| ACCEPTED | 1 | Calendar weekday color deviation |
| MATCH ✅ | 36 | All other properties |

**Minimum commits to ship: 2 code commits + 1 Docker rebuild + 2 seed runs.**
