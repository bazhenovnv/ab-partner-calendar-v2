# Project Changelog

## Stage 3 — Cookie Banner

- Frontend `CookieBanner` client component (`src/components/CookieBanner.tsx`):
  - Shows on first visit; hidden after user clicks «Понятно».
  - State persisted in `localStorage` (`cookie_notice_accepted`).
  - Links to `/legal/privacy` and `/legal/cookies`.
  - Desktop: compact fixed bottom bar; mobile 390px: full-width stacked layout with safe-area padding.
  - Keyboard accessible (`focus-visible` outline on button).
  - Yandex.Метрика remains active — banner is informational only (BR-016, ADR-006).
- Backend seed: added `cookie.noticeEnabled`, `cookie.noticeText`, `cookie.buttonText` SiteConfig defaults.
- CSS for banner added to `globals.css`.
- `CookieBanner` rendered in root `layout.tsx`.

## Stage 2 — Legal module + public legal pages

- Backend `LegalModule` fully implemented:
  - `GET /api/legal` — list all documents
  - `GET /api/legal/:type` — get document by type (public)
  - `PATCH /api/legal/admin/:type` — update title/content as draft (ADMIN only)
  - `POST /api/legal/admin/:type/publish` — publish new version with `publishedAt`, saves to `LegalDocVersion` history (ADMIN only)
  - `GET /api/legal/admin/:type/versions` — list version history (ADMIN only)
- Frontend: 5 legal pages under `/legal/[slug]` (SSG, revalidate 1h):
  - `/legal/privacy`, `/legal/terms`, `/legal/consent`, `/legal/cookies`, `/legal/broadcast-consent`
- Each page fetches content from backend at build/revalidation; shows inline fallback message if API is unavailable.
- Footer on home page contains links to all 5 legal documents (BR-027).
- Legal page footer also links to all 5 documents.
- Added `src/lib/legal.ts` in frontend: `LEGAL_LINKS`, `SLUG_TO_TYPE`, `FALLBACK_CONTENT`, `fetchLegalDoc`.
- CSS for legal pages added to `globals.css` (desktop + mobile 390px).

## Stage 1 — Legal/Core schema preparation

- Extended `LegalDocType` enum: added `COOKIE_POLICY` and `BROADCAST_CONSENT`.
- Added `LegalDocVersion.publishedAt` — each version now stores its publication date.
- Extended `BotUser` with: `phone`, `phoneVerifiedAt`, `allowMarketingMessages` (default true), `allowServiceNotifications` (default true), `legalAcceptedAt`, `broadcastConsentAcceptedAt`.
- Added `BroadcastStatus`, `BroadcastChannel`, `BroadcastRecipientStatus` enums.
- Added `Broadcast`, `BroadcastRecipient`, `BroadcastLog` models (schema foundation; no sending logic yet).
- Added migration `20260701200000_legal_core_schema`.
- Seed: added `COOKIE_POLICY` and `BROADCAST_CONSENT` legal docs with placeholder content.
- Seed: added broadcast SiteConfig defaults (enabled=false, Telegram rate 20/s, MAX rate 10/s, cooldown 24h, testSendRequired=true).
- Shared types: added `LegalDocType`, `BroadcastStatus`, `BroadcastChannel`, `BroadcastRecipientStatus`.

## v11

- Added five legal document pages: `/legal/privacy`, `/legal/terms`, `/legal/consent`, `/legal/cookies`, `/legal/broadcast-consent`.
- Footer must link to all five legal documents (at minimum the first four).
- Cookie banner must link to `/legal/privacy` and optionally `/legal/cookies`.
- Bot first-start legal notice must reference all relevant documents including broadcast consent when marketing broadcasts are enabled.
- Admin must be able to edit and version legal documents; each version stores publication date; previous versions are kept.
- Legal documents must cover all data categories: cookies, IP, device/browser, Telegram/MAX IDs, phone (if enabled), reminders, broadcast consent flag, broadcast delivery stats, admin action logs.
- Marketing unsubscribe is not personal data consent withdrawal; they are separate processes.
- Legal package DOCX/PDF files prepared externally for lawyer review.

## v10

- Added mass broadcast subsystem for Telegram and MAX.
- New admin section `/admin/broadcasts` (Рассылки) with subsections: all broadcasts, create, queue, history, analytics, settings.
- Supported channels: Telegram, MAX, Telegram + MAX.
- Audience targeting: all users, Telegram only, MAX only, allowMarketingMessages=true, users with reminders, by city/region (later), by direction (later), by registration period.
- Broadcast statuses: DRAFT, SCHEDULED, QUEUED, SENDING, PAUSED, SENT, FAILED, CANCELLED.
- Test send to admin required before mass send; mass send button disabled without it.
- Only one broadcast can send at a time; next goes to QUEUED.
- Default rate limits: Telegram 20 msg/sec, MAX 10 msg/sec (admin-configurable).
- Default cooldown: 1 mass broadcast per user per 24 hours (admin-configurable: 6/12/24/48/72h or custom; can be disabled).
- Every broadcast must include unsubscribe action; unsubscribe sets `allowMarketingMessages = false`.
- Service reminders are not affected by marketing unsubscribe.
- BotUser gains `allowMarketingMessages` and `allowServiceNotifications` flags.
- Analytics per broadcast: recipients, queued, sent, delivered, failed, skipped by cooldown, skipped unsubscribed, bot blocked, errors, unsubscribe count, startedAt, completedAt.
- Business rules added: BR-021 to BR-026.

## v9

- Added cookie and analytics notice requirements.
- Added admin control for cookie notice.
- Legal documents must mention cookies, Yandex Metrika and internal analytics.

## v8

- Added minimal standalone maintenance page without header/footer.
- Added admin settings for maintenance page.
- Reminder date/time selection clarified: only inside Telegram/MAX bot after messenger selection.
- Contact email changed to `info-event@a-b.ru`.
- Legal documents placement on site and bots clarified.
- Status wording changed: `Завершено` instead of `Проведено`.
- Extended tax hashtag mapping.

## v7

- Test domain set to `test.ab-event.pro`.
- Dropdown chevron animation defined.
- Calendar header must show month and year.
- Development workflow: do not merge PR if backend build/typecheck fails.
