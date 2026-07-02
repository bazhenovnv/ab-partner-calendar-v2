# Project Changelog

## Stage 21 — Nginx Production Hardening (MIN-1, MIN-5)

### `infra/nginx/conf.d/prod.conf`
- Добавлен `Content-Security-Policy` в main vhost (`ab-event.pro`): `default-src 'self'`, `script-src` с `unsafe-inline`/`unsafe-eval` и Яндекс.Метрика (`mc.yandex.ru`, `yastatic.net`), `img-src https:` для внешних изображений, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`.
- Добавлен `Content-Security-Policy` в test vhost (`test.ab-event.pro`) — идентичный main.
- Добавлен `Strict-Transport-Security "max-age=3600"` в test vhost (ранее отсутствовал).
- Добавлен `Referrer-Policy "strict-origin-when-cross-origin"` в test vhost (ранее отсутствовал).

### `infra/nginx/conf.d/default.conf`
- Добавлен явный комментарий: файл предназначен только для локальной разработки (HTTP, `server_name _`). В production не монтируется.

### `docs/ADR.md`
- Добавлен ADR-013: решение по CSP на уровне nginx и разделению dev/prod конфигов.

## Stage 20 — Broadcast MAX Compatibility (MED-1)

### `apps/backend/src/modules/broadcasts/broadcasts.service.ts`
- Добавлен `buildTelegramMessage()` — HTML-форматирование: кнопка как `<a href>`.
- Добавлен `buildMaxMessage()` — plain text: кнопка как `{label}: {url}` без HTML-тегов.
- Метод `buildMessageText()` сохранён как deprecated-обёртка над `buildTelegramMessage()` для обратной совместимости.
- `testSend()` явно использует `buildTelegramMessage()` (тест всегда в Telegram admin).

### `apps/backend/src/modules/broadcasts/broadcast.processor.ts`
- Убран единый `fullText` с HTML-тегами для всех каналов.
- Перед циклом рассылки строятся два отдельных текста: `telegramText` (HTML + `<i>` footer) и `maxText` (plain text + plain footer).
- В цикле выбирается `text = recipient.channel === 'MAX' ? maxText : telegramText`.
- Unsubscribe footer (BR-025): Telegram — `<i>...</i>`, MAX — plain text без тегов.

## Stage 19 — Fix Reminder Dispatch (CRIT-1)

### `apps/backend/src/modules/reminders/reminders.service.ts`
- Реализован реальный dispatch напоминаний в `processDueReminders()`.
- Для каждого due reminder: получаем `botUser.channel` и `botUser.externalId` из include; формируем текст сообщения с названием мероприятия, датой начала (МСК) и ссылкой на страницу.
- Telegram: отправка через `https://api.telegram.org/botTOKEN/sendMessage` с `parse_mode: HTML`; токен из `TELEGRAM_BOT_TOKEN`.
- MAX: отправка через `https://api.max.ru/v1/messages` с `Authorization: Bearer TOKEN`; plain-text (без HTML-тегов); токен из `MAX_BOT_TOKEN`.
- При успехе: `markSent(id)`. При ошибке: `markFailed(id, reason)` + лог; ошибка одного напоминания не останавливает остальные.
- Добавлен `formatMsk()` хелпер для форматирования дат в UTC+3.
- Удалён устаревший комментарий "dispatch handled by bots polling".

## Stage 17 — Production UI Polish

### `apps/frontend/src/app/events/[id]/loading.tsx`
- Скелетон обновлён под Stage 16 layout: статус-бейдж, info-карточка (3-col + строки), мобильные CTA кнопки.

### `apps/frontend/src/components/events/EventDetailActions.tsx`
- Добавлен `tablet:flex-row tablet:flex-wrap` — кнопки выстраиваются в ряд на планшете/десктопе.

### `apps/frontend/src/components/events/EventCard.tsx`
- Добавлен `active:scale-[0.99] active:shadow-base` для тактильного отклика на мобайле.

