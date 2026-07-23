# 09 — Release Acceptance Checklist

## Purpose

This checklist is the mandatory acceptance gate for the Monday delivery. Every completed work block is verified against canonical documentation before the next block begins.

## Evidence rule

A stage may be marked complete only when all applicable evidence exists:

- linked commit SHA;
- successful production build;
- current staging verification;
- desktop and mobile screenshots where visual behavior changed;
- comparison against the relevant PROJECT_BIBLE specification and approved design reference;
- updated `08_OPEN_ISSUES.md` status.

A commit or successful build alone is not acceptance evidence.

## Stage order

| Stage | Scope | Canonical documents | Required evidence | Status |
|---|---|---|---|---|
| `R1` | Repository and server synchronization | `00_SOURCE_OF_TRUTH.md`, `06_DEPLOYMENT_CURRENT.md` | server HEAD equals remote branch HEAD; clean working tree; commit `3f8ecdb` represented remotely | OPEN |
| `R2` | Static assets and HTTP delivery | `05_ASSET_REGISTRY.md`, `08_OPEN_ISSUES.md` | approved source; path, dimensions, format, SHA256; HTTP 200 with correct content type; visual comparison | OPEN |
| `R3` | Event modal and reminder chooser | relevant approved design reference, `BUSINESS_RULES.md`, `08_OPEN_ISSUES.md` | participation URL tests; Telegram/MAX tests; keyboard/close behavior; desktop/mobile screenshots | OPEN |
| `R4` | Header and Hero | `02_DESIGN_SYSTEM.md`, `03_HOMEPAGE_STRUCTURE.md` | 1920px and mobile comparison; CTA behavior; assets verified | OPEN |
| `R5` | Filters, calendar and selected-day cards | `04_CALENDAR_SPEC.md`, `BUSINESS_RULES.md` | state matrix; date navigation; filters; card/modal interaction; desktop/mobile screenshots | OPEN |
| `R6` | Main Events carousel | `03_HOMEPAGE_STRUCTURE.md`, `05_ASSET_REGISTRY.md` | five-card fan composition; interaction test; real API data; screenshots | OPEN |
| `R7` | Quotes and footer | `03_HOMEPAGE_STRUCTURE.md`, `05_ASSET_REGISTRY.md` | approved assets; data rendering; visual comparison; legal links | OPEN |
| `R8` | Legal, SEO, analytics and integrations | main TZ, v7–v11 additions, `BUSINESS_RULES.md` | route checks; consent flows; Yandex Metrika presence; bot links; metadata checks | OPEN |
| `R9` | Full regression and release | `06_DEPLOYMENT_CURRENT.md`, all applicable specifications | clean build; service health; browser regression; staging sign-off; production deployment plan | OPEN |

## Stage report template

For every stage, append a report using this exact structure:

```md
### Stage Rn — <name>

- Commit: `<sha>`
- Build: PASS / FAIL
- Staging: PASS / FAIL
- Desktop verification: PASS / FAIL / N/A
- Mobile verification: PASS / FAIL / N/A
- Canonical documents checked:
  - `<document>`
- Evidence:
  - `<command/result/screenshot path>`
- Deviations:
  - `<none or issue IDs>`
- Open issues updated: YES / NO
- Acceptance: ACCEPTED / REJECTED
```

## Current blockers

The current release cannot pass acceptance while any of these remain unresolved:

- `GIT-001` — server commit is not synchronized to GitHub;
- `ASSET-005` — five approved event-modal icons are absent and staging returns HTML instead of PNG;
- `FUNC-001` — event participation and reminder behavior is not yet proven by remote commit, build and staging interaction tests;
- `UI-001` and `UI-002` — approved desktop comparison remains incomplete.
