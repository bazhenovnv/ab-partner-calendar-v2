# CURRENT_DESIGN_AUDIT — Stage 52

**Date:** 2026-07-12  
**Branch:** `claude/ab-afisha-architecture-plan-805f5o`  
**HEAD:** `9b5e11c`  
**Viewport:** 1920×1080, browser zoom 100%  
**Backend:** Not running (Docker unavailable). All data-dependent blocks show empty/fallback state.

## Active component map

| Block | Component path | Imported by | Renders |
|---|---|---|---|
| Shell | `components/layout/PublicShell.tsx` | `app/page.tsx` | Yes |
| Header | `components/layout/SiteHeader.tsx` | `PublicShell` | Yes |
| Hero | `components/HeroSection.tsx` | `app/page.tsx` | Yes |
| Events outer | `components/events/EventsSection.tsx` | `app/page.tsx` | Yes |
| Filters | `components/events/EventFilters.tsx` | `EventsSection` | Yes |
| Calendar | `components/events/EventCalendar.tsx` | `EventsSection` | Yes |
| CalendarHeader | `components/ui/CalendarHeader.tsx` | `EventCalendar` | Yes |
| EventCard | `components/events/EventCard.tsx` | `EventsSection` | Conditional (no data) |
| MainEventsBanner | `components/events/MainEventsBanner.tsx` | `app/page.tsx` | No — `main.length === 0` |
| Quotes | `components/RotatingQuotesBlock.tsx` | `app/page.tsx` | No — `qs.length === 0` |
| Footer | `components/layout/SiteFooter.tsx` | `PublicShell` | Yes |

No dead/duplicate components found in the active render path.

## Design audit table

