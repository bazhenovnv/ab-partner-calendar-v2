# 10 — Main Events Carousel Specification

## Purpose

Canonical implementation and acceptance rules for the `Главные события` carousel.

## Authority

Visual geometry is verified against the approved Figma node and approved desktop PDF. This specification defines the runtime, data and asset contract and must not override measured approved geometry.

## Active implementation

- Component: `apps/frontend/src/components/events/MainEventsBanner.tsx`.
- Styles: `apps/frontend/src/components/events/main-events-carousel.module.css`.
- Data source: `GET /api/events/public/main`.
- Event eligibility: `status=PUBLISHED` and `mainEvent=true`.
- Maximum API result: five events.
- Ordinary events with `mainEvent=false` are never eligible.

## API selection contract

1. Select active featured events (`PLANNED`, `LIVE`) first.
2. Order active featured events by `sortOrder`, then `startDate`.
3. If fewer than five active featured events exist, fill only the remaining positions with the latest `COMPLETED` featured events.
4. Completed fallback records must still have `mainEvent=true`.
5. Ordinary completed events must never be promoted implicitly.
6. Duplicate events are prohibited.
7. The public API returns no more than five records.
8. If fewer than five eligible records exist, render only the available records without invented or duplicated cards.

## Image contract

1. Every public main event must have a valid dedicated carousel image.
2. The canonical API eligibility check is a non-empty `images[0].mainEventUrl`.
3. The active frontend currently prefers the approved untouched square source (`originalUrl`) for `#Хит` artwork and uses `mainEventUrl` as compatibility fallback. This behaviour must be validated against approved assets before acceptance.
4. Generic event-card images, thumbnails, gradients and invented artwork are not acceptable final carousel substitutes.
5. Main-event artwork must be displayed completely without cropping; runtime uses `object-fit: contain`.
6. A main event without an eligible image is omitted from the public carousel and must return to the administration workflow for correction.
7. Every production asset must be registered in `05_ASSET_REGISTRY.md` with path, dimensions, format, SHA256 and source approval.
8. Required HTTP verification: status `200` and an image content type.

## Five-card composition

When at least five eligible events exist, the desktop state contains:

- one active centre card;
- one near card on each side;
- one outer card on each side.

The centre card is front-facing and dominant. Side cards use mirrored combinations of horizontal translation, vertical offset, negative Z translation, angle, scale, brightness, opacity and stacking order.

The composition must remain symmetrical. It must not use root scaling or CSS zoom.

## Interaction

- Click the active card: open the event modal.
- Click a side card: make it active.
- Previous/next controls: move by one event with circular wrapping.
- Approved navigation indicators: reproduce the approved reference; the current implementation uses three directional/current-position indicators and must not be described as one dot per event.
- Keyboard: Left, Right, Home and End.
- Pointer/touch: horizontal swipe while vertical page scrolling remains available.
- Reduced motion: transitions are effectively disabled when requested by the operating system.

## Accessibility

- The carousel is a named region.
- Current position is announced as `N из total`.
- Every card has a meaningful action label.
- The active card uses `aria-current=true`.
- Controls have visible keyboard focus.
- Interactive side cards remain available to assistive technology.

## Responsive behaviour

- Desktop preserves all five visible positions when the viewport and eligible record count permit it.
- Compact mode keeps the hierarchy with reduced translations and card dimensions.
- Mobile supports swipe and explicit navigation controls.
- Geometry must remain contained by the carousel viewport and must not create horizontal page overflow.

## Failure behaviour

- Missing eligible cover: omit the invalid event; do not render a fake placeholder.
- Empty valid dataset: show `Главные события пока не опубликованы`.
- Broken production image is a release-blocking asset defect and must be recorded in `08_OPEN_ISSUES.md`.
- An API record with `mainEvent=false` is a release-blocking data-contract defect.

## Acceptance evidence

The block is accepted only when all applicable evidence exists:

1. frontend and backend production builds pass;
2. API payload confirms `status=PUBLISHED`, `mainEvent=true` and an eligible image for every rendered item;
3. API payload contains no more than five records, no duplicates and no ordinary-event fallback;
4. active records precede completed fallback records;
5. all rendered image URLs return `200` with an image content type;
6. desktop `1920×1080` screenshot is compared with approved Figma/PDF;
7. tablet and mobile interactions are verified, including swipe;
8. keyboard and reduced-motion behaviour are verified;
9. discrepancies and status are recorded in `08_OPEN_ISSUES.md` and the release acceptance checklist.