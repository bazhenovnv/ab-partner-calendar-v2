# Document Inventory

This inventory classifies current canonical documents, active supplements and historical evidence. It must be updated whenever documentation is added, renamed or reclassified.

| Path / group | Purpose | Status | Authority | Action |
|---|---|---|---:|---|
| `README.md` | Repository entry point | CANONICAL_ENTRY | Medium | Point to PROJECT_BIBLE and current facts |
| `docs/PROJECT_BIBLE/README.md` | PROJECT_BIBLE navigation and workflow | CANONICAL_ENTRY | High | Keep links and numbering current |
| `docs/PROJECT_BIBLE/00_SOURCE_OF_TRUTH.md` | Conflict resolution and authority hierarchy | CANONICAL | Highest docs | First-read document |
| `docs/PROJECT_BIBLE/01_PROJECT_OVERVIEW.md` | Repository, domains, server, contacts and stack | CANONICAL | High | Update on environment changes |
| `docs/PROJECT_BIBLE/02_DESIGN_SYSTEM.md` | Visual rules and prohibitions | CANONICAL | High | Update only after approved design decisions |
| `docs/PROJECT_BIBLE/03_HOMEPAGE_STRUCTURE.md` | Homepage block order and source map | CANONICAL | High | Update when active structure changes |
| `docs/PROJECT_BIBLE/04_CALENDAR_SPEC.md` | Filters, calendar and selected-day card specification | CANONICAL | High | Use for current calendar work |
| `docs/PROJECT_BIBLE/05_ASSET_REGISTRY.md` | Approved assets and validation state | CANONICAL | High | Register every approved runtime/reference asset |
| `docs/PROJECT_BIBLE/06_DEPLOYMENT_CURRENT.md` | Current build/deploy procedure | CANONICAL | High | Supersedes historical deployment snippets |
| `docs/PROJECT_BIBLE/07_DOCUMENT_USAGE_GUIDE.md` | Required documentation workflow | CANONICAL | High | Maintain with governance changes |
| `docs/PROJECT_BIBLE/08_OPEN_ISSUES.md` | Current unresolved work only | CANONICAL | High | Remove resolved/superseded rows; close only with evidence |
| `docs/PROJECT_BIBLE/09_PAGE_CANVAS_AND_SCALE.md` | Desktop canvas, widths, scale and background rules | CANONICAL | High | Change only from approved measurements |
| `docs/PROJECT_BIBLE/09B_RELEASE_ACCEPTANCE_CHECKLIST.md` | Stage and release acceptance gate | CANONICAL | High | Record evidence requirements and stage status |
| `docs/PROJECT_BIBLE/10_MAIN_EVENTS_CAROUSEL_SPEC.md` | Main Events data, asset, layout and interaction contract | CANONICAL | High | Update when accepted carousel contract changes |
| `docs/PROJECT_BIBLE/11_DESIGN_PHASE_WORKFLOW.md` | Design implementation and approval workflow | CANONICAL | High | Maintain Git and approval process |
| `docs/PROJECT_BIBLE/12_DESIGN_AUDIT_2026-07.md` | Point-in-time homepage audit baseline | CURRENT_AUDIT_EVIDENCE | Below canonical specs | Do not use to override later accepted specifications |
| `docs/PROJECT_BIBLE/DOCUMENT_INVENTORY.md` | Documentation classification | CANONICAL_GOVERNANCE | Medium/High | Update on discovery or reclassification |
| `docs/PROJECT_BIBLE/DOCUMENT_CONFLICT_MATRIX.md` | Known conflicts and winning sources | CANONICAL_GOVERNANCE | Medium/High | Update together with the corrected canonical document |
| `docs/PROJECT_BIBLE/MIGRATION_MAP.md` | File and asset rename/move history | CANONICAL_GOVERNANCE | Medium | Update before and after moves |
| `docs/BUSINESS_RULES.md` | Functional business rules BR-001+ | CANONICAL_FUNCTIONAL | High | Single functional behaviour source below PROJECT_BIBLE |
| `docs/ADR.md` | Architecture decisions | CANONICAL_ARCHITECTURE | High | Preserve decision meaning and supersession history |
| `docs/TZ_AB_Afisha_Buhgaltera_Claude.md` | Main implementation TZ | ACTIVE_SUPPLEMENT / PARTLY HISTORICAL | Below PROJECT_BIBLE | Preserve history; reconcile conflicts through matrix |
| `docs/TZ_AB_Afisha_Buhgaltera_Claude.txt` | Text duplicate of main TZ | DUPLICATE_SUPPLEMENT | Low | Mark generated/synchronized or deprecate |
| `docs/TZ_AB_Afisha_Buhgaltera_customer.md` | Customer-facing TZ | ACTIVE_SUPPLEMENT | Medium | Not primary engineering source when less precise |
| `docs/TZ_v7_additions.md`–`TZ_v11_*.md` | Approved requirement additions | ACTIVE_SUPPLEMENT | Medium/High | Newer approved addition wins over older conflicting TZ |
| `docs/CHANGELOG.md` | Historical change log | HISTORICAL_LOG | Low | Never use as specification |
| `docs/PROJECT_BIBLE/STAGE_*.md` | Stage execution reports | HISTORICAL_EVIDENCE | Low | Add historical status when audited |
| `docs/PROJECT_BIBLE/*_AUDIT.md` and dated audit files | Point-in-time audits | HISTORICAL/CURRENT_EVIDENCE | Low/Medium | Current canonical specs and new evidence win |
| `docs/PROJECT_BIBLE/*_REPORT.md` | Point-in-time reports | HISTORICAL_EVIDENCE | Low | Completion claims are non-authoritative |
| `docs/deployment/`, `docs/DEPLOY.md`, `docs/OPERATIONS.md` | Deployment history/instructions | ACTIVE + HISTORICAL MIX | Medium | Current procedure is `06_DEPLOYMENT_CURRENT.md` |
| `project-config/` | Environment examples and contact config | ACTIVE_CONFIG_DOCS | Medium | No secrets; align domains and email |
| `project-assets/` | Design references and source assets | ACTIVE + ARCHIVE MIX | High for approved assets | Normalize through registry and migration map |

## Classification rules

- `CANONICAL`: one active source per topic.
- `CANONICAL_*`: active source for a specific governance/functional/architecture area.
- `ACTIVE_SUPPLEMENT`: valid only below canonical documents.
- `CURRENT_AUDIT_EVIDENCE`: current point-in-time evidence, not a specification.
- `HISTORICAL_EVIDENCE`: useful history, never current authority.
- `DUPLICATE`: must point to its generated/source document.
- `CONFLICTING`: must be listed in the conflict matrix.
- `ARCHIVE_CANDIDATE`: preserve until references are migrated and verified.

## Remaining inventory work

Search and classify every `STAGE_*`, `*_AUDIT`, `*_REPORT`, `DESIGN_*`, `FIGMA_*`, `CALENDAR_*`, `HEADER_*`, `HERO_*`, `FOOTER_*`, `ASSET_*` and `RELEASE_*` document. Do not delete historical files during classification.