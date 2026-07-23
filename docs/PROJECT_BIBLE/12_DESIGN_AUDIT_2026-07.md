# 12 — Homepage Design Audit — 2026-07

## Status

**Audit baseline created:** 2026-07-23  
**Scope:** current public homepage desktop screenshot supplied by the project owner, current `main` implementation and canonical repository documentation.  
**Design acceptance:** **REJECTED — remediation required before the homepage can be called design-conformant.**

This rejection concerns visual conformance and acceptance evidence. It does not assert that the public product is functionally unusable.

## Audit authority

The audit follows `00_SOURCE_OF_TRUTH.md`:

1. approved Figma;
2. approved homepage PDF/reference screenshots;
3. canonical PROJECT_BIBLE documents;
4. business rules and ADR;
5. current code;
6. historical stage/release reports.

Historical claims such as `97%`, `COMPLETE`, `FINAL` or `pixel-perfect` are not current proof. Current acceptance requires measured geometry, current code paths, build results and current staging screenshots.

## Materials reviewed

### Canonical documentation

- `00_SOURCE_OF_TRUTH.md`;
- `02_DESIGN_SYSTEM.md`;
- `03_HOMEPAGE_STRUCTURE.md`;
- `04_CALENDAR_SPEC.md`;
- `05_ASSET_REGISTRY.md`;
- `08_OPEN_ISSUES.md`;
- `09_PAGE_CANVAS_AND_SCALE.md`;
- `09_RELEASE_ACCEPTANCE_CHECKLIST.md`;
- `10_MAIN_EVENTS_CAROUSEL_SPEC.md`;
- `11_DESIGN_PHASE_WORKFLOW.md`;
- `docs/BUSINESS_RULES.md`;
- `docs/ADR.md`;
- relevant implementation history and current homepage component chain.

### Current implementation chain

- `apps/frontend/src/app/page.tsx`;
- `apps/frontend/src/components/layout/PublicShell.tsx`;
- `apps/frontend/src/components/layout/SiteHeader.tsx`;
- `apps/frontend/src/components/HeroSection.tsx`;
- `apps/frontend/src/components/events/EventsSection.tsx`;
- `apps/frontend/src/components/events/EventFilters.tsx`;
- `apps/frontend/src/components/events/EventCalendar.tsx`;
- `apps/frontend/src/components/events/EventCard.tsx`;
- `apps/frontend/src/components/events/MainEventsBanner.tsx`;
- `apps/frontend/src/components/RotatingQuotesBlock.tsx`;
- `apps/frontend/src/components/layout/SiteFooter.tsx`;
- current homepage CSS and CSS modules imported by those components.

### Visual evidence

- supplied full-page desktop screenshot: PNG, `1561 × 2047` physical pixels;
- approved Figma/PDF references identified in the Asset Registry.

## Important measurement limitation

The supplied screenshot is not a certified `1920 × 1080 CSS px`, browser zoom `100%`, devicePixelRatio `1` capture. Therefore:

- it is valid for composition, hierarchy, relative balance, visible states, contrast and block presence;
- it is **not sufficient by itself** to declare exact CSS width or pixel deltas;
- canonical panel widths must not be changed merely because the physical screenshot appears visually smaller;
- exact geometry remains subject to the measurement procedure in `09_PAGE_CANVAS_AND_SCALE.md` and `04_CALENDAR_SPEC.md`.

All findings below are classified as:

- **CONFIRMED** — directly supported by canonical requirements plus visible/current implementation evidence;
- **VISUAL** — clearly visible in the supplied screenshot but exact pixel delta still requires certified capture;
- **NOT VERIFIED** — cannot be accepted without runtime, populated-data, mobile or interaction evidence.

## Executive summary

The homepage follows the correct high-level block order and uses the approved light brand direction. The approved quote and footer decorative assets are visibly present. The five-card Main Events composition is also present.

However, the current screenshot does not satisfy the design acceptance gate because:

