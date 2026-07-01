# Project Changelog

## Stage 10 — Maintenance Page

- Backend `AdminModule`:
  - `GET /admin/site-status` (public, no auth) — возвращает `{ maintenanceEnabled, title, description, imageUrl }` из SiteConfig.
  - `AdminService.getSiteStatus()` — читает 4 ключа `maintenance.*` из SiteConfig.
  - Добавлено 4 ключа в `SETTINGS_KEYS`: `maintenance.enabled`, `maintenance.title`, `maintenance.description`, `maintenance.imageUrl`.
- Frontend Next.js middleware (`src/middleware.ts`):
  - Edge Runtime; вызывает `/api/admin/site-status` при каждом публичном запросе (кэш 30 с).
  - Если `maintenanceEnabled=true` — redirect на `/maintenance`.
  - Bypass-список: `/admin/*`, `/maintenance`, `/legal/*`, `/_next/*`, `/api/*`, `/favicon.ico`.
- New standalone page `/maintenance` (Server Component, `force-dynamic`):
  - Без Header, Footer и CookieBanner.
  - Показывает `maintenance.title`, `maintenance.description`, опционально `maintenance.imageUrl`.
- Admin settings page `/admin/settings`:
  - Добавлена группа **Техобслуживание** с 4 полями.
  - `GROUP_ORDER` расширен: `['Бот', 'Cookie', 'Рассылки', 'Техобслуживание']`.
- Seed: добавлены defaults для 4 ключей `maintenance.*`.
- `globals.css`: стили `.maint-page`, `.maint-image`, `.maint-title`, `.maint-description`.

Exposed maintenance settings:
| Ключ | Тип | Описание |
|---|---|---|
| `maintenance.enabled` | boolean | Включить режим техобслуживания |
| `maintenance.title` | text | Заголовок страницы |
| `maintenance.description` | text | Текст страницы |
| `maintenance.imageUrl` | text | URL изображения (опционально) |

## Stage 9 — Admin UI for Settings (SiteConfig)

- New backend endpoints in `AdminModule`:
  - `GET /admin/settings` — возвращает 9 exposed SiteConfig ключей (ADMIN JWT).
  - `PATCH /admin/settings/:key` — обновляет один ключ; неизвестные ключи отклоняются с 400.
- New frontend page `/admin/settings`:
  - Настройки сгруппированы: **Бот**, **Cookie**, **Рассылки**.
  - Boolean-поля — `<select>` (Включено / Выключено).
  - Number-поля — `<input type="number">`.
  - Text-поля — `<textarea>`.
  - Кнопка «Сохранить» активна только при изменении; inline-сообщение об успехе/ошибке.
- Sidebar: добавлена ссылка «Настройки».
- `admin-api.ts`: добавлен тип `SiteConfigRow`.
- `globals.css`: стили `.adm-settings-*`, `.adm-setting`, `.adm-input--num`, `.adm-select--sm`, `.adm-textarea--sm`.

Exposed settings:
| Ключ | Тип | Описание |
|---|---|---|
| `bot.phoneRequired` | boolean | Требовать телефон в боте |
| `cookie.noticeEnabled` | boolean | Показывать cookie-баннер |
| `cookie.noticeText` | text | Текст баннера |
| `cookie.buttonText` | text | Кнопка баннера |
| `broadcast.cooldownHours` | number | Cooldown между рассылками (ч) |
| `broadcast.telegramRatePerSecond` | number | Скорость Telegram |
| `broadcast.maxRatePerSecond` | number | Скорость MAX |
| `broadcast.maxRecipients` | number | Лимит получателей (0=∞) |
| `broadcast.allowSimultaneous` | boolean | Одновременные рассылки |

## Stage 8 — Admin UI for Legal Documents

