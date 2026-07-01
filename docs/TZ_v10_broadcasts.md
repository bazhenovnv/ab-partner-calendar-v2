# TZ v10 addition: Mass broadcasts

This addition is part of the active project requirements and has priority over older conflicting requirements.

## Purpose

Add a full mass broadcast subsystem for Telegram and MAX users.

The subsystem must support informational project messages, event announcements and news while keeping service reminders separate and higher priority.

## Admin section

Add a new admin section:

```text
/admin/broadcasts
```

Menu label:

```text
Рассылки
```

Subsections:

- all broadcasts;
- create broadcast;
- queue;
- history;
- analytics;
- settings.

## Channels

Supported channels:

- Telegram;
- MAX;
- Telegram + MAX together.

## Audience targeting

MVP targeting options:

- all bot users;
- Telegram users only;
- MAX users only;
- users with `allowMarketingMessages = true`;
- users who created at least one reminder;
- by city/region if user profile contains city later;
- by directions/interests if available later;
- by registration period.

Users who unsubscribed from marketing broadcasts must be excluded from mass broadcasts.

Service reminders are not affected by marketing unsubscribe.

## Broadcast editor

Fields:

- title/internal name;
- message text;
- image optional;
- button text optional;
- button URL optional;
- selected channels;
- selected audience;
- scheduled datetime in MSK UTC+3;
- preview;
- test send recipient/admin;
- status.

## Statuses

Broadcast statuses:

- DRAFT;
- SCHEDULED;
- QUEUED;
- SENDING;
- PAUSED;
- SENT;
- FAILED;
- CANCELLED.

Human-readable Russian labels:

- Черновик;
- Запланирована;
- Ожидает очередь;
- Отправляется;
- Приостановлена;
- Отправлена;
- Ошибка;
- Отменена.

## Sending rules

- Test send to admin is required before mass sending.
- Without successful test send, mass send button must be disabled.
- Only one mass broadcast can be actively sending at the same time.
- If another broadcast is already sending, the next one receives status `QUEUED` / `Ожидает очередь`.
- Broadcasts are sent through a queue.
- Service reminders always have higher priority than mass broadcasts.
- Mass broadcasts must never delay service reminders.

## Rate limits

Default speed limits:

- Telegram: 20 messages per second;
- MAX: 10 messages per second.

These values must be admin-configurable.

## Cooldown / anti-spam rule

Default project rule:

```text
No more than 1 mass broadcast to the same user in 24 hours.
```

Rules:

- the default cooldown is 24 hours;
- admin can change cooldown: 6, 12, 24, 48, 72 hours or custom value;
- admin can disable cooldown only intentionally through settings;
- service reminders do not count toward this cooldown;
- if a user is still in cooldown, they are skipped for the broadcast and this is logged;
- if an admin attempts to launch a broadcast too early globally, UI must show remaining time, for example: `Следующая массовая рассылка будет доступна через 18 ч 24 мин`.

## User unsubscribe

Every mass broadcast must include an unsubscribe action/text:

```text
Отписаться от рассылок
```

When user unsubscribes:

- `allowMarketingMessages = false`;
- user remains in the bot;
- service reminders continue to work;
- user can re-enable broadcasts later through bot settings if implemented.

Recommended BotUser fields:

- `allowMarketingMessages: Boolean @default(true)`;
- `allowServiceNotifications: Boolean @default(true)`.

## Analytics

For each broadcast store and show:

- total recipients;
- queued;
- sent;
- delivered if the platform supports it;
- failed;
- skipped by cooldown;
- skipped because unsubscribed;
- bot blocked by user;
- errors;
- unsubscribe count;
- startedAt;
- completedAt.

## History

Broadcast history must be permanent unless explicitly deleted by admin.

Admin can:

- open previous broadcast;
- clone/repeat;
- view recipients and delivery logs;
- export CSV/XLSX later;
- cancel scheduled broadcast;
- pause/resume if supported.

## Backend models

Add models/entities:

- Broadcast;
- BroadcastRecipient;
- BroadcastQueue/queue jobs;
- BroadcastLog;
- BroadcastSettings or SiteConfig keys;
- BotUser marketing/service flags.

Suggested settings keys:

- broadcast.enabled;
- broadcast.telegramRatePerSecond;
- broadcast.maxRatePerSecond;
- broadcast.cooldownHours;
- broadcast.testSendRequired;
- broadcast.allowSimultaneous;
- broadcast.maxRecipients;
- broadcast.defaultUnsubscribeText;

## API endpoints

Admin API examples:

- `GET /api/admin/broadcasts`;
- `POST /api/admin/broadcasts`;
- `GET /api/admin/broadcasts/:id`;
- `PATCH /api/admin/broadcasts/:id`;
- `POST /api/admin/broadcasts/:id/test`;
- `POST /api/admin/broadcasts/:id/send`;
- `POST /api/admin/broadcasts/:id/cancel`;
- `POST /api/admin/broadcasts/:id/pause`;
- `POST /api/admin/broadcasts/:id/resume`;
- `GET /api/admin/broadcasts/:id/analytics`;
- `GET /api/admin/broadcasts/:id/logs`;
- `GET/PATCH /api/admin/settings/broadcasts`.

Bot API/actions:

- unsubscribe from marketing broadcasts;
- optional re-subscribe;
- service reminders must remain active unless user separately disables them.

## Legal documents update

Update legal documents to mention:

- service messages;
- informational messages;
- event/news/project messages;
- ability to unsubscribe from informational broadcasts;
- service reminders continue after marketing unsubscribe;
- statistics of broadcast sending and delivery can be processed for service operation, analytics and diagnostics.

Important:

- Do not merge marketing unsubscribe with personal data consent withdrawal.
- Marketing unsubscribe disables informational broadcasts only.
- Personal data withdrawal is handled separately through legal/privacy process.

## Cookie/analytics relation

Cookie notice may mention analytics generally, but mass broadcast consent/unsubscribe is handled separately in bot/legal flow.

## Business rules

Add/keep these rules in Business Rules:

- service reminders have higher priority than mass broadcasts;
- only one mass broadcast can send at a time;
- default cooldown: 1 mass broadcast per user per 24 hours;
- service reminders do not count toward broadcast cooldown;
- test send is required before mass send;
- user can unsubscribe from marketing broadcasts while keeping service reminders.

## Claude workflow requirement

Before implementing broadcasts, Claude must study:

- active Technical Specification;
- `docs/TZ_v7_additions.md`;
- `docs/TZ_v8_additions.md`;
- `docs/TZ_v9_cookie_analytics_notice.md`;
- this file;
- Business Rules;
- ADR;
- CHANGELOG;
- legal documents.

Implementation must synchronize:

- Prisma schema/migrations;
- backend modules/API;
- bots;
- admin frontend;
- analytics;
- legal pages;
- documentation;
- seed/default settings.
