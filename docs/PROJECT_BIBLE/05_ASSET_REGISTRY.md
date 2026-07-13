# 05 — Asset Registry

## Rules
- Only registered approved assets may be used in final UI.
- Do not create replacement SVGs, AI images, stock art, gradients, or invented decorative assets.
- Missing approved assets are recorded in `08_OPEN_ISSUES.md`.
- Binary images must be validated as real binary files; base64 text stored with an image extension is invalid.

## Canonical naming scheme
Approved copies should be placed under:
- `project-assets/approved/desktop-1920/`
- `project-assets/approved/logos/`

| ID | Description | Canonical target path | Original/current source | Used by | Status | Notes |
|---|---|---|---|---|---|---|
| `VIS-HOME-1920` | Approved full desktop homepage | `project-assets/approved/desktop-1920/DESKTOP_1920_HOMEPAGE_APPROVED.pdf` | supplied `АБ Афиша main(6).pdf` | all homepage blocks | APPROVED_REFERENCE | Preserve original; copy only after binary-safe access |
| `VIS-HEADER-HERO` | Header + Hero crop | `project-assets/approved/desktop-1920/DESKTOP_1920_HEADER_HERO.png` | approved PDF/Figma | Header, Hero | TO_EXTRACT | No redraw |
| `VIS-CALENDAR` | Filters + Calendar crop | `project-assets/approved/desktop-1920/DESKTOP_1920_FILTERS_CALENDAR.png` | approved PDF/Figma | filters/calendar | TO_EXTRACT | Exact crop from approved source |
| `VIS-EVENT-CARDS` | Selected-day cards crop | `project-assets/approved/desktop-1920/DESKTOP_1920_EVENT_CARDS.png` | approved PDF/Figma | EventCard | TO_EXTRACT | Reference only; runtime uses real event covers |
| `VIS-MAIN-EVENTS` | Main Events carousel crop | `project-assets/approved/desktop-1920/DESKTOP_1920_MAIN_EVENTS_CAROUSEL.png` | approved PDF/Figma | MainEventsBanner | TO_EXTRACT | Five-card fan composition |
| `VIS-QUOTES` | Quotes section crop | `project-assets/approved/desktop-1920/DESKTOP_1920_QUOTES_SECTION.png` | approved PDF/Figma | RotatingQuotesBlock | TO_EXTRACT | Specific left/right people images; no substitutes |
| `VIS-FOOTER` | Footer crop | `project-assets/approved/desktop-1920/DESKTOP_1920_FOOTER.png` | approved PDF/Figma | SiteFooter | TO_EXTRACT | Stationery composition must match approved source |
| `ASSET-LOGO-AB` | Approved AB mark | `project-assets/approved/logos/LOGO_AB_MARK_APPROVED.png` | `project-assets/03_logo_frames/Frame 60.png` | Header, Footer | APPROVED_SOURCE | Current public target: `apps/frontend/public/ab-logo-mark-cropped.png`; must remain binary PNG |
| `ASSET-HERO` | Hero books/photo composition | current registered public/project asset | approved Figma/project asset | HeroSection | VERIFY | Do not regenerate or replace |
| `ASSET-QUOTE-LEFT` | Approved person — left (black outfit, heels, phone) | `apps/frontend/public/quote-person-left.png` | `Креативы АБ (8).zip` → `Desktop/1024/96144cad-8301-4b08-8cbd-2a3bb4728679 1 (1) (18) 1.png` | RotatingQuotesBlock | APPROVED_SOURCE | 181×217px RGBA PNG · SHA256: ccc28759a212644de9a8f1de4da244c4cfe5f3f8f1de1c75a6d6b52a75891dad · transparent bg · lower body only |
| `ASSET-QUOTE-RIGHT` | Approved person — right (brown pants, laptop) | `apps/frontend/public/quote-person-right.png` | `Креативы АБ (9).zip` → `Desktop/1024/96144cad-8301-4b08-8cbd-2a3bb4728679 1 (1) (13) 2.png` | RotatingQuotesBlock | APPROVED_SOURCE | 172×215px RGBA PNG · SHA256: f1f04edf7c74b43a0604089acc926d69d63728be8158c6539833922117c8eeef · transparent bg · lower body only |
| `ASSET-FOOTER-STATIONERY` | Notebook/pen/plant/cup composition | `apps/frontend/public/notebook-stationery.png` | `project-assets/04_creative_archives/Креативы АБ (19).zip` → `notebook_mint_transparent 1.png` | SiteFooter | APPROVED_SOURCE | 365×349px RGBA PNG · SHA256: 768202ee881272e2db74dbb5c5c61e1c289b809c038b4c367fa9b3ce1e78053e · transparent background · notebook + mint pen + plant + cup |
| `ASSET-EVENT-COVERS` | Approved event covers for staging demo | TBD from project assets/admin content | approved project assets | Event cards/carousel | MISSING_APPROVED_ASSET | No gradients or AB placeholders as final |

## Validation checklist
For each binary asset record:
- file path;
- dimensions;
- format;
- alpha/transparency;
- SHA256;
- HTTP status and content type after deploy;
- component usage;
- source approval.

## Old-to-new naming
All renames/copies must be recorded in `MIGRATION_MAP.md`. Originals are preserved until every reference is updated and validated.