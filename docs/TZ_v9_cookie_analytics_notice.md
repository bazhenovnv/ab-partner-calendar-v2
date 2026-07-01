# TZ v9 addition: cookie and analytics notice

This addition is part of the active project requirements and has priority over older conflicting requirements.

## Cookie and analytics notice

Add a public website notice about cookies and analytics.

Purpose:

- inform users that the website uses cookies and analytics tools;
- explain that analytics is used to improve the service, collect statistics, diagnose errors and understand how visitors use the website;
- provide access to legal documents;
- allow the user to accept the notice.

## Data covered by the notice

The notice covers:

- cookies;
- IP address;
- browser and device data;
- page visits;
- user actions on the website;
- Yandex Metrika data;
- internal analytics events.

## Default text

```text
Мы используем cookie и аналитику, чтобы сайт работал корректно, а также для анализа посещаемости, улучшения сервиса и диагностики ошибок. Продолжая пользоваться сайтом, вы соглашаетесь с обработкой данных в соответствии с Политикой конфиденциальности.
```

Button:

```text
Понятно
```

Link:

```text
Политика конфиденциальности
```

The link opens `/legal/privacy`.

## UX behavior

- Show the notice on the public site on the first visit.
- Do not show repeatedly after acceptance.
- Store acceptance in a cookie/localStorage value.
- The notice must not block access to the website.
- The notice must not cover critical UI elements.
- Desktop placement: bottom area, compact banner/card according to the site style.
- Mobile 390 placement: bottom compact banner, full width with safe paddings.
- Use existing design system colors and typography.
- The notice must be accessible by keyboard.
- Button must have clear focus state.

## Admin settings

Add controls in admin:

```text
/admin/settings/legal
or
/admin/settings/privacy
```

Settings:

- enable/disable cookie notice;
- edit notice text;
- edit button text;
- choose linked legal document;
- reset user acceptance state is not required for MVP, but can be added later;
- all changes must be action-logged.

## Analytics implementation rule

Yandex Metrika is already required with counter ID `110270689`.

The cookie/analytics notice does not disable Yandex Metrika by default unless a separate opt-out/consent mode is explicitly implemented later.

For MVP:

- show informational notice;
- save acceptance;
- provide link to privacy policy;
- keep Yandex Metrika and internal analytics active according to project requirements.

## Legal documents update

Update legal documents to mention:

- use of cookies;
- Yandex Metrika;
- internal analytics;
- purposes: site operation, statistics, service improvement, error diagnostics, security and abuse prevention.

## Footer/legal placement consistency

Footer must include:

- `Политика конфиденциальности` -> `/legal/privacy`;
- `Пользовательское соглашение` -> `/legal/terms`;
- `Согласие на обработку персональных данных` -> `/legal/consent`.

The cookie notice must link at least to `Политика конфиденциальности`.

## Claude workflow requirement

Before writing code for this addition, Claude must study:

- the active Technical Specification;
- `docs/TZ_v7_additions.md`;
- `docs/TZ_v8_additions.md`;
- this file;
- legal documents;
- Yandex Metrika requirements;
- admin settings architecture.

Claude must synchronize affected areas:

- frontend public UI;
- admin settings;
- legal pages;
- project configuration;
- documentation;
- analytics implementation.
