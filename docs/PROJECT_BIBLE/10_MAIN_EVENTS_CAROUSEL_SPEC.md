# 10 — Main Events Carousel Specification

## Purpose

Canonical implementation and acceptance rules for the `Главные события` carousel.

## Authority

Visual geometry is verified against the approved Figma node and approved desktop PDF. This specification defines the runtime and asset contract and must not be used to override measured approved geometry.

## Active implementation

- Component: `apps/frontend/src/components/events/MainEventsBanner.tsx`
- Styles: `apps/frontend/src/components/events/main-events-carousel.module.css`
- Data source: `GET /api/events/public/main`
- Event eligibility: published event with `mainEvent=true`
- Maximum API result: five events
- The API must never substitute ordinary events with `mainEvent=false`

## API selection contract

1. The endpoint returns only records with `status=PUBLISHED` and `mainEvent=true`.
2. Active featured events (`PLANNED`, `LIVE`) have priority and are ordered by `sortOrder`, then `startDate`.
3. When no active featured events exist, the endpoint may return the latest completed featured events, but the `mainEvent=true` condition remains mandatory.
4. Ordinary completed events must never be promoted implicitly to fill five positions.
5. The response contains at most five records.
6. If fewer than five eligible records exist, the carousel renders the available count without invented or duplicated cards.

## Image contract

1. Every public main event must contain a dedicated `images[0].mainEventUrl`.
2. The carousel must not fall back to `originalUrl`, `eventCardUrl`, `thumbnailUrl`, gradients or invented artwork.
3. A main event without `mainEventUrl` is not rendered in the public carousel and must be returned to the administration workflow as requiring attention.
4. The approved carousel cover is a square asset with the complete approved composition and safe zones already applied.
5. Runtime presentation uses `object-fit: cover`; therefore text, logos and faces must remain inside the approved safe zone.
6. Every production asset must be registered in `05_ASSET_REGISTRY.md` with path, dimensions, format, SHA256 and source approval.
7. Required HTTP verification: `200` and an image content type.

## Five-card 3D composition

The visible desktop state contains, when at least five eligible events exist:

- one active centre card;
- one near card on each side;
- one outer card on each side.

The centre card is front-facing and dominant. Side cards use mirrored combinations of:

- horizontal translation;
- small vertical offset;
- negative Z translation;
- `rotateY` depth angle;
- subtle `rotateZ` fan angle;
- reduced scale, brightness and opacity;
- lower stacking order.

The composition must remain symmetrical. It must not use root scaling or CSS zoom.

## Interaction

- Click active card: open event modal.
- Click side card: make it active.
- Previous/next buttons: move by one event with circular wrapping.
- Dots: one dot per event; selecting a dot activates that event.
- Keyboard: Left, Right, Home and End.
- Pointer/touch: horizontal swipe; vertical page scrolling remains available.
- Reduced motion: transitions are effectively disabled when requested by the operating system.

## Accessibility

- The carousel is a named region.
- Current event position is announced as `N из total`.
- Every card has a meaningful action label.
- The active card uses `aria-current=true`.
- Controls have visible keyboard focus.
- Side cards remain available to assistive technology because they are interactive.

## Responsive behaviour

- Desktop preserves all five visible positions where viewport width permits and where five eligible events exist.
- Compact mode keeps the 3D hierarchy with reduced translations and card dimensions.
- Mobile supports swipe and navigation controls.
- Geometry is contained by the carousel viewport and must not create horizontal page overflow.

## Failure behaviour

- Missing dedicated cover: omit the invalid event from the carousel; do not render a fake placeholder.
- Empty valid dataset: show the neutral message `Главные события пока не опубликованы`.
- Broken production image is a release-blocking asset defect and must be recorded in `08_OPEN_ISSUES.md`.
- An API record with `mainEvent=false` is a release-blocking data-contract defect.

## Acceptance evidence

The block is accepted only when all evidence exists:

1. frontend and backend production builds pass;
2. API payload confirms `mainEvent=true` and dedicated `mainEventUrl` for every rendered item;
3. API payload contains no more than five records and no ordinary-event fallback;
4. all cover URLs return `200` with image content type;
5. desktop 1920×1080 screenshot is compared with approved Figma/PDF;
6. tablet and mobile interactions are verified, including swipe;
7. keyboard and reduced-motion behaviour are verified;
8. discrepancies and final status are recorded in `08_OPEN_ISSUES.md` and the release acceptance checklist.
