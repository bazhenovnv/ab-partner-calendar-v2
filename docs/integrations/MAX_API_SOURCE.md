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
2. Hourly reconciliation through `GET /updates`, as required by the TZ.

The polling marker is persisted in `SiteConfig` under `maxImport.pollMarker`. Both paths use the same normalisation, filtering, parsing and persistence code. Duplicate deliveries are safe because `message.body.mid` is stored as `externalId`.

## Import rules

- One MAX post creates or updates one event.
- A collection post is not split. It is saved as `NEEDS_ATTENTION` and produces an admin notification.
- `#Хит` sets `mainEvent=true`.
- A complete `#Хит` event appears in Calendar, Events and Main Events.
- A complete normal event appears in Calendar and Events only.
- Required fields are title, date, time, image, format, direction, event link and city or `Онлайн`.
- Missing price means `Бесплатно`.
- Missing speaker or address does not block publication.
- Complete imports are published automatically. Incomplete imports are never public.
- Edited posts update the existing event by `externalId`.
- Removed posts hide the corresponding event unless the status was manually fixed by an administrator.

## Images

The first image attachment is downloaded locally. JPEG, PNG, WebP and GIF are accepted, with a maximum source size of 10 MB. Sharp creates local variants for the event card, Main Events carousel, modal and thumbnail. Temporary MAX image URLs are not hotlinked.

If an image is absent or cannot be processed, the event receives `NEEDS_ATTENTION`.

## API and endpoints

Implementation base URL: `https://platform-api2.max.ru`.

Admin endpoints:

- `GET /api/max-import/bot-info`
- `GET /api/max-import/discover-channel`
- `POST /api/max-import/run`
- `GET /api/max-import/logs`

Webhook endpoint: `POST /api/max-webhook`.

## Initial setup

1. Add the MAX bot to the approved source channel as administrator.
2. Read the numeric `chat_id` from backend logs, admin notification or `GET /api/max-import/discover-channel`.
3. Set `MAX_SOURCE_CHANNEL_ID` and enable MAX import in the server environment.
4. Recreate the backend container.
5. Run `POST /api/max-import/run` once.
6. Verify results in Admin → Events and Admin → Requires attention.
