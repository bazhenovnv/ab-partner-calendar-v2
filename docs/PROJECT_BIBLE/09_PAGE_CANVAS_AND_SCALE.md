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

## Canonical desktop scale — LOCKED (Stage 58.2)

**Status: VERIFIED against actual Figma node dimensions. Do not reduce page width.**

Figma frame `5913:4745` ("Desktop / 1920 / АБ Афиша main") has actual dimensions **1920 × 3565 px** in design space. All content panels below were measured directly from Figma node geometry via MCP and confirmed against computed CSS values at 1920px viewport (Stage 58.2, 2026-07-14).

The Figma prototype viewer uses `scaling=min-zoom`, which shrinks the 1920px frame to fit the viewer's browser window (typically 66–75% on a 1280–1440px laptop screen). This viewer zoom is **not a CSS reference**. Future agents must not reduce panel widths to match the Figma editor display.

### Verification results (Stage 58.2)

| Element | Figma node x | CSS left | Δ | Figma node width | CSS width | Δ |
|---|---:|---:|---:|---:|---:|---:|
| Hero panel (`5913:4980` Group 1237) | 211 | 212 | +1 | ~1496 | 1496 | 0 |
| Events outer (`5913:4752`) | 211 | 211.5 | +0.5 | 1497 | 1497 | **0** |
| Filters (`5913:4888`) | 265 | 265.5 | +0.5 | 588 | 588 | **0** |
| Calendar (`5913:4757`) | 894.36 | 893.5 | −0.86 | 760.866 | 760.9 | +0.034 |
| Carousel+Quotes (`5913:4884`) | 212 | — | — | 1496 | 1496 | **0** |
| Footer (`5913:4994`) | 212 | — | — | 1496 | 1496 | **0** |

All deltas are sub-pixel (≤1px). **No CSS width change is required or permitted to match the Figma design.**

## Canonical desktop content widths

| Element | Canonical geometry | Source |
|---|---:|---|
| Header inner | `max-width: 1496px` | approved Figma header/footer geometry |
| Hero panel | `1496px × 323px` | Figma node `5913:4980` (Group 1237 child w=1495.234) |
| Events outer panel | `max-width: 1497px` | Figma node `5913:4752` |
| Events outer horizontal padding | `54px` each side | verified inner geometry |
| Filters card | `588px` wide, `min-height: 632px` | Figma node `5913:4888` |
| Calendar card | `760.866px` wide, `min-height: 631.824px` | Figma node `5913:4757` |
| Controls gap | `40px` (CSS) / `41.36px` (Figma) | Figma node spacing; reduced 1.36px to prevent overflow at 1389px inner width |
| Main Events / Quotes shared inner panel | `max-width: 1496–1497px` | Figma node `5913:4884` |
| Footer inner | `max-width: 1496px` | Figma node `5913:4994` |

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

## Background architecture — VERIFIED (Stage 58.3)

| Element | Required | Computed (Stage 58.3) | Status |
|---|---|---|---|
| `html` | `#F1F1F1` | `rgb(241,241,241)` | ✅ |
| `body` | `#F1F1F1` | `rgb(241,241,241)` | ✅ |
| `PublicShell` root | `#F1F1F1` | `rgb(241,241,241)` | ✅ |
| `main` | transparent (shows canvas) | `rgba(0,0,0,0)` | ✅ |
| `.pub-hero` | `#F1F1F1` | `rgb(241,241,241)` | ✅ |
| `.pub-hero-panel` | `#FFFFFF` | `rgb(255,255,255)` | ✅ |
| `.pub-events-section` | transparent | `rgba(0,0,0,0)` | ✅ |
| `.pub-events-outer` | `#FFFFFF` | `rgb(255,255,255)` | ✅ |
| `.pub-main-quotes-wrapper` | transparent | `rgba(0,0,0,0)` | ✅ |
| `.pub-main-quotes-inner` | `#FFFFFF` | `rgb(255,255,255)` | ✅ |
| `header` | `#FFFFFF` | `rgb(255,255,255)` | ✅ |
| `footer` | `#FFFFFF` | `rgb(255,255,255)` | ✅ |

No full-width white wrapper found that interrupts the continuous `#F1F1F1` canvas.

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
