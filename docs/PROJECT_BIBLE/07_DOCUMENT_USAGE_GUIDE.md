# 07 — Document Usage Guide

## Before coding
1. Open `00_SOURCE_OF_TRUTH.md`.
2. Open the canonical specification for the block being changed.
3. Check `../BUSINESS_RULES.md`.
4. Check `../ADR.md`.
5. Check `05_ASSET_REGISTRY.md`.
6. Check `08_OPEN_ISSUES.md`.
7. Confirm the active import chain from the page entry point.
8. Confirm the approved visual reference and asset paths.

## During coding
- Change only components that are actually imported/rendered.
- Do not edit duplicate/dead components instead of the active path.
- Do not invent text, illustrations, SVGs, dimensions, or behaviour.
- Register every new approved asset before using it.
- Record architectural decisions in ADR.
- Record business behaviour changes in BUSINESS_RULES.
- Record visual/feature parameters in the relevant PROJECT_BIBLE spec.
- Historical Stage/audit reports are context only, never authority.

## Text sources
Use in this order:
1. Approved Figma/PDF wording for visual labels.
2. Canonical PROJECT_BIBLE wording.
3. BUSINESS_RULES.
4. Current approved TZ/additions.
5. Database/admin content.

If no approved text exists, stop and record an open issue. Do not write marketing or legal copy independently.

## Image sources
Use only assets marked approved in `05_ASSET_REGISTRY.md`.

Forbidden:
- custom decorative SVGs;
- AI-generated images;
- random stock images;
- gradients as permanent event covers;
- replacing approved people/stationery illustrations with unrelated graphics;
- storing base64 text with a binary image extension.

## Before commit
1. Review `git diff`.
2. Ensure only intended active files changed.
3. Typecheck/lint as applicable.
4. Run build.
5. Validate binary assets.
6. Perform visual QA at the required viewport.
7. Update feature spec and `08_OPEN_ISSUES.md`.
8. Update CHANGELOG only as history, not as specification.
9. Check for secrets and broken links.

## After deploy
1. Verify server Git SHA.
2. Verify Docker image ID.
3. Verify running container image ID.
4. Verify Next BUILD_ID.
5. Verify HTTP 200 and content types for assets.
6. Capture staging screenshots.
7. Compare with approved reference.
8. Close an issue only after factual visual confirmation.

## Calendar workflow
`00_SOURCE_OF_TRUTH.md` → `04_CALENDAR_SPEC.md` → BUSINESS_RULES BR-004–009/019/020 → `05_ASSET_REGISTRY.md` → active calendar components → build → screenshot comparison → deploy verification.

## Completion language
Do not use `complete`, `final`, `approved` or `pixel-perfect` without current evidence recorded in a comparison document.