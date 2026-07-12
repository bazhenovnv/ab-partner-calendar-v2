# АБ Афиша Бухгалтера

Официальный репозиторий проекта `ab-event.pro`:

`bazhenovnv/ab-partner-calendar-v2`

Старый репозиторий `bazhenovnv/ab-partner-calendar` является историческим и не используется для текущей разработки.

Проект: сайт-календарь бухгалтерских мероприятий с админкой, автоимпортом из MAX, Telegram/MAX-ботами, напоминаниями, аналитикой, юридическими документами и адаптивной версткой.

## Начало работы с документацией

Перед любыми изменениями открыть:

1. [`docs/PROJECT_BIBLE/00_SOURCE_OF_TRUTH.md`](docs/PROJECT_BIBLE/00_SOURCE_OF_TRUTH.md) — какой источник побеждает при конфликте.
2. [`docs/PROJECT_BIBLE/README.md`](docs/PROJECT_BIBLE/README.md) — навигация по проектной книге.
3. Спецификацию нужного блока.
4. [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md).
5. [`docs/ADR.md`](docs/ADR.md).
6. [`docs/PROJECT_BIBLE/05_ASSET_REGISTRY.md`](docs/PROJECT_BIBLE/05_ASSET_REGISTRY.md).
7. [`docs/PROJECT_BIBLE/08_OPEN_ISSUES.md`](docs/PROJECT_BIBLE/08_OPEN_ISSUES.md).

Stage/audit/release reports являются историческими свидетельствами и не могут переопределять утверждённый дизайн или канонические документы PROJECT_BIBLE.

## Основные документы

- `docs/TZ_AB_Afisha_Buhgaltera_Claude.md` — основное ТЗ, активное дополнение ниже PROJECT_BIBLE.
- `docs/TZ_AB_Afisha_Buhgaltera_Claude.txt` — текстовая копия ТЗ.
- `docs/TZ_AB_Afisha_Buhgaltera_customer.md` — версия для заказчика.
- `docs/TZ_v7_additions.md` … `docs/TZ_v11_legal_documents_and_locations.md` — утверждённые дополнения.
- `docs/BUSINESS_RULES.md` — единый реестр функциональных правил.
- `docs/ADR.md` — журнал архитектурных решений.
- `docs/CHANGELOG.md` — история изменений, не спецификация.

## Ключевые параметры

- Production: `https://ab-event.pro`.
- Staging: `https://test.ab-event.pro`.
- Рабочая ветка: `claude/ab-afisha-architecture-plan-805f5o`.
- Путь проекта на сервере: `/srv/ab-afisha`.
- Рабочая почта: `info-event@a-b.ru`.
- Яндекс.Метрика: `110270689`.
- VPS: Timeweb Cloud, IPv4 `5.129.243.179`.
- Старый сервер `77.232.136.248` удалён и не должен использоваться.
- Runtime-конфигурация использует домены, а не IP.
- Стек: Next.js, React, TypeScript, NestJS, PostgreSQL, Redis, Docker, Nginx.

## Деплой

Актуальная процедура находится только в:

[`docs/PROJECT_BIBLE/06_DEPLOYMENT_CURRENT.md`](docs/PROJECT_BIBLE/06_DEPLOYMENT_CURRENT.md)

## Безопасность

Секреты, токены, пароли, SSH-ключи и production `.env` нельзя хранить в GitHub. В репозитории допускаются только примеры переменных окружения без секретных значений.