### `apps/frontend/src/components/events/EventsSection.tsx`
- `EmptyState`: добавлена кнопка «Сбросить все фильтры» (сбрасывает фильтры и выбранную дату).
- Кнопки пагинации: добавлены `active:bg-date-hover/70`.

### `apps/frontend/src/components/events/MainEventsBanner.tsx`
- Dot-навигация: кнопки теперь имеют touch-area 32×32px, добавлен `active:bg-white/90`.

### `apps/frontend/src/components/layout/SiteHeader.tsx`
- «Стать партнёром»: доступна на всех разрешениях (на 390px — только иконка, текст скрыт); добавлен `active:bg-mint/35` и `aria-label`.

### `apps/frontend/src/app/error.tsx`
- Кнопки `w-full mobile:w-auto` для корректного вида на 390px; добавлен `active:` state.

### `apps/frontend/src/app/events/[id]/not-found.tsx`
- Кнопка `w-full mobile:w-auto` для 390px.

### `apps/frontend/src/app/globals.css`
- `.legal-back`: добавлен `focus-visible` outline.

### `apps/frontend/src/app/maintenance/page.tsx`
- `<img>`: добавлен `eslint-disable` комментарий (intentional — URL из настроек админки); добавлены `width`/`height` атрибуты.


## Stage 16 — Mobile Event Page 390px

### `apps/frontend/src/app/events/[id]/page.tsx`
- Статус-бейдж над изображением: «Идёт сейчас» (с pulse-анимацией) / «Запланировано» / «Завершено» из `event.autoStatus`.
- Hero-изображение 16:9 с blur-placeholder и `rounded-2xl`.
- Краткое описание перед info-карточкой (видно на мобайле сразу под заголовком).
- Info-карточка: 3-колоночный grid (Дата / Время / Стоимость) с SVG-иконками и разделителями; строки Формат, Адрес (офлайн-только), Спикер.
- CTA вынесены в новый компонент `EventDetailActions`.
- Полное описание после CTA.

### `apps/frontend/src/components/events/EventDetailActions.tsx` (новый)
- `w-full` кнопки на мобайле, `tablet:w-auto` на планшете+.
- «Купить билет» / «Зарегистрироваться»: mint filled.
- «Напомнить»: outlined, bell-иконка, deep-link `remind_${event.id}`.
- «Добавить в календарь (.ics)»: tertiary кнопка.
- `role="group"` + `aria-label`.


## Stage 15 — Public UX / Finish

### Loading states
- **`app/loading.tsx`**: скелетон главной страницы (hero + calendar + фильтры + сетка карточек).
- **`app/events/[id]/loading.tsx`**: скелетон страницы мероприятия (hero + мета + действия + описание).

### Error states
- **`app/error.tsx`**: client-side error boundary для публичных роутов с кнопками «Попробовать снова» / «На главную».
- **`app/global-error.tsx`**: глобальный top-level error boundary (500), рендерит полную HTML-страницу с минимальным UI.

### 404 полировка
- **`app/events/[id]/not-found.tsx`**: redesigned с иконкой, кодом 404, подробным текстом, active/focus состояниями.

### Accessibility (a11y)
- **`app/layout.tsx`** + **`components/layout/PublicShell.tsx`**: добавлен `skip-to-content` link + `id="main-content"` на `<main>`.
- **`app/globals.css`**: CSS для `.skip-to-content` (видим только при фокусе), `@keyframes fade-in`, `.animate-fade-in`.
- **`MainEventsBanner.tsx`**: `role="tablist"` / `role="tab"` для dot-навигации; `aria-roledescription="carousel"`, `aria-live`, `aria-selected`, `tabIndex` роутинг, keyboard `ArrowLeft`/`ArrowRight`.

### Анимации и переходы
- **`MainEventsBanner.tsx`**: стрелка в кнопке «Подробнее»; активное состояние `active:bg-*` для кнопки.
- **`error.tsx`**: плавный focus-visible на кнопках.
- **`not-found.tsx`**: active states на кнопках.

