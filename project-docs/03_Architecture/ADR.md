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
