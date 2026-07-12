# 00 — Source of Truth

## Purpose
This document defines which source wins when project documents, code, screenshots, or historical reports conflict.

## Authority order
1. Approved Figma design.
2. Approved homepage PDF/reference screenshots.
3. Canonical documents in `docs/PROJECT_BIBLE/`.
4. `docs/BUSINESS_RULES.md`.
5. `docs/ADR.md`.
6. Main TZ and approved additions v7–v11.
7. Current code.
8. Stage reports, audit reports, release reports.
9. `docs/CHANGELOG.md` and other historical material.

## Proof rules
A statement such as `COMPLETE`, `FINAL`, `97%`, `PIXEL-PERFECT`, or `APPROVED` in an old report is not proof of current compliance.

Current compliance is proven only by:
- the current approved design source;
- explicit measurements;
- current code paths;
- build result;
- current staging screenshot/comparison.

## Canonical project facts
- Repository: `bazhenovnv/ab-partner-calendar-v2`.
- Historical repository: `bazhenovnv/ab-partner-calendar` — do not use for current work.
- Working branch: `claude/ab-afisha-architecture-plan-805f5o`.
- Production: `ab-event.pro`.
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

## Design restrictions
Do not invent text, images, SVG illustrations, dimensions, shadows, or spacing. Use only approved assets and registered design references. Missing approved assets must be recorded in `08_OPEN_ISSUES.md` and must not be replaced by self-created artwork.