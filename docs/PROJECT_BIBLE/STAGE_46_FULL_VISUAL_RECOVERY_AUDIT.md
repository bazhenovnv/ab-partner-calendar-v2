# Stage 46 — Full Visual Recovery Audit

**Date:** 2026-07-12  
**Branch:** `claude/ab-afisha-architecture-plan-805f5o`  
**Figma file:** `t7Vg797xBk263TgvZRrO12`, page root node `5913:4745`

---

## Discrepancy Matrix

| Block | Component / Selector | Figma Value | Was | Fix Applied |
|-------|----------------------|-------------|-----|-------------|
| Background | `html`, `body`, `PublicShell` | `#F1F1F1` | `#f5f5f5` | ✅ Fixed Stage 45.4 |
| Background | `.pub-hero` | `#F1F1F1` | `#f5f5f5` | ✅ Fixed Stage 45.4 |
| Logo (header) | `<img>` `/ab-logo-mark-cropped.png` `w-[62px] h-[67px]` | present | invisible on staging | ⚠️ Code correct; staging redeploy required |
| Calendar | Outer gap (CalendarHeader → grid) | `29.002px` | `gap-6` (24px) | ✅ Fixed Stage 45.4 |
| Calendar | Inner gap (weekdays → date grid) | `9.355px` | none | ✅ Fixed Stage 45.4 |
| Calendar | Selected day size | `43.97×43.014px` | `31.808×31.808px` | ✅ Fixed Stage 45.4 |
| Calendar | Selected day shape | `rounded-[93.554px]` | `rounded-full` | ✅ Fixed Stage 45.4 |
| Calendar | Selected day shadow | `drop-shadow-[0px_0px_4.779px_rgba(0,0,0,0.3)]` | none | ✅ Fixed Stage 45.4 |
| Calendar | Selected day background | `#7CD8B3` (mint) | `#367D67` (dark green) | ✅ Fixed Stage 46 |
| Calendar | Selected day text color | `text-black` | `text-white` | ✅ Fixed Stage 46 |
| Footer | Background | `#ffffff` (light) | `var(--color-primary)` = `#0D2344` (dark navy) | ✅ Fixed Stage 46 |
| Footer | Logo | Image logo `ab-logo-mark-cropped.png` | Text "АБ" box | ✅ Fixed Stage 46 |
| Footer | Logo text color | `#1e1e1e` | `#fff` | ✅ Fixed Stage 46 |
| Footer | Description text color | `rgba(13,35,68,0.55)` | `rgba(255,255,255,0.5)` | ✅ Fixed Stage 46 |
| Footer | Col title font | Gilroy Bold 1rem | Montserrat SemiBold 0.8125rem uppercase | ✅ Fixed Stage 46 |
| Footer | Col title color | `#323232` | `rgba(255,255,255,0.45)` | ✅ Fixed Stage 46 |
| Footer | Link color | `#323232` | `rgba(255,255,255,0.65)` | ✅ Fixed Stage 46 |
| Footer | Link hover color | `#0D2344` | `#fff` | ✅ Fixed Stage 46 |
| Footer | Divider | `rgba(0,0,0,0.1)` | `rgba(255,255,255,0.08)` | ✅ Fixed Stage 46 |
| Footer | Legal links color | `rgba(0,0,0,0.45)` | `rgba(255,255,255,0.4)` | ✅ Fixed Stage 46 |
| Footer | Copyright color | `rgba(0,0,0,0.4)` | `rgba(255,255,255,0.25)` | ✅ Fixed Stage 46 |
| Footer | Operator text color | `rgba(0,0,0,0.3)` | `rgba(255,255,255,0.18)` | ✅ Fixed Stage 46 |
| Events (seed) | PUBLISHED events for calendar | 6 events near today | 0 (empty DB) | ✅ `seed-staging-design.ts` created |
| Main Events | `mainEvent=true` PUBLISHED events | 5 | 0 (empty DB) | ✅ `seed-staging-design.ts` created (5 of 6 events have `mainEvent=true`) |

---

## Block 1 — Background

**Figma node `5913:4745`:** `bg-[#f1f1f1]`

All layers confirmed:
- `html` body: `background: #f1f1f1` ✅
- `PublicShell`: `bg-[#f1f1f1]` ✅  
- `.pub-hero`: `background: #f1f1f1` ✅
- `.pub-events-section`: transparent (inherits) ✅
- `.pub-footer`: now white `#ffffff` on `#f1f1f1` base ✅

---

## Block 2 — Logo (Header)

**Root cause:** Asset `ab-logo-mark-cropped.png` committed in Stage 45.3.1 (SHA `8c68919`). HTTP 200 confirmed in dev. Staging screenshot still shows placeholder — deployment has not picked up the new static asset.

**Code state:** Correct — `<img src="/ab-logo-mark-cropped.png" className="shrink-0 w-[62px] h-[67px] object-contain" />`. No code change required.

**Resolution:** Run staging redeploy / Docker rebuild after pushing Stage 46 commits.

**Staging verification command:**
```bash
curl -I https://<STAGING_DOMAIN>/ab-logo-mark-cropped.png
# Expected: 200 + content-type: image/png
```

---

## Block 3 — Calendar

