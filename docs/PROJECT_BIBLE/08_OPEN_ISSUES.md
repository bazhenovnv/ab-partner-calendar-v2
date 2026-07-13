# 08 — Open Issues

Only current unresolved issues belong here. Historical closed work belongs in CHANGELOG or archived reports.

| ID | Area | Issue | Required evidence to close | Status |
|---|---|---|---|---|
| `UI-001` | Page scale | Current staging proportions do not yet match the approved desktop reference | 1920px side-by-side measurement and screenshot comparison | OPEN |
| `UI-002` | Calendar | Filters/calendar/event-card composition requires canonical comparison against approved reference | `CALENDAR_COMPARISON.md`, build and staging screenshot | PARTIAL — Stage 52 fixed: prev-month dates, weekend tint (bg-mint/10), selected-day color (bg-selected-day text-white). Full staging comparison pending. |
| `ASSET-001` | Quotes | Approved left person illustration is not registered as a usable local asset | approved binary source/path/dimensions | MISSING_APPROVED_ASSET |
| `ASSET-002` | Quotes | Approved right person illustration is not registered as a usable local asset | approved binary source/path/dimensions | MISSING_APPROVED_ASSET |
| `ASSET-003` | Footer | Approved notebook/pen/plant/cup composition is not registered as a usable local asset | approved binary source/path/dimensions | CLOSED — Stage 52: `notebook_mint_transparent 1.png` found in `Креативы АБ (19).zip`, copied to `public/notebook-stationery.png`, registered in `05_ASSET_REGISTRY.md`, deployed in SiteFooter. |
| `ASSET-004` | Events | Approved event covers for six staging cards and five carousel cards are not mapped | approved asset paths and successful HTTP checks | MISSING_APPROVED_ASSET |
| `UI-003` | Main Events | Current implementation must be verified as a functional five-card fan carousel, not static/gradient placeholders | API data, interaction test and visual comparison | OPEN |
| `UI-004` | Quotes | Layout must match approved people + quote-card composition | approved assets and visual comparison | BLOCKED_BY_ASSET |
| `UI-005` | Footer | Footer must match approved light layout and stationery composition | approved asset and visual comparison | PARTIAL — Stage 52: stationery image added to footer right column. Full staging comparison pending. |
| `DOC-001` | Historical reports | Numerous Stage/audit files contain outdated completion claims | classification/deprecation headers after full inventory | OPEN |
| `DOC-002` | Asset naming | Figma screenshots and frames use unclear names | binary-safe canonical copies and migration map | OPEN |

## Closure rule
An issue is closed only after the required evidence exists and current staging is verified. A commit message or successful build alone is not closure evidence.