| BLOCK | ELEMENT | APPROVED SOURCE | REFERENCE VALUE | CURRENT VALUE | DELTA | SOURCE FILE | ACTIVE COMPONENT | ACTION REQUIRED | PRIORITY |
|---|---|---|---|---|---|---|---|---|---|
| Header | Non-sticky | ADR / design spec | Header scrolls with page | `<header class="bg-white">` — no `sticky` | ✅ Match | `SiteHeader.tsx` | SiteHeader | None | — |
| Header | Logo | `05_ASSET_REGISTRY.md` ASSET-LOGO-AB | Binary PNG from Frame 60.png | `public/ab-logo-mark-cropped.png` — binary PNG confirmed | ✅ | `SiteHeader.tsx` | SiteHeader | None | — |
| Header | Logo dimensions | Figma 5893:346 | 62×67px | `width=62 height=67 style={{height:'67px'}}` | ✅ | `SiteHeader.tsx` | SiteHeader | None | — |
| Header | Text | Design spec | "Афиша Бухгалтера" | "Афиша Бухгалтера" | ✅ | `SiteHeader.tsx` | SiteHeader | None | — |
| Header | Nav height | Figma | 80px (h-20) | h-20 = 80px | ✅ | `SiteHeader.tsx` | SiteHeader | None | — |
| Header | Max-width | Figma | 1496px | `max-w-[1496px]` | ✅ | `SiteHeader.tsx` | SiteHeader | None | — |
| Hero | CTA text | Canonical | "Важные события →" | "Важные события →" | ✅ | `HeroSection.tsx` | HeroSection | None | — |
| Hero | Hero image | ASSET-HERO | `/hero-composition.png` | `/hero-composition.png` | ✅ | `HeroSection.tsx` | HeroSection | Verify binary validity | P2 |
| Hero | Panel width | Figma | ~1496px centered | `.pub-hero-panel max-width:1496px` | ✅ | `globals.css` | HeroSection | None | — |
| Hero | Button dimensions | Figma | 212×47px | `width:212px height:47px` in CSS | ✅ | `globals.css` | HeroSection | None | — |
| Page canvas | Background | Design | Light grey #f1f1f1 | `bg-[#f1f1f1]` on PublicShell | ✅ | `PublicShell.tsx` | PublicShell | None | — |
| Page canvas | Scale/zoom | Design restrictions | No transform:scale, no zoom | No scale/zoom found in active CSS | ✅ | multiple | — | None | — |
| Outer events panel | Width | Figma 5913:4752 | 1497px | `max-width:1497px` | ✅ | `globals.css` | EventsSection | None | — |
| Outer events panel | Radius | Figma | 35.604px | `border-radius:35.604px` | ✅ | `globals.css` | EventsSection | None | — |
| Outer events panel | Shadow | Figma | 0 0 9.129px rgba(0,0,0,0.3) | `box-shadow:0 0 9.129px rgba(0,0,0,0.3)` | ✅ | `globals.css` | EventsSection | None | — |
| Filter card | Width | Figma 5913:4888 | 588px | `width:588px` | ✅ | `globals.css` | EventFilters | None | — |
| Filter card | Height | Figma | 632px | `height:632px` | ✅ | `globals.css` | EventFilters | None | — |
| Filter card | Overflow | Layout | Should not clip Apply button | `overflow:hidden` clips Apply button below fold at 1080px viewport | ⚠️ layout | `globals.css` | EventFilters | Button reaches y=1035–1083, partially behind cookie banner. Scroll reveals it. Low priority at desktop. | P3 |
| Filter card | Apply button | Spec | Always visible | Visible on scroll; hidden if cookie banner active | ⚠️ | `globals.css` | EventFilters | Consider reducing padding to ensure visible | P2 |
| Filter card | Reset link | Spec | Always visible | Conditionally rendered (`hasFilters &&`) — hidden when no filter active | ⚠️ | `EventFilters.tsx` | EventFilters | Show Reset always (greyed when no filters) | P2 |
| Calendar | Previous-month dates | `04_CALENDAR_SPEC.md` | Muted dates shown in first row (e.g. Jun 29, 30 for July 2026) | Empty cells rendered — no prev-month dates | ❌ missing | `EventCalendar.tsx` | EventCalendar | Add prev-month date rendering | P1 |
| Calendar | Weekend tint | `04_CALENDAR_SPEC.md` | Approved mint tint on Сб/Вс columns | `bg-primary/[0.025]` ≈ nearly invisible | ❌ wrong | `EventCalendar.tsx` | EventCalendar | Use visible mint tint ~rgba(124,216,179,0.12) | P1 |
| Calendar | Selected state | Figma audit G-11 | `bg-selected-day text-white` (#367D67) | `bg-mint text-black` (#7CD8B3) — wrong color | ⚠️ delta | `EventCalendar.tsx` | EventCalendar | Change to bg-selected-day text-white | P1 |
| Calendar | Today state | Figma audit G-12 | `bg-primary/10 text-primary` | `bg-primary/10 text-primary` | ✅ | `EventCalendar.tsx` | EventCalendar | None | — |
| Calendar | Event markers | `04_CALENDAR_SPEC.md` | Top-right corner triangles | CSS border trick implemented | ✅ (no data) | `EventCalendar.tsx` | EventCalendar | None (needs data to verify) | — |
| Calendar | Legend | Spec | "Запланировано / Идёт сейчас / Завершено" | "Запланировано / Идёт сейчас / Завершено" | ✅ | `EventCalendar.tsx` | EventCalendar | None | — |
| Calendar | Month header | BR-019 | Month + year always shown | "Июль 2026" rendered | ✅ | `CalendarHeader.tsx` | CalendarHeader | None | — |
| Events date heading | Format | Spec | "События на DD месяца YYYY" | Renders when date selected and events exist | ✅ (conditional) | `EventsSection.tsx` | EventsSection | None | — |
| Event cards | Images | BR-005 / ASSET-004 | Approved covers | No backend — shows empty state | MISSING_APPROVED_ASSET | backend/seed | EventCard | Register approved covers in ASSET_REGISTRY | P0 |
| Main Events carousel | Renders | page.tsx | Shows when `main.length > 0` | Not rendering — backend offline | OPEN UI-003 | `page.tsx` | MainEventsBanner | Needs backend + ASSET-004 | P0 |
| Quotes | Renders | page.tsx | Shows when `qs.length > 0` | Not rendering — backend offline | OPEN UI-004 | `page.tsx` | RotatingQuotesBlock | BLOCKED_BY_ASSET (ASSET-001, ASSET-002) | P0 |
| Footer | Columns | Design | Brand + Projects + Contacts | 3-column layout: brand/projects/contacts | ✅ structure | `SiteFooter.tsx` | SiteFooter | None (structure) | — |
| Footer | Stationery composition | ASSET-003 | Notebook/pen/plant/cup image | MISSING — was removed in Stage 51 | MISSING_APPROVED_ASSET | `SiteFooter.tsx` | SiteFooter | Register approved asset when source identified | P0 |
| Footer | Email | BR-014 | info-event@a-b.ru | `info-event@a-b.ru` via `NEXT_PUBLIC_CONTACT_EMAIL` | ✅ | `SiteFooter.tsx` | SiteFooter | None | — |
| Footer | Legal links | BR-027 | 5 legal links | Rendered from `LEGAL_LINKS` | ✅ | `SiteFooter.tsx` | SiteFooter | Verify all 5 links present | P2 |
| Cookie banner | Renders | ADR-006 | Informational, shows once | Banner visible at bottom | ✅ | CookieBanner | — | None | — |

## Summary

### P0 — Missing/broken
- `ASSET-001`, `ASSET-002`: Approved quotes person illustrations missing.
- `ASSET-003`: Approved footer stationery composition missing.
- `ASSET-004`: Approved event card/carousel cover images not mapped.
- `UI-003`: MainEventsBanner not rendering (backend required + assets).
- `UI-004`: Quotes block not rendering (backend required + assets).

### P1 — Wrong geometry/visual state
- Calendar: empty cells need previous-month dates.
- Calendar: weekend tint nearly invisible.
- Calendar: selected-day uses wrong color (`bg-mint` vs `bg-selected-day`).

### P2 — Spacing/typography/minor
- Filter Apply button partially below viewport at 1080px (layout correct; cookie banner overlap).
- Reset filter link only appears when filters are active; spec requires always-visible.
- Hero image binary validation pending.

### Not fixable this session
All MISSING_APPROVED_ASSET items. Custom SVG creation is forbidden.

## Active component map (confirmed)

```
app/page.tsx
  PublicShell
    SiteHeader             ← /components/layout/SiteHeader.tsx
    main
      HeroSection          ← /components/HeroSection.tsx
      EventsSection        ← /components/events/EventsSection.tsx
        EventFilters       ← /components/events/EventFilters.tsx
        EventCalendar      ← /components/events/EventCalendar.tsx
          CalendarHeader   ← /components/ui/CalendarHeader.tsx
        EventCard          ← /components/events/EventCard.tsx  (conditional)
      MainEventsBanner     ← /components/events/MainEventsBanner.tsx  (hidden: no data)
      RotatingQuotesBlock  ← /components/RotatingQuotesBlock.tsx  (hidden: no data)
    SiteFooter             ← /components/layout/SiteFooter.tsx
```
