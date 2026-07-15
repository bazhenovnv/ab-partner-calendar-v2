# MAX import stabilization — 2026-07-16

## Sources of truth reviewed

- `docs/TZ_AB_Afisha_Buhgaltera_Claude.md`
- `docs/BUSINESS_RULES.md`
- `docs/ADR.md`
- Prisma schema and seed
- MAX import service/parser/API normalization
- backend Docker image and entrypoint
- production/staging Docker Compose
- production/staging Nginx configuration

## Required behaviour

1. Source channel: `MAX_SOURCE_CHANNEL_URL` / approved MAX channel from TZ.
2. Reconciliation: every hour in `Europe/Moscow`.
3. One MAX post equals one event.
4. Collection posts are not split automatically and go to `NEEDS_ATTENTION`.
5. `#Хит` sets `mainEvent=true`.
6. Publication requires title, date, time, image, format, direction, event link, city/online and price.
7. Missing speaker/address does not block publication.
8. Missing price defaults to `Бесплатно`.
9. Imported images are stored in the shared `uploads` volume and served under `/uploads/` in both production and staging.

## Audit findings

- The repository default branch contains an older MAX implementation that calls a deprecated API endpoint. The working implementation exists in commit `52d7702408afb4222c48c6dd47eec3bf4b1c3989` and later server-side changes.
- Static direction data existed only in Prisma seed. `prisma migrate deploy` does not run seed, so clean databases had an empty `Direction` table and every imported event failed the required-direction rule.
- Production Nginx served `/uploads/`, but staging Nginx did not. Imported images existed on disk and in the API response but returned 404 on `test.ab-event.pro`.
- Docker Compose `version` keys were obsolete and generated warnings.
- The correct Russian Trusted Root CA must be present in `apps/backend/certs/russian-trusted-root-ca.crt`; its subject and issuer must both be `Russian Trusted Root CA` and SHA-256 fingerprint must be `D2:6D:2D:02:31:B7:C3:9F:92:CC:73:85:12:BA:54:10:35:19:E4:40:5D:68:B5:BD:70:3E:97:88:CA:8E:CF:31`.

## Changes in this branch

- Idempotent migration seeds all required directions and hashtag mappings.
- Staging Nginx serves the shared `/uploads/` volume exactly like production.
- Obsolete Compose `version` keys removed.

## Deployment verification

```bash
# Static references
SELECT slug, name, "isActive" FROM "Direction" ORDER BY "sortOrder";

# MAX connection
node -e 'fetch("https://platform-api2.max.ru/me", {headers:{Authorization:process.env.MAX_BOT_TOKEN}}).then(async r=>console.log(r.status, await r.text())).catch(e=>{console.error(e,e.cause);process.exit(1)})'

# Public featured events
curl -ks https://test.ab-event.pro/api/events/public/main

# Imported image
curl -ksI https://test.ab-event.pro/uploads/events/<filename>-main.webp
```

Expected results: MAX `/me` returns 200, public main API returns published `#Хит` events, and imported images return HTTP 200 with `content-type: image/webp`.
