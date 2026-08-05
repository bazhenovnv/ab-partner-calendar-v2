# MAX Import — canonical integration notes

## Authority

Project behaviour is defined by `PROJECT_BIBLE`, `BUSINESS_RULES.md` and the active TZ. This document explains the implementation only.

## Approved source

- MAX source from TZ: `https://max.ru/join/tumioTNhr5Kh90TaDp1Tzgn-uDKw8Eko7KFhXdKeu9c`
- The URL is stored in `MAX_SOURCE_CHANNEL_URL` for source links.
- API filtering uses the numeric `MAX_SOURCE_CHANNEL_ID` received in a `bot_added` update after the bot is added to the channel as administrator.
- The invite URL itself is not an API chat ID.

## Runtime variables

Required variable names:

- `MAX_BOT_TOKEN`
- `MAX_IMPORT_ENABLED`
- `MAX_SOURCE_CHANNEL_ID`
- `MAX_SOURCE_CHANNEL_URL`
- `MAX_WEBHOOK_SECRET`
- `MAX_WEBHOOK_PUBLIC_URL`

Secrets are configured only in the server environment and are never committed.

## Synchronisation policy

The project uses two complementary ingestion paths:

1. Webhook for immediate delivery.
2. Hourly reconciliation through `GET /updates`.

Both paths use the same normalisation, channel filtering, parsing and persistence code. `message.body.mid` is stored as `externalId` and acts as the idempotency key.

The polling marker is persisted in `SiteConfig` under `maxImport.pollMarker`. The reliable poll coordinator saves the returned marker only after every message update in the batch has been durably synchronized and its `lastSyncedAt` has advanced. If processing fails, the marker remains unchanged and the batch is retried.

After the reliable importer is first deployed, a one-time recent-window replay runs without changing the stored marker. It is recorded under `maxImport.recentBackfillV3`. This is followed by reparsing stored non-manual MAX records with status `DRAFT` or `NEEDS_ATTENTION`.

## Import rules

- One MAX post creates or updates one event.
- A collection post is not split. It is saved as `NEEDS_ATTENTION` and produces an admin notification.
- `#Хит`, `#ГлавноеСобытие` and `#ГлавныеСобытия` set `mainEvent=true`.
- A published main event appears in Calendar, Events and Main Events when its main carousel image exists.
- A published normal event appears in Calendar and Events only.
- Critical fields are title, date, image, format and city for an offline event.
- Missing price means `Бесплатно`.
- Missing time or registration URL does not hide an otherwise valid event; the importer adds an editorial tag for later completion.
- Missing recognized direction hashtags does not hide an event. Directions are inferred from the post text; unmatched accounting content falls back to `accounting` and receives an editorial fallback tag.
- Missing speaker or exact address does not block publication.
- Complete imports are published automatically. Records with critical omissions remain `NEEDS_ATTENTION`.
- Edited posts update the existing event by `externalId`.
- Removed posts hide the corresponding event unless the status was manually fixed by an administrator.
- Automatic recovery never changes events whose status is controlled manually by an administrator.

## Supported location formats

The parser supports, among others:

- `Формат: Онлайн`
- `Формат: Москва, Бизнес-центр White Stone (4-й Лесной пер., 4)`
- `Формат: Тюмень, ул. 25 Октября, 23а, ст1`
- legacy `Формат: <площадка>, г. <город>, <адрес>`
- `Где: Россия, <город>, <адрес>`

## Images

The first image attachment is downloaded locally. JPEG, PNG, WebP and GIF are accepted, with a maximum source size of 10 MB. Sharp creates local variants for the event card, Main Events carousel, modal and thumbnail. Temporary MAX image URLs are not hotlinked.

If an image is absent or cannot be processed, the event receives `NEEDS_ATTENTION`. When a source update contains an image but it cannot be stored, reliable polling does not acknowledge the batch marker, allowing a later retry.

## Public delivery

Calendar markers and event cards read only `PUBLISHED` records. Selecting a specific date includes completed published events for that date. The initial unfiltered card list shows planned and live events, with completed events used only as its fallback.

The backend main-events endpoint is the source of truth for the carousel. The frontend compatibility bridge must not discard records already selected by the backend.

## API and endpoints

Implementation base URL: `https://platform-api2.max.ru`.

Admin endpoints:

- `GET /api/max-import/bot-info`
- `GET /api/max-import/discover-channel`
- `POST /api/max-import/run` — reliable marker-based reconciliation
- `POST /api/max-import/backfill-recent` — force replay of the latest available update window without moving the marker
- `POST /api/max-import/reprocess` — reparse stored non-manual MAX drafts and attention records
- `GET /api/max-import/logs`

Webhook endpoint: `POST /api/max-webhook`.

## Initial setup and verification

1. Add the MAX bot to the approved source channel as administrator.
2. Read the numeric `chat_id` from backend logs, admin notification or `GET /api/max-import/discover-channel`.
3. Set `MAX_SOURCE_CHANNEL_ID` and enable MAX import in the server environment.
4. Recreate the backend container.
5. Wait for the startup reconciliation log or run `POST /api/max-import/run`.
6. Verify Calendar, Events, Main Events and Admin → Requires attention.
7. For historical parser defects, run `POST /api/max-import/reprocess`; for recently lost queue deliveries, run `POST /api/max-import/backfill-recent`.
