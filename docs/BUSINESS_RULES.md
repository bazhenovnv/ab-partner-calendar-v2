# Business Rules Registry — АБ Афиша Бухгалтера

This registry is the single source of truth for business rules. Latest additions v7-v9 have priority over older conflicting requirements.

## BR-001: #Хит
If a MAX post contains `#Хит`, import the event into Calendar, Events and Main Events. Set `mainEvent = true`.

## BR-002: Normal MAX event
If a MAX post does not contain `#Хит`, import it into Calendar and Events only. Do not show it in Main Events.

## BR-003: Collection posts
If a MAX post is a weekly selection or contains multiple events in one post, do not automatically split it. Send to `Требует внимания`.

## BR-004: Required event fields
Required for publication: title, date, time, image, status, format, direction, event link, city/online, price.

## BR-005: Missing image
If there is no event image, do not publish. Send to `Требует внимания`.

## BR-006: Missing title/date/link
If title, date or event link is missing, do not publish. Send to `Требует внимания`.

## BR-007: Missing speaker/address
Missing speaker or address does not block publication. Do not render the missing row.

## BR-008: Empty price
If price is empty, show `Бесплатно`.

## BR-009: Status label
Use human-readable status `Завершено` everywhere. Do not use `Проведено`.

## BR-010: Reminder flow
On site user selects only Telegram or MAX. Date and time are selected inside the selected bot.

## BR-011: Reminder timezone
Reminder date/time is selected and executed by default in Moscow time: MSK UTC+3.

## BR-012: Phone requirement in bots
If admin setting is enabled, Telegram/MAX bot requires phone number on first use. User cannot create reminders without phone. Admin can disable this requirement.

## BR-013: Legal notice in bots
On first start, bots must show legal notice and refer to Privacy Policy, User Agreement and Personal Data Consent.

## BR-014: Contact email
Use `info-event@a-b.ru` everywhere.

## BR-015: Cookie and analytics notice
Show cookie/analytics notice on first public-site visit. After user clicks `Понятно`, do not show again.

## BR-016: Analytics consent scope
Cookie notice is informational in MVP and does not disable Yandex Metrika by default.

## BR-017: Tax hashtags
Tax hashtags map to `Налоги`. Special regime hashtags `УСН`, `АУСН`, `ПСН`, `ОСНО`, `НПД`, `ЕСХН` map to both `Налоги` and `СНО`.

## BR-018: Maintenance mode
When maintenance mode is enabled, public pages show the minimal standalone maintenance page without header/footer. Admin remains available.

## BR-019: Calendar header
Calendar header must always show month and year, e.g. `Май 2026`.

## BR-020: Dropdown chevron
Dropdown chevron indicates only open/closed state: closed down, open rotated up.

## BR-021: Mass broadcast priority
Service reminders always have higher priority than mass broadcasts. Mass broadcasts must never delay service reminders.

## BR-022: One active broadcast
Only one mass broadcast can be actively sending at a time. If another broadcast is already sending, the next one receives status `QUEUED`.

## BR-023: Broadcast cooldown
Default: no more than 1 mass broadcast per user in 24 hours. Admin can change cooldown (6, 12, 24, 48, 72 hours or custom). Admin can disable cooldown intentionally. Service reminders do not count toward this cooldown.

## BR-024: Broadcast test send required
A successful test send to an admin recipient is required before mass send is enabled. Without it, the mass send button is disabled.

## BR-025: Broadcast unsubscribe
Every mass broadcast must include an unsubscribe action. When user unsubscribes, `allowMarketingMessages = false`. Service reminders continue to work. User can re-enable broadcasts later in bot settings.

## BR-026: Marketing vs service notifications
Marketing unsubscribe disables informational broadcasts only. Service reminders are not affected. Personal data consent withdrawal is handled separately through the legal process.

## BR-027: Legal document pages
The public site must expose: `/legal/privacy`, `/legal/terms`, `/legal/consent`, `/legal/cookies`, `/legal/broadcast-consent`. Footer must link to at least the first four.

## BR-028: Cookie banner legal links
Cookie banner must link to `/legal/privacy`. Link to `/legal/cookies` if UI space allows.

## BR-029: Bot legal notice on first start
On first start, bots must show legal notice referencing Privacy Policy, User Agreement, Personal Data Consent and (if marketing broadcasts are enabled) Broadcast Consent. Continuing to use the bot means accepting these documents.

## BR-030: Legal documents versioning
Admin can publish new versions of legal documents. Each version stores publication date. Previous versions are kept for history.
