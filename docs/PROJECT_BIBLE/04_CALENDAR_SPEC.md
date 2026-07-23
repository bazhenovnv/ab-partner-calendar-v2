# 04 — Calendar Specification

## Scope
Canonical specification for the public filters, monthly calendar, selected date heading and selected-day event cards.

## Sources
- Primary: approved Figma calendar block.
- Secondary: approved desktop homepage PDF.
- Business rules: `docs/BUSINESS_RULES.md` BR-004–BR-009, BR-019, BR-020.
- Active components: listed in `03_HOMEPAGE_STRUCTURE.md`.

## Desktop composition
The filters and calendar are placed side by side inside one white outer events panel. Selected-day events follow below inside the same composition.

Previously confirmed Figma values must be treated as working reference until re-measured:
- Outer content width: approximately `1497px` at 1920 viewport.
- Filter card: approximately `588×632px`.
- Calendar card: approximately `760.866×631.824px`.
- Gap between filter and calendar: approximately `41.36px`.
- Outer side padding: approximately `54px`.
- Outer top padding: approximately `40px`.
- Filter/calendar radius: approximately `40.23px`.
- Calendar horizontal padding: approximately `41.1px` left and `26.8px` right.

These values must be verified against the approved reference before being called final.

## Filter card
Must include:
- title `Фильтр мероприятий`;
- Region/City dropdown;
- Direction dropdown;
- Format: Online/Offline;
- Status with approved status dots;
- Price: Free/Paid;
- primary Apply button;
- visible Reset filter action;
- approved two-column internal structure and divider.

Do not remove functional fields supported by the backend. Dropdown chevron follows BR-020.

## Calendar header
- Always show month and year, e.g. `Май 2026` (BR-019).
- Previous/next controls use approved chevrons.
- No decorative replacement arrows.

## Calendar grid
- Seven equal columns.
- Full table-like grid with consistent borders.
- Weekday header row.
- Previous/next month dates shown as muted values.
- Weekend columns use approved mint tint.
- No `aspect-square`, `justify-between`, arbitrary spacing, scale or zoom to imitate geometry.

## Date states

| State | Required behaviour |
|---|---|
| `NORMAL` | standard dark text on approved base cell |
| `OTHER_MONTH` | muted text |
| `WEEKEND` | mint-tinted column/cell background |
| `TODAY` | distinct approved current-day treatment |
| `SELECTED` | approved mint-filled selection |
| `PLANNED_EVENT` | approved top-right marker/status colour |
| `LIVE_EVENT` | approved top-right marker/status colour |
| `COMPLETED_EVENT` | approved grey state/marker |

Event markers are top-right corner triangles, not bottom dots.

## Legend
Must show the approved status legend and use the same colours/terminology as date markers. Use `Завершено`, never `Проведено`.

## Selected-day events
- Heading format: `События на 06 июня 2026` for the approved demonstration date.
- Desktop grid: 3 columns × 2 rows, six cards.
- Card data comes from API/staging seed, not hardcoded UI.
- Each published event must satisfy BR-004; missing image blocks publication under BR-005.
- No `АБ` placeholder or gradient may be considered final.
- Titles preserve approved case; do not force uppercase unless the approved source explicitly does.

## Data for staging demo
Use `apps/backend/prisma/seed-staging-design.ts`.
- Six `PUBLISHED` events.
- Five `mainEvent=true` events where required for the carousel.
- Demonstration dates/statuses must make calendar markers and six selected-day cards visible.
- Only approved local image assets may be assigned.

## Responsive
- Desktop is not implemented through scale/zoom.
- Tablet/mobile stack filter and calendar vertically where needed.
- No horizontal overflow.
- Cards reduce to responsive columns without shrinking the desktop design proportionally.

## Visual QA
Required at 1920×1080, browser zoom 100%:
- reference screenshot;
- current screenshot;
- comparison table with element, reference, current, delta, status.

Target tolerances:
- major panels: ±2px;
- typography: ±1px where technically possible;
- exact approved colours.

Do not use `pixel-perfect`, `approved`, `complete` or `final` without current comparison evidence.