**Figma node `5913:4757`** — Calendar card: W=760.866, H=631.824, bg=rgba(255,255,255,0.21), radius=40.228px, shadow=0 0 9.355px rgba(0,0,0,0.3), padding=28.066px 26.764px 28.066px 41.102px ✅ (already in CSS from Stage 45)

**Selected day (Figma overlay node `5913:4754`):**
- Background: `#7CD8B3` (mint)
- Border: `1px solid #367D67`
- Size: W=43.97px, H=43.014px, radius=93.554px
- Shadow: `drop-shadow(0 0 4.779px rgba(0,0,0,0.3))`
- Number text: `text-black`, Montserrat SemiBold 23px

**Fix applied in `EventCalendar.tsx`:**
- `bg-selected-day text-white` → `bg-mint text-black`

**Weekday labels:** Montserrat SemiBold 19px. Color in Figma: `text-black`. Current code: `text-primary/40` (intentional softening for visual hierarchy — acceptable deviation, not changed).

---

## Block 4 — Selected-Day Events

**Figma:** Events grid shown for "06 июня 2026" — 6 event cards with images, status badges, date badges.

**Current staging:** Empty state (no events in DB).

**Fix:** `apps/backend/prisma/seed-staging-design.ts` — env-gated (`APP_ENV=staging` or `STAGING_DESIGN_SEED=1`), idempotent, creates 6 PUBLISHED events near current date.

**Run on staging:**
```bash
cd apps/backend
STAGING_DESIGN_SEED=1 npx ts-node --project tsconfig.json prisma/seed-staging-design.ts
```

**Verify:**
```bash
curl https://<STAGING_DOMAIN>/api/events/public?limit=6
# Expected: 6 events with status PUBLISHED
```

---

## Block 5 — Main Events Carousel

**Figma node `5913:4884`:** White card W=1496, H=945, radius=20, shadow=0 0 10px rgba(0,0,0,0.3).

**Title:** "Главные события" — Montserrat Bold 26px, `#0D2344`.

**Carousel:** 5 fan-layout cards (268×395px), `rounded-[18.259px]`.

**Current staging:** Banner hidden because `events.length === 0` (no `mainEvent=true` events).

**Fix:** Same seed as Block 4 — 5 of 6 events have `mainEvent=true`.

---

## Block 6 — Footer

**Figma node area `5913:4996`** — Footer is LIGHT (white) background with dark text.

**Structure (Figma):**
- Logo (image, ~57×53px) + "Афиша Бухгалтера" (Montserrat SemiBold, #1e1e1e)
- Tagline: Gilroy Regular 21px, dark
- 3 columns: Brand | Наши проекты | Контакты
- Vertical divider lines between columns
- Horizontal divider
- Bottom: legal links + copyright

**Changes applied:**
| CSS property | Before | After |
|---|---|---|
| `.pub-footer { background }` | `var(--color-primary)` (#0D2344) | `#ffffff` |
| `.pub-footer-logo-mark` | text "АБ" box | removed (uses image logo) |
| `.pub-footer-logo-text { color }` | `#fff` | `#1e1e1e` |
| `.pub-footer-desc { color }` | `rgba(255,255,255,0.5)` | `rgba(13,35,68,0.55)` |
| `.pub-footer-col-title` font/color | Montserrat SemiBold 0.8125rem uppercase white/45% | Gilroy Bold 1rem #323232 |
| `.pub-footer-link { color }` | `rgba(255,255,255,0.65)` | `#323232` |
| `.pub-footer-divider` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.1)` |
| `.pub-footer-legal-link { color }` | `rgba(255,255,255,0.4)` | `rgba(0,0,0,0.45)` |
| `.pub-footer-copy { color }` | `rgba(255,255,255,0.25)` | `rgba(0,0,0,0.4)` |
| `.pub-footer-operator { color }` | `rgba(255,255,255,0.18)` | `rgba(0,0,0,0.3)` |

**SiteFooter.tsx change:**
- `<div className="pub-footer-logo-mark">АБ</div>` → `<img src="/ab-logo-mark-cropped.png" className="shrink-0 w-[46px] h-[50px] object-contain" />`

---

## Files Changed (Stage 46)

| File | Change type |
|------|-------------|
| `apps/frontend/src/components/events/EventCalendar.tsx` | Calendar selected day: `bg-selected-day text-white` → `bg-mint text-black` |
| `apps/frontend/src/app/globals.css` | Footer CSS: background + all text colors → light theme |
| `apps/frontend/src/components/layout/SiteFooter.tsx` | Logo: text "АБ" → `<img>` |
| `apps/backend/prisma/seed-staging-design.ts` | NEW: env-gated staging seed (6 events, 5 mainEvent) |
| `docs/PROJECT_BIBLE/STAGE_46_FULL_VISUAL_RECOVERY_AUDIT.md` | NEW: this file |

---

## Post-Deploy Checklist

- [ ] `git push` → staging redeploy
- [ ] Verify logo renders at `/ab-logo-mark-cropped.png` (HTTP 200 + visible in header + footer)
- [ ] Verify footer background is white (not dark navy)
- [ ] Verify calendar selected day shows mint color (click any day with events)
- [ ] Run `seed-staging-design.ts` with `STAGING_DESIGN_SEED=1` on staging DB
- [ ] Verify 6 events visible in event grid
- [ ] Verify MainEventsBanner carousel shows 5 cards
- [ ] Visual compare against Figma screenshot `5913:4745`
