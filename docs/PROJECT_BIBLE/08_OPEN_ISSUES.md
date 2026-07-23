# 08 — Open Issues

Only current unresolved issues belong here. Historical closed work belongs in `docs/CHANGELOG.md`, `MIGRATION_MAP.md` or archived reports.

| ID | Area | Issue | Required evidence to close | Status |
|---|---|---|---|---|
| `REL-001` | Release process | Design and release work requires staged verification against canonical documentation after every completed block | linked commit, successful build, staging verification, required screenshots and document comparison | OPEN |
| `UI-001` | Homepage | Current homepage has not passed the controlled 1920×1080 comparison against the approved Figma/PDF reference | reference/current screenshots with viewport, zoom and devicePixelRatio recorded; measurement table; owner approval | OPEN |
| `UI-002` | Filters, calendar and cards | The composition and all visual states require current canonical comparison and populated selected-day evidence | build, staging screenshot, state matrix, six-card demonstration data and `CALENDAR_COMPARISON.md` | PARTIAL |
| `ASSET-004` | Event imagery | Approved covers for six event cards and up to five carousel cards are registered but their complete runtime mapping and HTTP delivery are not currently proven | path, dimensions, SHA256, API mapping, HTTP 200 with image content type and visual comparison | PARTIAL |
| `UI-003` | Main Events | Five-card carousel implementation exists, but current geometry, populated data and interactions have not passed acceptance | production build, valid API data, desktop/mobile interaction test, keyboard/swipe test and approved-reference screenshots | PARTIAL |
| `UI-004` | Quotes | Approved person assets exist, but the complete quote composition has not passed current visual comparison with populated API data | populated staging state, desktop/mobile screenshots and approved-reference comparison | PARTIAL |
| `UI-005` | Footer | Approved stationery asset exists, but footer hierarchy, spacing, contacts, legal links and responsive layout have not passed current visual acceptance | desktop/mobile screenshots, link verification and approved-reference comparison | PARTIAL |
| `FUNC-001` | Event modal and reminders | Current participation, ticket fallback, Telegram/MAX reminder and close/focus behaviour require runtime verification on the assessed commit | build, staging interaction matrix and desktop/mobile evidence | PARTIAL |
| `DOC-001` | Historical documents | Historical stage/audit documents contain completion claims that may be read as current status | completed document inventory and deprecation/classification headers where required | OPEN |
| `DOC-002` | Asset naming | Several historical Figma frames and source archives use unclear names | canonical copies, source mapping and updated `MIGRATION_MAP.md` | OPEN |

## Resolved or superseded items

The following former blockers are no longer current open issues and must not be reintroduced without new evidence:

- the historical unpushed-server-commit blocker tied to commit `3f8ecdb`;
- the former requirement for five missing event-modal PNG icons, because the active modal implementation uses current approved/local imagery and inline interface icons instead of those obsolete paths;
- closed quote and footer asset-discovery tasks already recorded in the Asset Registry;
- the duplicate PROJECT_BIBLE numeric identifier: the release checklist is now `09B_RELEASE_ACCEPTANCE_CHECKLIST.md`, and the rename is recorded in `MIGRATION_MAP.md`.

## Closure rule

An issue is closed only after the required evidence exists and current staging is verified. A commit or successful build alone is not closure evidence.