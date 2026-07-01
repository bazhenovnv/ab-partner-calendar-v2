# Architecture Decision Log — АБ Афиша Бухгалтера

## ADR-001: Docker / Docker Compose
Use Docker Compose because the project includes frontend, backend, bots, PostgreSQL, Redis, Nginx and background jobs.

## ADR-002: Separate bots runtime service
`apps/bots` runs Telegram/MAX bots. Backend `modules/bots` manages admin/API settings, logs, users and reminders.

## ADR-003: test.ab-event.pro
Use `test.ab-event.pro` as the test environment. Production is `ab-event.pro`.

## ADR-004: MSK timezone
Use Moscow time (MSK UTC+3) as the base time for event and reminder scheduling.

## ADR-005: Maintenance page as standalone screen
Maintenance page must be minimal and independent: no main header and no footer, so users clearly see service status.

## ADR-006: Informational cookie notice for MVP
Cookie/analytics notice informs users and links to privacy policy. It does not disable Yandex Metrika by default unless explicit opt-out is implemented later.

## ADR-007: Bull/Redis queue for mass broadcasts
Mass broadcasts use Bull queue (already in stack) instead of cron, to support rate limiting, cooldown checks, parallel worker control and QUEUED state management. Service reminders remain on their existing `@Cron(EVERY_MINUTE)` cron and are never blocked by broadcast queue.

## ADR-008: Legal documents stored in database with versioning
Legal document content is stored in the database (LegalDocument model) to allow admin editing and version history. Pages `/legal/*` render content from the database. Static fallback content is seeded on first deploy.

## ADR-009: Marketing unsubscribe is separate from personal data withdrawal
`allowMarketingMessages = false` disables informational broadcasts only. Full personal data consent withdrawal is a separate legal process and is not handled by the bot unsubscribe action.
