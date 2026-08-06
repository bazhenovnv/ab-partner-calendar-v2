# АБ Афиша Бухгалтера

Официальный репозиторий проекта `ab-event.pro`:

`bazhenovnv/ab-partner-calendar-v2`

Старый репозиторий `bazhenovnv/ab-partner-calendar` является историческим и не используется для текущей разработки.

Проект: сайт-календарь бухгалтерских мероприятий с админкой, автоимпортом из MAX, Telegram/MAX-ботами, напоминаниями, аналитикой, юридическими документами и адаптивной версткой.

## Начало работы с документацией

Перед любыми изменениями открыть:

1. [`PRODUCTION_RELEASE.md`](PRODUCTION_RELEASE.md) — единственная закреплённая production-версия frontend.
2. [`infra/deploy/production-frontend.env`](infra/deploy/production-frontend.env) — машиночитаемый production lock.
3. [`docs/PROJECT_BIBLE/00_SOURCE_OF_TRUTH.md`](docs/PROJECT_BIBLE/00_SOURCE_OF_TRUTH.md) — какой источник побеждает при конфликте.
4. [`docs/PROJECT_BIBLE/README.md`](docs/PROJECT_BIBLE/README.md) — навигация по проектной книге.
5. [`docs/PROJECT_BIBLE/11_DESIGN_PHASE_WORKFLOW.md`](docs/PROJECT_BIBLE/11_DESIGN_PHASE_WORKFLOW.md) — утверждённый процесс текущего этапа дизайна.
6. [`docs/PROJECT_BIBLE/12_DESIGN_AUDIT_2026-07.md`](docs/PROJECT_BIBLE/12_DESIGN_AUDIT_2026-07.md) — текущая база несоответствий главной страницы.
7. Спецификацию нужного блока.
8. [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md).
9. [`docs/ADR.md`](docs/ADR.md).
10. [`docs/PROJECT_BIBLE/05_ASSET_REGISTRY.md`](docs/PROJECT_BIBLE/05_ASSET_REGISTRY.md).
11. [`docs/PROJECT_BIBLE/08_OPEN_ISSUES.md`](docs/PROJECT_BIBLE/08_OPEN_ISSUES.md).
12. [`docs/PROJECT_BIBLE/09B_RELEASE_ACCEPTANCE_CHECKLIST.md`](docs/PROJECT_BIBLE/09B_RELEASE_ACCEPTANCE_CHECKLIST.md) — обязательные доказательства приёмки.

Stage/audit/release reports являются историческими свидетельствами и не могут переопределять утверждённый дизайн, канонические документы PROJECT_BIBLE или production lock.

## Закреплённый production frontend

- Commit: `d4fe868a9f42ea66cf6a0760bb33dd3b3d6ed6c7`.
- Docker image: `ab-afisha/frontend:frontend-release-d4fe868`.
- Единственный разрешённый деплой: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`.

Нельзя определять production по `main`, `latest`, старому release-тегу, rollback-образу или ранее использованному deploy-скрипту.

## Основные документы

- `docs/TZ_AB_Afisha_Buhgaltera_Claude.md` — основное ТЗ, активное дополнение ниже PROJECT_BIBLE.
- `docs/TZ_AB_Afisha_Buhgaltera_Claude.txt` — текстовая копия ТЗ.
- `docs/TZ_AB_Afisha_Buhgaltera_customer.md` — версия для заказчика.
- `docs/TZ_v7_additions.md` … `docs/TZ_v11_legal_documents_and_locations.md` — утверждённые дополнения.
- `docs/BUSINESS_RULES.md` — единый реестр функциональных правил.
- `docs/ADR.md` — журнал архитектурных и процессных решений.
- `docs/CHANGELOG.md` — история изменений, не спецификация.
- `docs/PROJECT_BIBLE/11_DESIGN_PHASE_WORKFLOW.md` — рамки, порядок и критерии приёмки этапа дизайна.

## Ключевые параметры

- Production: `https://ab-event.pro`.
- Staging: `https://test.ab-event.pro`.
- Каноническая интеграционная ветка: `main`.
- Новые изменения выполняются в короткоживущих feature-ветках от актуальной `main` и после приёмки сливаются обратно.
- Проверенная исходная точка дизайн-этапа `b6c333a` / `release-20260723` является исторической и не определяет production.
- Исторические вершины удалённых веток сохранены тегами `archive-20260723-*`.
- Путь проекта на сервере: `/srv/ab-afisha`.
- Рабочая почта: `info-event@a-b.ru`.
- Яндекс.Метрика: `110270689`.
- VPS: Timeweb Cloud, IPv4 `5.129.243.179`.
- Старый сервер `77.232.136.248` удалён и не должен использоваться.
- Runtime-конфигурация использует домены, а не IP.
- Стек: Next.js, React, TypeScript, NestJS, PostgreSQL, Redis, Docker, Nginx.

## Текущий этап

Сначала завершается стабилизация канонической документации. После её закрытия начинается исправление публичной главной страницы по замечаниям `DA-001`–`DA-018` из текущего дизайн-аудита.

Рабочая последовательность: аудит → спецификация → feature-ветка → реализация → build и smoke checks → визуальная проверка → утверждение → документирование → merge.

## Деплой

Актуальная процедура находится только в:

[`docs/PROJECT_BIBLE/06_DEPLOYMENT_CURRENT.md`](docs/PROJECT_BIBLE/06_DEPLOYMENT_CURRENT.md)

## Безопасность

Секреты, токены, пароли, SSH-ключи и production `.env` нельзя хранить в GitHub. В репозитории допускаются только примеры переменных окружения без секретных значений.
