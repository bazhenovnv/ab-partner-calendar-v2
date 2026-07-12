# 02 — Design System

## Approved visual sources
1. Figma: `https://www.figma.com/design/t7Vg797xBk263TgvZRrO12/Креативы-АБ?node-id=0-1`.
2. Approved desktop homepage PDF: `АБ Афиша main(6).pdf` supplied with the project task.
3. Registered screenshots/assets in `05_ASSET_REGISTRY.md`.

## Rules
- Do not invent visual values if they exist in Figma/PDF/screenshots.
- Do not create replacement SVGs, AI-generated images, stock illustrations, or new copy without explicit approval.
- Do not use `transform: scale`, CSS `zoom`, or root font scaling to imitate the design.
- A build passing does not prove design compliance.
- Visual acceptance requires a current screenshot comparison.

## Canonical wording
- Hero CTA: `Важные события →`.
- Carousel title: `Главные события`.
- Completed status: `Завершено`.

## Base visual language
- Page canvas: light grey approved background.
- Cards/panels: white.
- Primary dark: navy used in approved buttons/text.
- Accent: approved mint.
- Header: white, non-sticky.
- Main desktop reference: 1920px viewport with central content approximately 1496–1497px where confirmed by Figma.

## Typography
Use project-loaded Montserrat and Gilroy only where the approved design/spec explicitly assigns them. Do not substitute fonts silently.

## Components and states
Every component must document:
- size;
- padding/gap;
- radius;
- shadow;
- background and text colors;
- default/hover/focus/disabled state;
- responsive behaviour;
- approved asset reference.

Exact block geometry belongs in the relevant feature specification, not in historical Stage reports.