# TZ v8 additions

These changes are part of the active project requirements and have priority over older conflicting requirements.

## Maintenance page default format

The maintenance page must be implemented as a minimal standalone screen without the main header/navigation and without the site footer.

Default visible page format:

- full-screen centered layout;
- dark background matching the approved mockup style;
- one centered technical works icon;
- title: `Технические работы`;
- description text under the title;
- optional divider line;
- optional info card with small icon, title and text;
- no main navigation;
- no footer;
- no extra links or decorative blocks unless enabled from admin settings.

Default text:

```text
Технические работы
Мы проводим технические работы для улучшения сервиса.
Совсем скоро всё снова будет доступно.
Спасибо за понимание!
Мы делаем всё, чтобы сервис стал ещё удобнее для вас.
```

## Maintenance page admin settings

Add admin controls:

Path:

```text
/admin/settings/maintenance
```

Settings:

- enable/disable maintenance mode;
- title text;
- description text;
- additional card title;
- additional card text;
- show/hide main icon;
- choose/upload main icon;
- show/hide divider line;
- show/hide additional info card;
- background color or gradient;
- accent color;
- text color;
- SEO title;
- SEO description;
- `noindex` option;
- optional whitelist: admins can access normal site while visitors see maintenance page.

Behavior:

- when maintenance mode is enabled, public pages show the maintenance page;
- admin area remains available;
- API required for admin and system operation remains available;
- public API can return maintenance state where needed;
- maintenance page must be responsive for 1920, 1440, 1024 and 390;
- settings are stored in `SiteConfig` or a dedicated `MaintenanceSettings` model;
- all changes must be action-logged.

## Reminder datetime selection clarification

The user does not select date/time on the website.

Flow:

1. User clicks `Напомнить` on the public site.
2. User selects Telegram or MAX in the popover/modal.
3. User is redirected to the selected bot.
4. In the bot, after required registration/phone flow if enabled, the user selects reminder date and time.
5. Reminder date/time is based on Moscow time by default: MSK, UTC+3.
6. The bot must clearly show that the selected time is MSK.
7. Reminder execution is scheduled from the selected MSK datetime.

Remove old fixed reminder options as the primary flow. Fixed options may be used only if explicitly enabled later in admin settings, but the required default is free date + time selection inside the bot.

## Bot phone requirement clarification

When phone requirement is enabled:

- Telegram/MAX bot must request phone number on first use;
- the user cannot create reminders until phone is provided;
- store messenger user ID, channel, username/name if available, phone, registration date and source;
- admin can disable phone requirement in bot settings;
- if disabled, reminders can be created without phone.

## Contact email

Use current contact email everywhere:

```text
info-event@a-b.ru
```

Applies to:

- footer;
- legal documents;
- maintenance page settings if contact is shown;
- admin settings;
- README/project config;
- bot legal text where contact email is referenced.

Email click behavior on the site remains:

- copy to clipboard;
- open `mailto:info-event@a-b.ru`;
- show toast `Email скопирован`;
- fallback if Clipboard API is blocked.

## Legal documents placement

Public site footer must contain links:

- `Политика конфиденциальности` -> `/legal/privacy`;
- `Пользовательское соглашение` -> `/legal/terms`;
- `Согласие на обработку персональных данных` -> `/legal/consent`.

Each document opens as a separate page/window.

Bots:

- On first start, before/with registration, show legal notice with links/names of these documents.
- User must be informed that continuing to use the bot means accepting the documents and giving consent to personal data processing.
- If phone requirement is enabled, phone request must be shown after legal notice or together with it in a clear flow.

Admin:

- Legal documents must be editable and versioned.
- Admin can publish a new version and see publication date/history.

## Status wording

Use `Завершено` everywhere.

Do not use `Проведено` in UI, admin, filters, tooltips, bots, docs or analytics.

Backend enum can remain technical if already implemented, but all human-readable labels must be `Завершено`.

## Hashtag direction mapping extension

Map the following hashtags/topics to direction `Налоги`:

- НДС
- Акцизы
- НДФЛ
- Налог на прибыль организаций
- НДПИ
- Водный налог
- Сборы за пользование объектами животного мира
- Госпошлина
- Налог на дополнительный доход
- Налог на сверхприбыль
- Налог на игорный бизнес
- Налог на имущество организаций
- Транспортный налог
- Земельный налог
- Налог на имущество физических лиц
- Торговый сбор

Map the following hashtags/topics to both directions `Налоги` and `СНО`:

- УСН
- АУСН
- ПСН
- ОСНО
- НПД
- ЕСХН

MAX parser must normalize hashtags and text variants, for example:

- `#НДС` -> `Налоги`;
- `#УСН` -> `Налоги`, `СНО`;
- `#НалогНаПрибыль` / `#НалогНаПрибыльОрганизаций` -> `Налоги` where supported;
- `#НПД` -> `Налоги`, `СНО`.

Mappings must be admin-editable where hashtag mappings already exist.

## Claude workflow requirement

Before writing code for these changes, Claude must study:

- the active Technical Specification;
- `docs/TZ_v7_additions.md`;
- this file `docs/TZ_v8_additions.md`;
- Business Rules when created;
- ADR when created;
- latest project changelog;
- all relevant mockups and examples.

Claude must not implement these changes selectively. All affected areas must be synchronized: frontend, backend, admin, bots, MAX parser, legal pages, env/config and documentation.
