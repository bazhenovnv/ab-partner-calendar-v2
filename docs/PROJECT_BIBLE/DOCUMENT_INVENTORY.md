# Document Inventory

This inventory establishes the initial classification. It must be expanded whenever additional documents are discovered.

| Path / group | Purpose | Status | Authority | Action |
|---|---|---|---:|---|
| `README.md` | Repository entry point | CANONICAL_ENTRY | Medium | Point to PROJECT_BIBLE and current facts |
| `docs/PROJECT_BIBLE/00_SOURCE_OF_TRUTH.md` | Conflict resolution and authority hierarchy | CANONICAL | Highest docs | Maintain as first-read document |
| `docs/PROJECT_BIBLE/01_PROJECT_OVERVIEW.md` | Current repository, domains, server, contacts, stack | CANONICAL | High | Update on environment changes |
| `docs/PROJECT_BIBLE/02_DESIGN_SYSTEM.md` | Current visual rules and prohibitions | CANONICAL | High | Update only on approved design change |
| `docs/PROJECT_BIBLE/03_HOMEPAGE_STRUCTURE.md` | Homepage block order and source map | CANONICAL | High | Update when active page structure changes |
| `docs/PROJECT_BIBLE/04_CALENDAR_SPEC.md` | Calendar/filter/cards specification | CANONICAL | High | Use for current calendar work |
| `docs/PROJECT_BIBLE/05_ASSET_REGISTRY.md` | Approved design assets and missing asset tracking | CANONICAL | High | Register every approved asset |
| `docs/PROJECT_BIBLE/06_DEPLOYMENT_CURRENT.md` | Current build/deploy instructions | CANONICAL | High | Supersedes old deploy snippets |
| `docs/PROJECT_BIBLE/07_DOCUMENT_USAGE_GUIDE.md` | Required developer workflow | CANONICAL | High | Mandatory process document |
| `docs/PROJECT_BIBLE/08_OPEN_ISSUES.md` | Current unresolved work only | CANONICAL | High | Close only with evidence |
| `docs/BUSINESS_RULES.md` | Functional business rules BR-001+ | CANONICAL_FUNCTIONAL | High | Single source for functional behaviour |
| `docs/ADR.md` | Architecture decisions | CANONICAL_ARCHITECTURE | High | Reorder IDs; preserve decision meaning |
| `docs/TZ_AB_Afisha_Buhgaltera_Claude.md` | Main implementation TZ | ACTIVE_SUPPLEMENT / PARTLY HISTORICAL | Below PROJECT_BIBLE | Correct current server note; preserve history |
| `docs/TZ_AB_Afisha_Buhgaltera_Claude.txt` | Text duplicate of main TZ | DUPLICATE_SUPPLEMENT | Low | Keep synchronized or mark generated copy |
| `docs/TZ_AB_Afisha_Buhgaltera_customer.md` | Customer-facing TZ | ACTIVE_SUPPLEMENT | Medium | Do not use as engineering source when less precise |
| `docs/TZ_v7_additions.md`–`TZ_v11_*.md` | Approved requirement additions | ACTIVE_SUPPLEMENT | Medium/High | Newer addition wins over older conflicting TZ |
| `docs/CHANGELOG.md` | Historical change log | HISTORICAL_LOG | Low | Never use as specification |
| `docs/PROJECT_BIBLE/STAGE_*.md` | Stage execution reports | HISTORICAL_EVIDENCE | Low | Add historical status when audited |
| `docs/PROJECT_BIBLE/*_AUDIT.md` | Point-in-time audits | HISTORICAL_EVIDENCE unless explicitly current | Low | Current screenshot/spec wins |
| `docs/PROJECT_BIBLE/*_REPORT.md` | Point-in-time reports | HISTORICAL_EVIDENCE | Low | Completion claims are non-authoritative |
| `docs/deployment/` and `docs/DEPLOY.md`/`OPERATIONS.md` | Deployment history/instructions | ACTIVE + HISTORICAL MIX | Medium | Current procedure is `06_DEPLOYMENT_CURRENT.md` |
| `project-config/` | Environment examples and contact config | ACTIVE_CONFIG_DOCS | Medium | No secrets; align email/domains |
| `project-assets/` | Design references and source assets | ACTIVE + ARCHIVE MIX | High for approved assets | Normalize via registry and migration map |

## Classification rules
- `CANONICAL`: one active source per topic.
- `ACTIVE_SUPPLEMENT`: valid only below canonical documents.
- `HISTORICAL_EVIDENCE`: useful history, never current authority.
- `DUPLICATE`: must point to its generated/source document.
- `CONFLICTING`: must be listed in conflict matrix.
- `ARCHIVE_CANDIDATE`: preserve until references are migrated and verified.

## Next inventory pass
Search and classify every `STAGE_*`, `*_AUDIT`, `*_REPORT`, `DESIGN_*`, `FIGMA_*`, `CALENDAR_*`, `HEADER_*`, `HERO_*`, `FOOTER_*`, `ASSET_*`, and `RELEASE_*` document. Do not delete any file during classification.