1. the required certified 1920px comparison does not exist;
2. the selected-day area is shown in an oversized empty state instead of the required six-card demonstration state;
3. filter controls, calendar metadata, quote content, footer text and cookie content are visually too weak in hierarchy and legibility;
4. the hero and header do not yet establish the approved visual prominence consistently;
5. event cards cannot be accepted because no cards are visible in the supplied evidence;
6. carousel, responsive states and keyboard/touch behaviour are not proven by the screenshot;
7. current open issues already mark page scale, calendar, carousel, quotes and footer as unresolved or partial.

## Compliance matrix

| Block | Canonical requirement | Current evidence | Status | Priority |
|---|---|---|---|---:|
| Global canvas | Continuous `#F1F1F1`; centered 1496–1497px panels; certified 1920px comparison | Correct light canvas and centered panels are visible; exact CSS geometry not certified | NOT VERIFIED | P1 |
| Header | Full-width white, non-sticky, approved logo, clear external actions | Correct content exists; visual scale and action hierarchy are weak | PARTIAL | P2 |
| Hero | Approved 1496×323 panel, approved image, strong headline, canonical CTA `Важные события →` | Correct concept and CTA are present; visual hierarchy and image transition require correction/measurement | PARTIAL | P1 |
| Events outer panel | Filters + calendar side by side; selected-day results below inside same panel | Structure is correct; empty result area creates excessive dead space | PARTIAL | P1 |
| Filters | All required fields, two-column layout, Apply and visible Reset action | Required fields are visible; Reset action is not visible in the screenshot; controls are visually undersized | NON-CONFORMANT | P1 |
| Calendar | Full grid, states, marker triangles, legend, month navigation | Core structure is present; hierarchy, legibility and exact state fidelity remain unaccepted | PARTIAL | P1 |
| Selected-day events | Heading plus 3×2 desktop grid of six approved real cards for design demo | Screenshot shows `Нет событий`; no cards available for acceptance | NON-CONFORMANT | P1 |
| Main Events | Approved five-card fan with real approved covers and interactions | Five-card fan is visible; exact geometry, asset validation and interactions not proven | PARTIAL | P1 |
| Quotes | Approved left/right people with readable quote composition | Approved people are visible; quote content is visually too small and weak | NON-CONFORMANT | P2 |
| Footer | Approved light footer, brand/projects/contacts/stationery/legal | Required content and stationery are present; text hierarchy and legibility are weak | PARTIAL | P2 |
| Cookie banner | Clear consent notice, readable legal link and usable acknowledgement control | Present; dense text and small control reduce readability/usability | PARTIAL | P2 |
| Mobile/tablet | Responsive stacking, no overflow, complete interaction states | No current mobile/tablet evidence supplied | NOT VERIFIED | P1 |
| Accessibility | Visible focus, semantic controls, sufficient contrast and target sizes | Some code support exists; screenshot shows probable small targets and low-contrast text | NOT VERIFIED | P1 |

## Detailed findings

### DA-001 — Acceptance evidence is incomplete

- **Classification:** CONFIRMED
- **Priority:** P1
- **Blocks:** Entire homepage

The canonical process requires a current `1920 × 1080`, browser zoom `100%` comparison and desktop/mobile evidence. The supplied screenshot is useful but does not include CSS viewport, zoom and devicePixelRatio metadata.

**Required correction:** produce controlled browser captures and a measurement table before changing canonical widths.

---

### DA-002 — Current open-issue registry is stale after repository consolidation

- **Classification:** CONFIRMED
- **Priority:** P1 documentation
- **Blocks:** Governance

`08_OPEN_ISSUES.md` and `09_RELEASE_ACCEPTANCE_CHECKLIST.md` still refer to an obsolete branch/server synchronization problem (`GIT-001`, local commit `3f8ecdb`) even though the repository has been consolidated to `main`, historical tips were archived, and the server working tree was confirmed clean.

