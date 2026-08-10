# 00 — Source of Truth

## Purpose

This document defines which source wins when project documents, code, screenshots, runtime state or historical reports conflict.

## Production runtime authority

For the question **which application version is allowed in production**, the highest authority is:

1. explicit approval by the project owner;
2. root file `PRODUCTION_RELEASE.md`;
3. machine-readable lock `infra/deploy/production-frontend.env`.

The current production application is fixed to:

- commit `a8a91ced755eb0ee036176336bc12b4d230f7b75`;
- backend image `ab-afisha/backend:backend-release-a8a91ce`;
- frontend image `ab-afisha/frontend:frontend-release-a8a91ce`.

`main`, `latest`, historical release tags, rollback images and old deployment scripts do not override this lock.

## Authority order

1. Explicit owner approval and the production lock files for production runtime selection.
2. Approved Figma design.
3. Approved homepage PDF/reference screenshots.
4. Canonical documents in `docs/PROJECT_BIBLE/`.
5. `docs/BUSINESS_RULES.md`.
6. `docs/ADR.md`.
7. Main TZ and approved additions v7–v11.
8. Current code in `main`.
9. Stage reports, audit reports and release reports.
10. `docs/CHANGELOG.md` and other historical material.

## Proof rules

A statement such as `COMPLETE`, `FINAL`, `97%`, `PIXEL-PERFECT` or `APPROVED` in an old report is not proof of current compliance.

Current compliance is proven only by:

- the current approved design source;
- explicit measurements;
- current code paths in `main`;
- a successful build for the assessed commit;
- current staging verification;
- desktop/mobile screenshots when visual behaviour changed.

Production deployment approval additionally requires an exact match with `infra/deploy/production-frontend.env`.

## Canonical project facts

- Repository: `bazhenovnv/ab-partner-calendar-v2`.
- Default and integration branch: `main`.
- Development workflow: short-lived feature branches created from current `main`, reviewed and merged back into `main`.
- Historical repository: `bazhenovnv/ab-partner-calendar` — do not use for current work.
- Historical long-lived branch: `claude/ab-afisha-architecture-plan-805f5o` — no longer the canonical working branch.
- Production: `ab-event.pro`.
- Production application commit: `a8a91ced755eb0ee036176336bc12b4d230f7b75`.
- Production backend image: `ab-afisha/backend:backend-release-a8a91ce`.
- Production frontend image: `ab-afisha/frontend:frontend-release-a8a91ce`.
- Staging: `test.ab-event.pro`.
- Deploy path: `/srv/ab-afisha`.
- Current VPS IPv4: `5.129.243.179`.
- Historical VPS IPv4: `77.232.136.248` — removed/deprecated.
- Contact email: `info-event@a-b.ru`.
- Hero CTA: `Важные события →`.
- Carousel section title: `Главные события`.
- Human-readable completed status: `Завершено`; never use `Проведено`.

## Conflict handling

When a conflict is found:

1. Record it in `DOCUMENT_CONFLICT_MATRIX.md`.
2. Identify the winning source by the authority order above.
3. Correct the current canonical document.
4. Preserve historical documents; add a deprecation header instead of erasing history.
5. Update `MIGRATION_MAP.md` for moved or renamed files.
6. Update `08_OPEN_ISSUES.md` only when an unresolved current issue remains.

## Design restrictions

Do not invent text, images, SVG illustrations, dimensions, shadows or spacing. Use only approved assets and registered design references. Missing approved assets must be recorded in `08_OPEN_ISSUES.md` and must not be replaced by self-created artwork.