- New admin section `/admin/legal`:
  - **List page** — таблица 5 документов: название, статус (черновик/опубликован), дата публикации, ссылка на публичную страницу.
  - **Detail/edit page** `/admin/legal/[type]` с тремя вкладками:
    - **Редактор** — поля «Заголовок» и «Содержимое (HTML)»; кнопки «Сохранить черновик» (`PATCH /legal/admin/:type`) и «Опубликовать версию» (`POST /legal/admin/:type/publish`).
    - **История версий** — таблица всех опубликованных версий с датами и автором; кнопка «Восстановить» загружает содержимое версии в редактор.
    - **Предпросмотр** — рендер HTML-содержимого редактора.
  - Предупреждение в редакторе: не изменять тексты без официального архива от юриста.
- `admin/layout.tsx` — добавлена ссылка «Документы» в sidebar.
- `lib/admin-api.ts` — добавлены типы `LegalDoc`, `LegalDocVersion`, `LegalDocType`.
- `globals.css` — добавлены стили `.adm-textarea--legal`, `.adm-legal-warning`, `.adm-legal-preview`.
- Placeholder-тексты документов **не изменены** (ждём официальный DOCX/PDF архив).

## Stage 7 — Critical production fixes

- **[BR-022 / race condition fix]** `enqueue()` now checks for active broadcasts across all three statuses: `SCHEDULED`, `QUEUED`, `SENDING` (previously only `QUEUED` + `SENDING`). Prevents two broadcasts starting simultaneously.
- **[BR-022 / allowSimultaneous]** `enqueue()` reads `broadcast.allowSimultaneous` from SiteConfig (default `false`). When `true`, the simultaneous-send check is skipped.
- **[BR-031 / broadcastConsentAcceptedAt]** `buildRecipients()` now requires `broadcastConsentAcceptedAt IS NOT NULL` in addition to `allowMarketingMessages=true` and `legalAcceptedAt IS NOT NULL`.
- **[BR-032 / maxRecipients]** `buildRecipients()` reads `broadcast.maxRecipients` from SiteConfig (default `0` = unlimited). When non-zero, limits recipients per broadcast.
- **[BR-033 / reminders security]** `POST /reminders` and `PATCH /reminders/:id/cancel` now require `X-Bot-Internal-Token` header (same pattern as `POST /bots/users/*`). Both Telegram and MAX bots already send this header.
- **[ENV]** Added `BOT_INTERNAL_TOKEN` to root `.env.example` (was already in `apps/backend/.env.example` and `apps/bots/.env.example`).
- **[Hashtags / BR-017]** Added missing hashtag→direction mappings: `#АУСН`, `#ПСН`, `#ОСНО`, `#НПД`, `#ЕСХН` → `['sno', 'taxes']`.
- **[Docs]** BUSINESS_RULES.md: updated BR-022, added BR-031, BR-032, BR-033. ADR.md: added ADR-010 (BOT_INTERNAL_TOKEN), ADR-011 (broadcast consent).

## Stage 6 — Admin UI for broadcasts

- New frontend admin section at `/admin`:
  - **`/admin/login`** — JWT login form (POST `/auth/login`, stores token in localStorage).
  - **`/admin/broadcasts`** — paginated list with status badges, channel, dates; cancel/delete inline actions.
  - **`/admin/broadcasts/new`** — create draft broadcast (POST `/broadcasts`).
  - **`/admin/broadcasts/[id]`** — detail page with:
    - Stats bar: total / pending / sent / failed / skipped.
    - Toolbar: test-send (adminChatId input), Schedule (blocked by BR-022 if no testSentAt), Cancel, Delete.
    - Warning banner if test-send not yet performed (BR-022).
    - Edit form for DRAFT broadcasts; read-only view for other statuses.
    - Recipients tab with paginated table (channel, username, externalId, status, reason, sentAt).
    - Logs tab with colour-coded level entries.
- Shared components: `StatusBadge`, `fmtDate`, `fmtDateTime` (`BroadcastsShared.tsx`);
  reusable `BroadcastForm` with fields title, messageText, channel, imageUrl, buttonText/URL, scheduledAt.
