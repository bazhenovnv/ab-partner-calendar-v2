# 13 — Documentation Stabilization Report — 2026-07

## Status

**Canonical documentation stabilization: COMPLETE for entry into homepage design remediation.**

This status means the active engineering sources are internally aligned sufficiently to begin bounded design work. It does not mean that historical reports are factually current or that the homepage has passed visual acceptance.

## Scope completed

The following active documents were reviewed and aligned:

- root `README.md`;
- `00_SOURCE_OF_TRUTH.md`;
- `01_PROJECT_OVERVIEW.md`;
- `03_HOMEPAGE_STRUCTURE.md`;
- `04_CALENDAR_SPEC.md`;
- `05_ASSET_REGISTRY.md`;
- `06_DEPLOYMENT_CURRENT.md`;
- `08_OPEN_ISSUES.md`;
- `09_PAGE_CANVAS_AND_SCALE.md`;
- `09B_RELEASE_ACCEPTANCE_CHECKLIST.md`;
- `10_MAIN_EVENTS_CAROUSEL_SPEC.md`;
- `11_DESIGN_PHASE_WORKFLOW.md`;
- `12_DESIGN_AUDIT_2026-07.md`;
- `DOCUMENT_INVENTORY.md`;
- `DOCUMENT_CONFLICT_MATRIX.md`;
- `MIGRATION_MAP.md`;
- `docs/BUSINESS_RULES.md`;
- `docs/ADR.md`.

## Corrections made

### Repository and Git workflow

- `main` is the sole canonical integration branch.
- References to obsolete working branches were removed from active overview and deployment documents.
- New work must use short-lived feature branches from current `main`.
- Historical branch tips and old pull-request bases remain repository history, not current instructions.

### Release and deployment

- Deployment now selects an explicitly accepted commit on `main` or an approved release tag.
- The obsolete release blocker tied to server commit `3f8ecdb` was removed from current open issues.
- Deployment verification now requires source SHA, image/container identity, health checks, assets and staging evidence.
- The release checklist was renamed to `09B_RELEASE_ACCEPTANCE_CHECKLIST.md` to remove duplicate numbering.

### Design governance

- The current homepage remediation baseline is `12_DESIGN_AUDIT_2026-07.md`.
- Exact desktop widths remain locked to measured Figma geometry; prototype viewer zoom must not be copied into CSS.
- Build success alone is not design acceptance.
- Desktop/mobile screenshots, functional smoke checks, comparison evidence and owner approval are mandatory.

### Business and component contracts

- BUSINESS_RULES authority wording now covers approved additions v7–v11.
- Main Events uses only published records with `mainEvent=true` and valid `mainEventUrl`.
- Active main events are selected first; remaining positions may use latest completed main events only.
- Ordinary-event fallback and duplicates are prohibited.
- Main-event artwork is displayed completely without cropping.

### Open-issue hygiene

The current open-issue registry now contains only unresolved release, design, runtime-verification and asset-governance work. Closed asset-discovery items and obsolete implementation blockers are retained only as resolved/superseded history.

## Historical-document policy

Files named `STAGE_*`, `*_REPORT`, old `*_AUDIT`, old comparison reports, pull-request descriptions and `CHANGELOG.md` are point-in-time evidence. They may contain valid historical commands or results, but they cannot establish current completion, branch, deployment, visual conformity or release status.

When a historical statement conflicts with an active source, the authority order in `00_SOURCE_OF_TRUTH.md` applies. Historical files are preserved; they are not silently rewritten to look current.

## Remaining documentation work that does not block design entry

- normalize ambiguous historical Figma/archive asset names after binary-safe hash comparison (`DOC-002`);
- add individual deprecation headers to historical reports only when those files are touched or migrated;
- continue recording accepted design measurements in the relevant block specification during remediation.

These tasks remain governed, but they do not require delaying the first bounded homepage design branch.

## Design entry decision

Documentation entry gate: **PASSED**.

The next authorized phase is homepage design remediation in this order:

1. Header + Hero;
2. Filters + Calendar + selected-day event cards;
3. Main Events carousel;
4. Quotes;
5. Footer + legal area + cookie banner;
6. responsive and accessibility regression;
7. full controlled visual acceptance.

Every block must follow `11_DESIGN_PHASE_WORKFLOW.md` and record evidence in `09B_RELEASE_ACCEPTANCE_CHECKLIST.md`.