This does not directly alter pixels, but it makes the acceptance gate unreliable.

**Required correction:** close or replace obsolete repository issues and align R1 with the verified `main` baseline.

---

### DA-003 — Header visual hierarchy is too weak

- **Classification:** VISUAL
- **Priority:** P2
- **Block:** Header

Observed:

- logo/title and external action buttons are visually small relative to the main content width;
- the header does not create a strong, deliberate top-level navigation band;
- Telegram, MAX and partner controls look like low-priority micro-buttons rather than primary external actions;
- icon, label, padding and target-size balance is inconsistent.

The canonical header is full-width white and uses the approved logo without self-drawn replacements.

**Required correction:** verify actual header height and inner width; normalize action-button geometry and states; preserve approved logo and copy.

---

### DA-004 — Hero does not yet deliver the required primary hierarchy

- **Classification:** VISUAL
- **Priority:** P1
- **Block:** Hero

Observed:

- headline, supporting copy and CTA occupy a comparatively small visual area;
- the CTA is too small to function as the dominant next action;
- the right image composition is pale and loses definition toward the centre transition;
- the white transition/overlay appears broader than necessary and weakens the image rather than integrating it;
- the panel reads as compressed compared with the importance of the page’s primary message.

The canonical CTA wording is correct: `Важные события →`.

**Required correction:** re-measure the approved 1496×323 panel, text block and image mask directly from Figma/PDF; retain the approved image; correct only measured typography, CTA and transition values.

---

### DA-005 — Events panel contains excessive empty vertical space

- **Classification:** CONFIRMED/VISUAL
- **Priority:** P1
- **Block:** Events outer panel

Observed:

- filters and calendar occupy only the upper portion;
- the selected-day section extends into a large blank zone;
- `Нет событий` is isolated in the middle with no useful recovery action;
- the blank region disrupts page rhythm and delays the Main Events block.

The design demo specification requires six selected-day cards on the demonstration date. The current screenshot therefore cannot represent the accepted design state.

**Required correction:** restore/verify design-demo data for a date with six events; separately design the genuine empty state so its height is content-driven rather than imitating a six-card layout with blank space.

---

### DA-006 — Filter Reset action is not visible

- **Classification:** CONFIRMED from screenshot against specification
- **Priority:** P1
- **Block:** Filters

`04_CALENDAR_SPEC.md` requires a visible Reset filter action. The supplied screenshot shows the Apply button but no visible Reset action.

**Required correction:** ensure Reset is always discoverable when filters can be changed, with approved wording, focus, hover and disabled behaviour.

---

### DA-007 — Filter controls are visually undersized and low-emphasis

- **Classification:** VISUAL
- **Priority:** P2
- **Block:** Filters

Observed:

- labels, dropdown text, checkboxes, status dots and spacing appear very small;
- checkbox hit areas appear limited to the glyph/label row rather than a robust target;
- the Apply button resembles a disabled grey control, reducing action clarity;
- the two-column card has large unused lower space while the actual controls are compressed at the top.

**Required correction:** compare measured font sizes, row heights, dropdown height, checkbox target area and button state colours with Figma. Preserve all functional fields.

---

### DA-008 — Calendar hierarchy and metadata are too faint

- **Classification:** VISUAL
- **Priority:** P2
- **Block:** Calendar

Observed:

- month title and previous/next controls have weak prominence;
- weekday labels, muted dates and legend are difficult to read at the supplied display scale;
- marker triangles and legend dots are too subtle to scan quickly;
- selected date is visible, but the distinction among today, selected, weekend and event status states is not sufficiently strong in this evidence.

The table structure, muted adjacent-month dates, weekend tint and top-right marker model are present and broadly aligned with the specification.

**Required correction:** run the required state matrix and certified screenshot comparison; adjust only measured typography, contrast, marker and spacing values.

---

### DA-009 — Selected-day heading is visually subordinate