### Image оптимизация
- **`EventCard.tsx`**: `loading="lazy"` + `placeholder="blur"` с base64 SVG blurDataURL.
- **`MainEventsBanner.tsx`**: `placeholder="blur"` + `blurDataURL` для hero-изображений.
- **`app/events/[id]/page.tsx`**: `placeholder="blur"` + `blurDataURL` для hero.

### Header (BR-014, TZ)
- **`components/layout/SiteHeader.tsx`**: добавлены внешние ссылки Telegram, MAX, «Стать партнёром» согласно требованиям TZ; `target="_blank" rel="noopener noreferrer"`; keyboard focus-visible.

### Footer (BR-014, TZ)
- **`components/layout/SiteFooter.tsx`**: email click → `navigator.clipboard.writeText` + открытие `mailto:` + toast «Email скопирован» / «Почтовый клиент открыт»; `'use client'`; `role="status" aria-live="polite"` на toast.

## Stage 14 — SEO

- **`apps/frontend/src/app/robots.ts`**: добавлен `/robots.txt` через `MetadataRoute.Robots`. Запрещает индексацию `/admin`, `/api/`, `/_next/`; указывает sitemap URL.
- **`apps/frontend/src/app/sitemap.ts`**: добавлен `/sitemap.xml` через `MetadataRoute.Sitemap`. Статические маршруты: `/`, `/legal/*`; динамические: `/events/[id]` для опубликованных событий (до 200 записей, revalidate 3600 с).
- **`apps/frontend/src/app/admin/layout.tsx`**: преобразован в Server Component для поддержки `export const metadata`. Клиентская логика вынесена в `AdminLayoutClient.tsx`.
- **`apps/frontend/src/app/admin/AdminLayoutClient.tsx`**: новый client component с sidebar, навигацией и logout.
- **`apps/frontend/src/app/maintenance/page.tsx`**: `generateMetadata` возвращает `robots: { index: false, follow: false }`.
- **`apps/frontend/src/app/page.tsx`**: добавлены `alternates.canonical` и `openGraph` с полными метаданными.
- **`apps/frontend/src/app/events/[id]/page.tsx`**: `generateMetadata` добавлены canonical URL и OG-теги (включая OG Image из первого изображения события).

## Stage 12 — Production Blockers

- **[C-01] `docker-compose.prod.yml`**: добавлен `BOT_INTERNAL_TOKEN` в `backend` и `bots`. `NEXT_PUBLIC_CONTACT_EMAIL` уже присутствовал (строка 76).
- **[S-01] `docker-compose.yml` (dev)**: добавлен `BOT_INTERNAL_TOKEN` со значением по умолчанию для локальной разработки.
- **[C-02] `apps/backend/Dockerfile`**: добавлен `prisma generate` в runner-стадию после `pnpm install --prod`. Добавлен `/docker-entrypoint.sh` — запускает `prisma migrate deploy` перед стартом Node.js.
- **[C-03] `apps/frontend/src/middleware.ts`**: убрана опция `{ next: { revalidate: 30 } }` (не работает в Edge Runtime). Заменена на `{ cache: 'no-store' }`.
- **[C-04] `apps/backend/src/main.ts`**: CORS расширен — добавлены `https://www.ab-event.pro` и `https://test.ab-event.pro`.
- **[M-04] `apps/backend/src/app.module.ts`**: `ThrottlerGuard` подключён глобально через `APP_GUARD`. Rate-limiting теперь активен на всех эндпоинтах, включая `/api/auth/login`.
- **[ENV] `apps/backend/.env.example`**: добавлены `SEED_ADMIN_EMAIL` и `SEED_ADMIN_PASSWORD`.
- **[ENV] `.env.example`**: добавлен `NEXT_PUBLIC_CONTACT_EMAIL`.
- **ADR-012**: задокументирован подход с Docker entrypoint для migrate deploy.

Закрытые production-блокеры: C-01, C-02, C-03, C-04, M-04.

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
