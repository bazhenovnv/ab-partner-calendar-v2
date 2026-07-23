# HEADER LOGO ASSET AUDIT

Stage 45.3.1 — 2026-07-12  
Repo: `bazhenovnv/ab-partner-calendar-v2`  
Figma reference node: `5893:346` (file `t7Vg797xBk263TgvZRrO12`)  
Figma spec: mark ~61.6×66.7px, Montserrat SemiBold 18.69px `#1E1E1E`

---

## Candidates

| Asset | Path | Natural Size | Content Size | Result |
|---|---|---|---|---|
| Frame 60.png | `project-assets/03_logo_frames/Frame 60.png` | 694×575 | 474×512 | REJECTED — oversized canvas; transparent margins L110 T31 R110 B32; forbidden per project rules |
| ab-logo-mark.png | `apps/frontend/public/ab-logo-mark.png` | 694×575 | 474×512 | REJECTED — identical to Frame 60.png (same file); using directly produces tiny rendered mark due to canvas waste |
| **ab-logo-mark-cropped.png** | `apps/frontend/public/ab-logo-mark-cropped.png` | **474×512** | 474×512 | **APPROVED** |

## Approved Asset

**`public/ab-logo-mark-cropped.png`**

- Created by: PIL `getbbox()` crop of Frame 60.png removing empty transparent margins
- Natural size: 474×512 px
- Content: black geometric "аб" monogram on white — confirmed matches Figma node `5893:346`
- Aspect ratio: 0.926 — matches Figma container 61.597×66.66 (ratio 0.925) within 0.1%
- Rendered display: `w-[62px] h-[67px] object-contain` → fills container without distortion
- File size: 8149 bytes

## Rejection Notes

- `Frame 60.png` / `ab-logo-mark.png`: canvas 694×575 with content only 474×512; at display 62×67 with `object-contain` the mark renders at ~42×46px (67% of container) leaving visible whitespace. Forbidden per project rules ("Использовать Frame 60.png запрещено").
- Figma direct download (`imgLogo5`): blocked by session egress proxy (`www.figma.com:443 → 403`).
