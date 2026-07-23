# 09 — Release Acceptance Checklist

## Purpose

This checklist is the mandatory acceptance gate for every design, functional and release stage. A completed work block is verified against canonical documentation before the next dependent block is accepted.

## Evidence rule

A stage may be marked complete only when all applicable evidence exists:

- linked commit SHA in `main` or in the reviewed feature branch;
- successful production build for the assessed commit;
- current staging verification;
- desktop and mobile screenshots where visual behaviour changed;
- comparison against the relevant PROJECT_BIBLE specification and approved design reference;
- updated `08_OPEN_ISSUES.md` status;
- owner approval when the stage changes the approved visual result.

A commit or successful build alone is not acceptance evidence.

## Stage order

| Stage | Scope | Canonical documents | Required evidence | Status |
|---|---|---|---|---|
| `R0` | Documentation stabilization | `00_SOURCE_OF_TRUTH.md`, PROJECT_BIBLE navigation, inventory, conflict matrix and migration map | unique numbering, current facts, corrected links, stale blockers removed and documentation review recorded | IN PROGRESS |
| `R1` | Repository and deployment baseline | `00_SOURCE_OF_TRUTH.md`, `06_DEPLOYMENT_CURRENT.md` | default branch confirmed as `main`; assessed commit identified; deployment target and environment verified | OPEN |
| `R2` | Static assets and HTTP delivery | `05_ASSET_REGISTRY.md`, `08_OPEN_ISSUES.md` | approved source, path, dimensions, format, SHA256, HTTP 200 with correct content type and visual comparison | OPEN |
| `R3` | Event modal and reminder chooser | approved modal reference, `BUSINESS_RULES.md`, `08_OPEN_ISSUES.md` | participation URL tests, Telegram/MAX tests, keyboard/close/focus behaviour and desktop/mobile screenshots | OPEN |
| `R4` | Header and Hero | `02_DESIGN_SYSTEM.md`, `03_HOMEPAGE_STRUCTURE.md`, desktop canvas specification | controlled 1920px and mobile comparison, CTA behaviour and asset verification | OPEN |
| `R5` | Filters, calendar and selected-day cards | `04_CALENDAR_SPEC.md`, `BUSINESS_RULES.md` | state matrix, date navigation, filters, populated six-card state, card/modal interaction and desktop/mobile screenshots | OPEN |
| `R6` | Main Events carousel | `03_HOMEPAGE_STRUCTURE.md`, carousel specification and `05_ASSET_REGISTRY.md` | five-card composition, real API data, keyboard/swipe/click tests and approved-reference screenshots | OPEN |
| `R7` | Quotes and footer | `03_HOMEPAGE_STRUCTURE.md`, `05_ASSET_REGISTRY.md` | approved assets, populated data, legal/contact links and desktop/mobile comparison | OPEN |
| `R8` | Legal, SEO, analytics and integrations | main TZ, approved additions v7–v11 and `BUSINESS_RULES.md` | route checks, consent flows, Yandex Metrika presence, bot links and metadata checks | OPEN |
| `R9` | Full regression and release | `06_DEPLOYMENT_CURRENT.md` and all applicable specifications | clean build, service health, browser regression, staging sign-off and production deployment plan | OPEN |

## Stage report template

For every stage, append a report using this structure:

```md
### Stage Rn — <name>

- Assessed commit: `<sha>`
- Branch: `<branch>`
- Build: PASS / FAIL
- Staging: PASS / FAIL / NOT RUN
- Desktop verification: PASS / FAIL / N/A
- Mobile verification: PASS / FAIL / N/A
- Canonical documents checked:
  - `<document>`
- Evidence:
  - `<command/result/screenshot path>`
- Deviations:
  - `<none or issue IDs>`
- Open issues updated: YES / NO
- Owner approval required: YES / NO
- Owner approval received: YES / NO / N/A
- Acceptance: ACCEPTED / REJECTED / PENDING
```

## Current blockers

The design phase cannot be called accepted while any of these remain unresolved:

- `DOC-003` — PROJECT_BIBLE numbering and cross-references are still being normalized;
- `UI-001` — controlled desktop comparison is missing;
- `UI-002` — filters/calendar/cards acceptance evidence is incomplete;
- `ASSET-004` — complete event-cover runtime mapping and HTTP verification are incomplete;
- `FUNC-001` — event modal and reminder behaviour has not passed current staging verification.

## Transition rule

Implementation work may begin after `R0` is completed. Visual acceptance still requires the evidence listed for each subsequent stage.