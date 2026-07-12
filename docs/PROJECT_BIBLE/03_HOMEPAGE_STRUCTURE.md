# 03 — Homepage Structure

## Canonical order
1. Header.
2. Hero.
3. Filters + Calendar.
4. Selected-day events.
5. Main Events carousel.
6. Quotes composition.
7. Footer.
8. Legal/copyright area.
9. Cookie banner.

## Block map

### Header
- Active component: `apps/frontend/src/components/layout/SiteHeader.tsx`.
- Visual source: top section of approved desktop homepage.
- Text source: canonical project wording and current runtime links.
- Asset source: approved logo in `05_ASSET_REGISTRY.md`.
- Restrictions: non-sticky; no self-drawn logo or icons.

### Hero
- Active component: `apps/frontend/src/components/HeroSection.tsx`.
- Visual source: approved Hero panel in Figma/PDF.
- Canonical CTA: `Важные события →`.
- Restrictions: do not replace the approved image; transition must be CSS-based and must not cover important image content.

### Filters + Calendar + selected-day events
- Components:
  - `apps/frontend/src/components/events/EventFilters.tsx`
  - `apps/frontend/src/components/events/CalendarHeader.tsx`
  - `apps/frontend/src/components/events/EventCalendar.tsx`
  - `apps/frontend/src/components/events/EventsSection.tsx`
  - `apps/frontend/src/components/events/EventCard.tsx`
- Detailed source: `04_CALENDAR_SPEC.md`.
- Business rules: `../BUSINESS_RULES.md`, especially BR-004–BR-009, BR-019 and BR-020.

### Main Events
- Active component: `apps/frontend/src/components/events/MainEventsBanner.tsx`.
- Section title: `Главные события`.
- Data source: public main-events API; events with `mainEvent=true`.
- Visual source: approved five-card fan carousel.
- Restrictions: no gradient placeholders as final output; no invented covers.

### Quotes
- Active component: `apps/frontend/src/components/RotatingQuotesBlock.tsx`.
- Data source: public Quotes API/database.
- Visual source: approved composition with specific left/right illustrations.
- Restrictions: no books, caps, generic SVG people or self-created decorative replacements.

### Footer
- Active component: `apps/frontend/src/components/layout/SiteFooter.tsx`.
- Visual source: approved light footer with brand, projects, contacts, dividers, stationery composition and legal block.
- Runtime content source: `01_PROJECT_OVERVIEW.md`, business/legal requirements.
- Restrictions: never copy obsolete contact data from an old screenshot over canonical runtime data.

## Acceptance
Each block is accepted only after:
- active import chain confirmed;
- assets registered;
- build passes;
- current 1920px screenshot compared to reference;
- discrepancies recorded in `08_OPEN_ISSUES.md`.