- **Classification:** VISUAL
- **Priority:** P2
- **Block:** Selected-day events

The heading `События на 23 июля 2026` is small and placed close to the left edge of a very large empty area. It does not sufficiently establish a new content subsection.

**Required correction:** verify heading typography, spacing and alignment against the approved card-grid crop; keep the canonical date format.

---

### DA-010 — Event cards cannot be accepted from current evidence

- **Classification:** NOT VERIFIED
- **Priority:** P1
- **Block:** Event cards

No selected-day cards are visible. Therefore the following cannot be evaluated:

- 3×2 desktop grid;
- approved covers;
- status badges;
- date badge geometry;
- title case and line limits;
- speaker display;
- `Подробнее` action;
- hover/focus and modal opening;
- card spacing and equal heights.

**Required correction:** capture the canonical demonstration date with six API-backed cards and verify image HTTP responses and asset registry mapping.

---

### DA-011 — Main Events block is present but remains unaccepted

- **Classification:** CONFIRMED/PARTIAL
- **Priority:** P1
- **Block:** Main Events

Positive observations:

- five-card fan composition is visible;
- centre card is dominant;
- approved event artwork rather than gradients is shown;
- previous/next and dot navigation are present.

Outstanding problems:

- exact fan geometry is not measured against the approved crop;
- side-card overlap and depth require side-by-side validation;
- navigation dots/arrows are visually small;
- click, keyboard, Home/End, swipe, focus and reduced-motion behaviour are not demonstrated;
- runtime API eligibility and image contract are not proven by the screenshot.

**Required correction:** complete R6 evidence with real API payload, image HTTP checks, controlled desktop/mobile screenshots and interaction tests.

---

### DA-012 — Quote is not readable enough relative to its decorative artwork

- **Classification:** VISUAL
- **Priority:** P2
- **Block:** Quotes

Observed:

- the two approved people images are correctly present;
- the quote itself is much smaller and lighter than the surrounding artwork;
- decorative punctuation and border dominate the text rather than supporting it;
- the section contains large empty areas but the core message remains visually weak.

**Required correction:** re-measure quote card width/height, text size, line-height, punctuation scale and person placement from the approved quote crop. Do not replace the registered people assets.

---

### DA-013 — Footer information hierarchy and legibility are weak

- **Classification:** VISUAL
- **Priority:** P2
- **Block:** Footer

Observed:

- brand, projects, contacts, stationery and legal area are all present;
- project/contact/legal text is very small and low-contrast;
- columns appear sparse and do not form a strong reading grid;
- the stationery composition carries more visual weight than the useful links and contact information;
- bottom legal links are close to the cookie banner and difficult to scan.

**Required correction:** compare column grid, typography, line spacing, stationery size/position and legal divider against the approved footer crop; preserve current canonical contact data.

---

### DA-014 — Cookie banner is dense and visually intrusive

- **Classification:** VISUAL
- **Priority:** P2
- **Block:** Cookie banner

Observed:

- the banner spans the full viewport and covers part of the lower page;
- explanatory text is dense and small;
- the legal link is embedded in a long sentence;
- the `Понятно` button is small relative to the banner width and likely below a comfortable target size.

**Required correction:** retain legally required meaning while improving readable line length, target size, spacing, focus and mobile layout. Legal behaviour must not be changed as a side effect of visual work.

---

### DA-015 — Typography scale lacks a consistent hierarchy

- **Classification:** VISUAL
- **Priority:** P1
- **Blocks:** Entire homepage

The screenshot shows a recurring pattern:

- many labels and supporting texts are close in size;
- secondary content is often too light;
- section headings do not consistently lead their blocks;
- controls, legends and legal information approach minimum readability limits.

**Required correction:** produce a documented typography token table in `02_DESIGN_SYSTEM.md` after measuring approved values. Do not globally scale the root font size.

---

### DA-016 — Interactive target sizes and focus cannot be accepted

