# 11 — Design Phase Workflow

## Status

Approved by project owner on 2026-07-23.

The repository cleanup and release consolidation stage is complete. The active development branch is `main`. The verified baseline is commit `b6c333a` with release tag `release-20260723`. Historical branch tips are preserved by 39 tags matching `archive-20260723-*`.

## Objective

Create a coherent, premium, production-ready UI/UX for «АБ Афиша Бухгалтера» without changing approved product behaviour unless a separate functional decision is explicitly accepted.

The design phase starts with the public homepage and establishes the reusable visual system for subsequent public and administrative screens.

## Canonical order of work

1. Audit the current screen and its active import/component chain.
2. Compare the current implementation with approved Figma, PDF references and registered assets.
3. Record discrepancies and unresolved decisions before editing code.
4. Define the screen structure, component states, responsive behaviour and exact geometry.
5. Implement one approved screen or bounded block at a time.
6. Run build, functional smoke checks and visual QA.
7. Present current screenshots for owner approval.
8. Update canonical documentation, asset registry, open issues and acceptance evidence.
9. Only after approval, proceed to the next screen.

## First design scope — public homepage

The first controlled design scope includes:

- header and navigation;
- hero section and primary CTA;
- search and filters;
- calendar;
- event cards and selected-day content;
- «Главные события» carousel;
- supporting benefit/instruction blocks;
- reminders and partner actions;
- rotating quotes;
- footer;
- desktop, tablet and mobile behaviour;
- hover, focus, active, disabled, loading, empty and error states.

## Mandatory design principles

- Use approved brand colours and assets.
- Preserve the product’s accounting/event-service character; do not turn it into a generic template.
- Do not invent replacement logos, illustrations, text or icons without explicit approval.
- Do not change business logic, data contracts or routes as a side effect of visual work.
- Do not use CSS scaling tricks to imitate reference dimensions.
- Build success is necessary but not sufficient; screenshot-based visual acceptance is mandatory.
- Every reusable component must document geometry, typography, spacing, colour, radius, shadow, states and responsive behaviour.
- Accessibility must be maintained: keyboard navigation, visible focus, semantic controls, sufficient contrast and meaningful labels.

## Approval gates

A screen is accepted only when all items below are satisfied:

- implementation matches approved references and current specification;
- desktop and mobile screenshots are reviewed;
- no unintended functional regressions are found;
- frontend build passes;
- affected routes complete smoke checks;
- unresolved visual differences are recorded in `08_OPEN_ISSUES.md`;
- approved values are written into the relevant PROJECT_BIBLE specification;
- evidence is added to `09_RELEASE_ACCEPTANCE_CHECKLIST.md`.

## Change control

Approved visual decisions become canonical only after they are written into PROJECT_BIBLE. Chat messages, temporary prompts, stage reports and implementation code do not override canonical specifications.

Any proposal that changes functionality, legal behaviour, data processing, API contracts, infrastructure or deployment must be separated from the design task and approved independently.

## Git workflow for the design phase

- `main` is the sole canonical integration branch.
- New design work must be performed in a short-lived feature branch created from current `main`.
- One branch should cover one approved screen or tightly bounded design block.
- Each branch must include code, documentation and QA evidence for its scope.
- Merge only after owner approval and required checks.
- Delete the feature branch after merge; retain releases through annotated release tags.
- Never commit secrets, credentials, production `.env` files or private access tokens.

Recommended branch naming:

```text
design/homepage-<scope>
design/calendar-<scope>
design/event-page-<scope>
design/admin-<scope>
```

## Definition of Done for the homepage design stage

The homepage design stage is complete when:

1. all homepage sections use one approved design language;
2. shared tokens and components are documented in `02_DESIGN_SYSTEM.md`;
3. homepage structure is current in `03_HOMEPAGE_STRUCTURE.md`;
4. calendar-specific behaviour is current in `04_CALENDAR_SPEC.md`;
5. all used assets are registered in `05_ASSET_REGISTRY.md`;
6. desktop and mobile visual QA evidence is accepted;
7. critical and high-priority open issues for the homepage are closed;
8. the accepted implementation is merged into `main` and tagged as a verified release when deployed.
