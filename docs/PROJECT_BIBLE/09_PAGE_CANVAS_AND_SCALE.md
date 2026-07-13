# 09 — Page Canvas and Desktop Scale

## Purpose

This document is the canonical source for the overall desktop canvas, page width, section widths and background behaviour of the public homepage.

## Approved sources

Authority order:

1. Raw Figma node geometry from the approved design file.
2. Approved desktop homepage reference `АБ Афиша main(6).pdf` / `VIS-HOME-1920`.
3. Canonical measurements recorded below.
4. Current code.

A screenshot of the Figma prototype viewer is **not** a geometry source when the URL uses `scaling=min-zoom` or another viewer scaling mode. The viewer can visually shrink the entire frame to fit the browser window. Do not reproduce that viewer zoom with CSS.

## Desktop reference viewport

- Reference viewport: `1920 × 1080` CSS pixels.
- Browser zoom for QA: `100%`.
- OS display scaling / devicePixelRatio must be recorded separately when comparing physical screenshots.
- Never use `transform: scale`, CSS `zoom`, root font scaling or browser zoom to imitate the approved design.

## Global canvas

- `html`: full viewport width, no design max-width.
- `body`: full viewport width, background `#F1F1F1`.
- Public homepage main canvas: background `#F1F1F1` continuously behind all homepage sections.
- Header: full-width white background.
- Footer: approved white footer panel/zone according to the footer reference.
- Do not add black side bars. Black areas visible around a Figma prototype are viewer chrome, not part of the website design.
- Do not place the entire homepage inside a fixed-width outer frame. Only the inner content panels are width-constrained.

## Canonical desktop content widths

| Element | Canonical geometry | Source |
|---|---:|---|
| Header inner | `max-width: 1496px` | approved Figma header/footer geometry |
| Hero panel | `1496px × 323px` | Figma node `{DB7079EA}` |
| Events outer panel | `max-width: 1497px` | Figma node `5913:4752` |
| Events outer horizontal padding | `54px` each side | verified inner geometry |
| Filters card | `588px` wide, `min-height: 632px` | Figma node `5913:4888` |
| Calendar card | `760.866px` wide, `min-height: 631.824px` | Figma node `5913:4757` |
| Controls gap | `41.36px` | approved Figma geometry |
| Main Events / Quotes shared inner panel | `max-width: 1496–1497px` | approved desktop reference |
| Footer inner | `max-width: 1496px` | approved footer geometry |

## Horizontal placement at 1920px

For a `1496px` centered panel in a `1920px` CSS viewport:

- left margin: `(1920 - 1496) / 2 = 212px`;
- right margin: `212px`.

For a `1497px` centered panel:

- left/right margin: `(1920 - 1497) / 2 = 211.5px`.

These are CSS pixel values. A physical screenshot can show different pixel counts when the OS display scale or devicePixelRatio is not `1`.

## Section gutters

- Desktop section wrapper gutter: `16px` only as outer safety padding.
- The centered panel max-width remains `1496–1497px`.
- Do not increase the panel to the full browser width.
- Do not shrink the panel to match a Figma prototype shown with `min-zoom`.

## Background ownership

The following must not introduce conflicting full-width backgrounds:

- `PublicShell`;
- homepage `<main>`;
- `.pub-hero`;
- `.pub-events-section`;
- Main Events / Quotes shared wrapper;
- Footer wrapper.

Required ownership:

- page canvas background: `body` and the public homepage main wrapper → `#F1F1F1`;
- content cards/panels → `#FFFFFF`;
- individual section wrappers should normally be transparent unless the approved design explicitly assigns a section background.

## Responsive rule

- `>= 1530px`: use the canonical `1496–1497px` max-width panels.
- Below the canonical width: panel width becomes `calc(100% - 32px)` through the existing `16px` section gutters.
- Do not preserve desktop fixed widths when they cause horizontal scrolling.
- Responsive changes must be implemented through container widths and media queries, never page scaling.

## Verification procedure

At `1920 × 1080`, browser zoom `100%`, record computed values for:

1. header inner width and left edge;
2. hero panel width, height and left edge;
3. events outer width and left edge;
4. filters width;
5. calendar width;
6. Main Events / Quotes shared panel width and left edge;
7. footer inner width and left edge;
8. computed backgrounds of `html`, `body`, public shell, `main` and every section wrapper.

Acceptance requires the measured values, not a subjective statement that the site “looks smaller” or “looks larger”.

## Forbidden interpretations

- Figma prototype `min-zoom` display size is not the website CSS size.
- Browser chrome and black Figma side areas are not website backgrounds.
- Physical screenshot pixels are not CSS pixels unless devicePixelRatio is confirmed as `1`.
- Do not alter canonical widths merely to match one physical screenshot taken under unknown OS scaling.
