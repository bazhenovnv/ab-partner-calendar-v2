# 08 — Open Issues

Only current unresolved issues belong here. Historical closed work belongs in CHANGELOG or archived reports.

| ID | Area | Issue | Required evidence to close | Status |
|---|---|---|---|---|
| `REL-001` | Release process | Monday delivery requires staged verification against canonical documentation after every completed work block | Completed stage checklist, linked commits, build result, staging screenshots and document comparison | OPEN |
| `GIT-001` | Repository sync | Server contains local commit `3f8ecdb` on `codex/events-modal-carousel`, but push failed because HTTPS authentication was not configured | Commit visible in GitHub branch and server HEAD matches remote HEAD | OPEN |
| `UI-001` | Page scale | Current staging proportions do not yet match the approved desktop reference | 1920px side-by-side measurement and screenshot comparison | OPEN |
| `UI-002` | Calendar | Filters/calendar/event-card composition requires canonical comparison against approved reference | `CALENDAR_COMPARISON.md`, build and staging screenshot | PARTIAL — Stage 52 fixed: prev-month dates, weekend tint (bg-mint/10), selected-day color (bg-selected-day text-white). Full staging comparison pending. |
| `ASSET-001` | Quotes | Approved left person illustration is not registered as a usable local asset | approved binary source/path/dimensions | CLOSED — Stage 52: found in `Креативы АБ (8).zip` (Desktop/1024/96144cad... (18) 1.png), 181×217px RGBA PNG, copied to `public/quote-person-left.png`, registered in `05_ASSET_REGISTRY.md`, deployed in RotatingQuotesBlock. |
| `ASSET-002` | Quotes | Approved right person illustration is not registered as a usable local asset | approved binary source/path/dimensions | CLOSED — Stage 52: found in `Креативы АБ (9).zip` (Desktop/1024/96144cad... (13) 2.png), 172×215px RGBA PNG, copied to `public/quote-person-right.png`, registered in `05_ASSET_REGISTRY.md`, deployed in RotatingQuotesBlock. |
| `ASSET-003` | Footer | Approved notebook/pen/plant/cup composition is not registered as a usable local asset | approved binary source/path/dimensions | CLOSED — Stage 52: `notebook_mint_transparent 1.png` found in `Креативы АБ (19).zip`, copied to `public/notebook-stationery.png`, registered in `05_ASSET_REGISTRY.md`, deployed in SiteFooter. |
| `ASSET-004` | Events | Approved event covers for six staging cards and five carousel cards are not fully mapped and validated | approved asset paths, dimensions/SHA256, API mapping and successful HTTP checks | MISSING_APPROVED_ASSET — carousel now rejects generic fallback images and requires `mainEventUrl`; approved binaries and runtime mapping still require verification. |
| `ASSET-005` | Event modal | Runtime references five absent approved UI icons: `event-calendar.png`, `event-clock.png`, `event-price.png`, `event-action-participate.png`, `event-action-remind.png`; staging returns HTML instead of PNG | Approved binary source, registry entries, local paths, dimensions/SHA256, successful HTTP 200 `image/png`, visual comparison | MISSING_APPROVED_ASSET |
| `UI-003` | Main Events | Premium five-card 3D fan implementation is committed; runtime and visual compliance are not yet proven | Production build, API data with dedicated `mainEventUrl`, desktop/mobile interaction test, 1920px Figma/PDF comparison and staging screenshots | PARTIAL — dedicated-cover-only contract, mirrored 3D geometry, per-event navigation, keyboard, swipe, focus and reduced-motion behaviour implemented. Build/deploy/visual QA pending. |
| `UI-004` | Quotes | Layout must match approved people + quote-card composition | approved assets and visual comparison | PARTIAL — Stage 52: person assets found and deployed; quotes section needs backend data to render (qs.length > 0). Full visual comparison pending. |
| `UI-005` | Footer | Footer must match approved light layout and stationery composition | approved asset and visual comparison | PARTIAL — Stage 52: stationery image added to footer right column. Full staging comparison pending. |
| `FUNC-001` | Event modal | Participation URL priority, button label and Telegram fallback were corrected only in an unpushed server commit | Remote commit, production build, staging interaction test for event URL, ticket fallback, Telegram and MAX | PARTIAL |
| `DOC-001` | Historical reports | Numerous Stage/audit files contain outdated completion claims | classification/deprecation headers after full inventory | OPEN |
| `DOC-002` | Asset naming | Figma screenshots and frames use unclear names | binary-safe canonical copies and migration map | OPEN |

## Closure rule

An issue is closed only after the required evidence exists and current staging is verified. A commit message or successful build alone is not closure evidence.
