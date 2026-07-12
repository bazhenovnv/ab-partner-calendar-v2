# Document Conflict Matrix

| Topic | Document A / statement | Document B / statement | Winning source | Correction |
|---|---|---|---|---|
| Repository | Current work sometimes references `ab-partner-calendar` | Current project is `ab-partner-calendar-v2` | `00_SOURCE_OF_TRUTH.md` | Old repo is historical/forbidden for current work |
| VPS IP | Main TZ lists `77.232.136.248` as production VPS | README/current deployment uses `5.129.243.179` | current infrastructure + ADR-014 | Mark old IP historical; use current IP only in deployment docs |
| Runtime IP usage | Old docs contain literal server IP | ADR-014 requires domain-first runtime | ADR-014 | Runtime must use domains; IP only in deployment documentation |
| Contact email | Approved visual reference may show legacy address | Current requirements use `info-event@a-b.ru` | BUSINESS_RULES BR-014 + current TZ additions | Runtime and legal docs use `info-event@a-b.ru`; visual legacy content is not copied |
| Hero CTA | Some reports/code use `Главные события`/other labels | Approved reference uses `Важные события →` | approved design + canonical design docs | Hero CTA fixed to `Важные события →` |
| Carousel title | Older wording may use `Важные события` | Main section is `Главные события` | current TZ + approved design | Keep `Главные события` only for carousel heading |
| Completed status | Legacy wording `Проведено` | BR-009 requires `Завершено` | BUSINESS_RULES | Use `Завершено` everywhere |
| Design completion | Historical reports state `97%`, `complete`, `pixel-perfect` | Current staging visibly differs from approved design | approved design + current staging | Treat reports as historical evidence only |
| Frontend build | Some instructions say `docker compose build frontend` | Current compose has image references without frontend `build:` | actual compose/Docker architecture | Use direct `docker build -f apps/frontend/Dockerfile ...` |
| Images | Stage work created custom SVGs/gradients/placeholders | User rule requires only approved assets | approved design + asset registry | Remove invented assets; mark missing approved assets |
| Missing event image | UI may show AB/gradient placeholder | BR-005 says missing image blocks publication | BUSINESS_RULES | Do not publish/finalize cards without approved image |
| Main events membership | Ad hoc display logic | BR-001/BR-002 define `#Хит` and `mainEvent` | BUSINESS_RULES | Main carousel uses `mainEvent=true` only |
| Legal pages | Older TZ may list fewer pages | BR-027 requires five legal routes | BUSINESS_RULES v11 | Footer and site expose all five routes |
| Calendar heading | Implementations may omit year | BR-019 requires month + year | BUSINESS_RULES | Always render month and year |
| Dropdown arrow | Custom decorative arrow behaviour | BR-020 defines open/closed rotation | BUSINESS_RULES | Use state-only chevron behaviour |

## Status
This matrix records known conflicts confirmed during governance reset. A full repository inventory may add more entries. No conflict should be resolved silently; update this table and the canonical document together.