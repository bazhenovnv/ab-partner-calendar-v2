# TZ v11 addition: Legal documents package and placement

This addition is part of the active project requirements.

## Legal documents to implement

The project must contain and expose these legal documents:

1. Privacy Policy - `/legal/privacy`.
2. User Agreement - `/legal/terms`.
3. Personal Data Processing Consent - `/legal/consent`.
4. Cookie and Analytics Policy - `/legal/cookies`.
5. Consent to Informational Messages and Broadcasts - `/legal/broadcast-consent`.

## Contact email

Use only this contact email in legal documents and public contact blocks:

```text
info-event@a-b.ru
```

## Placement

Footer of the public site must contain links to all five legal documents:

- `/legal/privacy` — Политика конфиденциальности;
- `/legal/terms` — Пользовательское соглашение;
- `/legal/consent` — Согласие на обработку персональных данных;
- `/legal/cookies` — Политика Cookie и аналитики;
- `/legal/broadcast-consent` — Согласие на информационные рассылки.

Cookie banner:

- link to `/legal/privacy`;
- link to `/legal/cookies` if UI space allows.

Telegram/MAX bots first start:

- show legal notice with Privacy Policy, User Agreement and Personal Data Processing Consent;
- if marketing broadcasts are enabled, also show Consent to Informational Messages and Broadcasts;
- phone request flow must reference Personal Data Processing Consent.

Admin:

- legal documents must be editable and versioned;
- store publication date;
- store active version;
- keep previous versions.

## Data categories for lawyer and documents

- technical website data: IP, cookies, device/browser, page visits, website actions;
- Yandex Metrika and internal analytics data;
- Telegram/MAX IDs, name, username/nickname;
- phone number if phone requirement is enabled;
- selected events and reminders;
- reminder delivery statuses;
- marketing broadcast consent/unsubscribe flag;
- broadcast delivery and error statistics;
- email requests and messages;
- admin action logs and technical error logs.

## Purposes

- website and bot operation;
- event reminders;
- user identification in bots;
- informational broadcasts with unsubscribe option;
- analytics and statistics;
- service improvement;
- security and abuse prevention;
- diagnostics and error handling;
- processing user requests.

## Important rule

Marketing unsubscribe is not the same as withdrawal of personal data consent.

Marketing unsubscribe disables informational broadcasts only. Service reminders continue to work unless user separately disables them or withdraws consent according to the legal process.

## Files prepared for lawyer

The legal package contains DOCX and PDF files:

- `Политика_конфиденциальности_АБ_Афиша_v2`;
- `Пользовательское_соглашение_АБ_Афиша_v2`;
- `Согласие_на_обработку_ПД_АБ_Афиша_v2`;
- `Политика_Cookie_и_аналитики_АБ_Афиша_v2`;
- `Согласие_на_информационные_рассылки_АБ_Афиша_v2`;
- `Описание_данных_для_юриста_АБ_Афиша_v2`.

Claude must study these documents before implementing legal pages, cookie banner, bot legal notice, phone flow or broadcasts.