- Admin CSS design tokens appended to `globals.css` (`.adm-*` classes).
- API client `apps/frontend/src/lib/admin-api.ts` with JWT Bearer auth from localStorage.

## Stage 5 — Broadcasts backend foundation

- `BroadcastsModule` added to backend (`apps/backend/src/modules/broadcasts/`):
  - **CRUD**: `POST /broadcasts`, `GET /broadcasts`, `GET /broadcasts/:id`,
    `PATCH /broadcasts/:id`, `DELETE /broadcasts/:id` — ADMIN JWT.
  - **Lifecycle**: `POST /broadcasts/:id/test-send` (admin preview via Telegram),
    `POST /broadcasts/:id/schedule` (enqueue to Bull), `POST /broadcasts/:id/cancel`.
  - **Analytics**: `GET /broadcasts/:id/recipients`, `GET /broadcasts/:id/logs`.
  - **Unsubscribe**: `POST /broadcasts/unsubscribe` — bot-authenticated (X-Bot-Internal-Token);
    sets `BotUser.allowMarketingMessages = false` (BR-025). Service reminders unaffected (BR-026).
- **Bull queue** `broadcast` with processor `BroadcastProcessor`:
  - Builds `BroadcastRecipient` rows from eligible users (`allowMarketingMessages=true`,
    `legalAcceptedAt` not null, channel filter).
  - Applies 24 h cooldown per user before sending (BR-023, configurable via SiteConfig).
  - Rate limiting: Telegram 20 msg/s, MAX 10 msg/s (configurable, BR-024).
  - Sends directly via Telegram Bot API / MAX API from backend.
  - Updates recipient statuses (SENT / FAILED / SKIPPED) and writes BroadcastLog.
  - On completion: starts next QUEUED broadcast (BR-021).
- Test send required before scheduling (BR-022).
- `/unsubscribe` command added to Telegram and MAX bots — calls `POST /broadcasts/unsubscribe`.
- No frontend admin UI on this stage.

## Stage 4 — Bot first-start legal notice + phone flow

- Telegram bot (`apps/bots/src/telegram/bot.ts`):
  - First `/start` (plain or deep-link) upserts BotUser via `POST /bots/users/upsert`.
  - If `legalAcceptedAt` is null — shows legal notice (links to `/legal/privacy`, `/legal/terms`,
    `/legal/consent`; `/legal/broadcast-consent` if `allowMarketingMessages=true`) with inline
    button «Принимаю»; acceptance stored via `POST /bots/users/:id/accept-legal`.
  - If `bot.phoneRequired=true` and phone not set — requests phone via native contact-share
    keyboard button or manual +7XXXXXXXXXX input; stored via `POST /bots/users/:id/phone`.
  - Deep-link `remind_{eventId}` context preserved through legal/phone flow.
- MAX bot (`apps/bots/src/max/bot.ts`):
  - Same first-start legal notice and legal acceptance flow (text «Принимаю»).
  - Phone flow fallback: MAX does not support native contact-sharing buttons; user types phone
    number as plain text in +7XXXXXXXXXX format. Documented in console log at startup.
  - Deep-link `remind_{eventId}` context also preserved.
- Backend `BotsModule`:
  - `BotsService`: `upsertBotUser`, `acceptLegal`, `savePhone`, `isPhoneRequired`.
  - `BotsController`: `POST /bots/users/upsert`, `POST /bots/users/:id/accept-legal`,
    `POST /bots/users/:id/phone`, `GET /bots/config`.
  - `BotsModule` now imports `PrismaModule`.
- Seed: added `bot.phoneRequired` SiteConfig default (`false`).
- BotUser fields used: `phone`, `phoneVerifiedAt`, `legalAcceptedAt`, `broadcastConsentAcceptedAt`.

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
