# Migration Map

No original file is deleted until every reference is updated and validated.

| Old path/name | Canonical target | Action | Reason | References updated | Status |
|---|---|---|---|---|---|
| `АБ Афиша main(6).pdf` (supplied reference) | `project-assets/approved/desktop-1920/DESKTOP_1920_HOMEPAGE_APPROVED.pdf` | binary-safe copy, preserve original | clear approved reference name | pending | PLANNED |
| `project-assets/03_logo_frames/Frame 60.png` | `project-assets/approved/logos/LOGO_AB_MARK_APPROVED.png` | binary-safe copy, preserve original | clear logo source name | registry created | PLANNED |
| `Frame 60(1).png` and logo duplicates | archive or alias after hash comparison | compare SHA/dimensions first | avoid ambiguous duplicate assets | pending | AUDIT_REQUIRED |
| UUID/Figma-hash header screenshots | `DESKTOP_1920_HEADER_HERO.png` | copy exact approved reference/crop | easy navigation | pending | PLANNED |
| UUID/Figma-hash calendar screenshots | `DESKTOP_1920_FILTERS_CALENDAR.png` | copy exact approved reference/crop | easy navigation | pending | PLANNED |
| UUID/Figma-hash event screenshots | `DESKTOP_1920_EVENT_CARDS.png` | copy exact approved reference/crop | easy navigation | pending | PLANNED |
| UUID/Figma-hash carousel screenshots | `DESKTOP_1920_MAIN_EVENTS_CAROUSEL.png` | copy exact approved reference/crop | easy navigation | pending | PLANNED |
| UUID/Figma-hash quote screenshots | `DESKTOP_1920_QUOTES_SECTION.png` | copy exact approved reference/crop | easy navigation | pending | PLANNED |
| UUID/Figma-hash footer screenshots | `DESKTOP_1920_FOOTER.png` | copy exact approved reference/crop | easy navigation | pending | PLANNED |
| historical `STAGE_*.md` completion reports | retain current path or move to `docs/archive/stages/` after link audit | add historical header first | prevent use as current specification | pending | AUDIT_REQUIRED |
| historical `*_AUDIT.md` / `*_REPORT.md` | retain or archive after classification | preserve content and add status | separate evidence from canonical specs | pending | AUDIT_REQUIRED |

## Required validation before any move
1. Compare hashes/dimensions.
2. Confirm approved source.
3. Create canonical binary-safe copy.
4. Update registry and all Markdown/code references.
5. Search repository for old path.
6. Verify build and asset HTTP status if runtime asset.
7. Only then archive the original; do not delete history.