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

## ADR-010: BOT_INTERNAL_TOKEN for internal API security
Bot services (`apps/bots`) communicate with backend via internal API endpoints that must not be publicly accessible. A shared secret `BOT_INTERNAL_TOKEN` is passed as the `X-Bot-Internal-Token` HTTP header on all bot→backend write calls. Backend validates the header on: `POST /bots/users/*`, `POST /broadcasts/unsubscribe`, `POST /reminders`, `PATCH /reminders/:id/cancel`. If the token is not configured in the backend, it logs an error and returns HTTP 403 to prevent silent data writes. The token must be at least 32 characters and generated per-environment (never shared between prod/staging). It is documented in all `.env.example` files.

## ADR-012: Backend Docker entrypoint runs prisma migrate deploy on startup
The backend container runs `prisma migrate deploy` via `/docker-entrypoint.sh` before starting the Node.js process. This ensures the database schema is always up-to-date on every deploy without requiring a manual migration step. `prisma generate` is executed in the Dockerfile `runner` stage after `pnpm install --prod` so the Prisma Client is present in the production image. The entrypoint is idempotent: if no pending migrations exist, it exits immediately with no side-effects.

## ADR-011: Broadcast recipient eligibility requires explicit broadcast consent
To receive a mass broadcast, a BotUser must have `broadcastConsentAcceptedAt IS NOT NULL` in addition to `allowMarketingMessages=true` and `legalAcceptedAt IS NOT NULL`. This consent is recorded when the user accepts the legal notice with marketing enabled. This ensures no user receives marketing messages without having seen and accepted the broadcast consent document.

## ADR-013: nginx CSP and security header hardening
Content-Security-Policy is added at the nginx level (not in Next.js headers config) because all traffic passes through nginx in production, keeping the policy in one place. The policy uses `unsafe-inline` and `unsafe-eval` in `script-src` because Next.js App Router requires them for hydration inline scripts. `mc.yandex.ru` and `yastatic.net` are whitelisted for Yandex Metrika. `img-src https:` is used broadly to allow event images from external CDNs. The `default.conf` file is dev-only (HTTP, `server_name _`) and is explicitly NOT mounted in production — only `prod.conf` is mounted as `/etc/nginx/conf.d/default.conf` via docker-compose.prod.yml. The `test.ab-event.pro` vhost received HSTS (short max-age=3600) and Referrer-Policy to match production security posture.