- **Classification:** NOT VERIFIED with visual risk
- **Priority:** P1 accessibility
- **Blocks:** Header, filters, calendar, carousel, footer, cookie banner

Several visible controls appear smaller than a comfortable pointer/touch target. The screenshot cannot prove keyboard focus visibility or focus order.

**Required correction:** verify keyboard-only navigation, visible focus, semantic names and target geometry for every interactive control on desktop and mobile.

---

### DA-017 — Responsive behaviour has no current evidence

- **Classification:** NOT VERIFIED
- **Priority:** P1
- **Blocks:** Entire homepage

No current tablet or mobile screenshots accompany this audit. Canonical acceptance explicitly requires responsive stacking and no horizontal overflow.

**Required correction:** capture at minimum:

- desktop `1920 × 1080`;
- tablet around `1024px`;
- mobile `390px`;
- populated and empty event states;
- carousel and cookie banner interactions.

---

### DA-018 — Canonical document numbering conflict

- **Classification:** CONFIRMED documentation defect
- **Priority:** P2 documentation
- **Blocks:** Governance

Two canonical files currently use the number `09`:

- `09_PAGE_CANVAS_AND_SCALE.md`;
- `09_RELEASE_ACCEPTANCE_CHECKLIST.md`.

The PROJECT_BIBLE navigation lists the release checklist but does not list the page-canvas document, despite `02_DESIGN_SYSTEM.md` depending on it.

**Required correction:** renumber and update links without deleting history; record the migration in `MIGRATION_MAP.md`.

## Confirmed compliant elements

The following are visibly or structurally aligned and should be preserved during remediation:

- canonical homepage block order;
- continuous light-grey page canvas direction;
- white panel/card visual language;
- approved navy and mint brand direction;
- approved header logo asset;
- canonical Hero CTA wording;
- filters-left/calendar-right desktop composition;
- adjacent-month calendar dates;
- weekend tint and top-right event markers;
- section title `Главные события`;
- visible five-card carousel fan;
- approved left/right quote people assets;
- approved footer stationery asset;
- full footer information categories;
- cookie notice presence.

## Items intentionally not judged from this screenshot

- exact CSS panel width and left/right margin;
- exact typography pixel values;
- event-card design while no cards are rendered;
- event modal and reminder chooser;
- hover, active, focus, disabled, loading and error states;
- carousel keyboard/swipe/reduced-motion behaviour;
- tablet/mobile layout;
- API correctness and asset HTTP status;
- build and deploy health.

## Acceptance decision by release stage

| Stage | Decision from this audit | Reason |
|---|---|---|
| R4 Header and Hero | REJECTED | Controlled comparison and hierarchy corrections required |
| R5 Filters, Calendar, Cards | REJECTED | Empty demo state, missing visible Reset action, cards not observable |
| R6 Main Events | REJECTED | Visual/API/interaction evidence incomplete |
| R7 Quotes and Footer | REJECTED | Legibility/hierarchy corrections and controlled comparison required |
| R9 Full regression | NOT STARTED | Depends on accepted component stages |

## Required next deliverable

After project-owner approval of this audit, create:

`docs/PROJECT_BIBLE/13_DESIGN_REMEDIATION_PLAN.md`

The plan must:

1. separate documentation cleanup from UI implementation;
2. create one short-lived feature branch per bounded block;
3. begin with controlled screenshots and populated design-demo data;
4. fix global typography/interaction tokens before block-specific polishing;
5. sequence Header/Hero, Events controls, Event cards, Main Events, Quotes/Footer, Cookie, then responsive QA;
6. define build, screenshot and acceptance evidence for every work package;
7. update `08_OPEN_ISSUES.md` and `09_RELEASE_ACCEPTANCE_CHECKLIST.md` after each accepted block.

No production UI change should be made solely from subjective screenshot impressions. Exact values must come from approved Figma/PDF measurements.