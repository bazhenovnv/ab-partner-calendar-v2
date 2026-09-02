# AB Partner Calendar v2 — правила работы Claude Code

## Критическая фиксация production — читать первой

Перед любыми изменениями, сборкой, откатом или deployment обязательно прочитать:

- `PRODUCTION_RELEASE.md`;
- `infra/deploy/production-frontend.env`.

Единственная утверждённая production-конфигурация:

- release anchor/backend commit: `213e5076fc274254abf9a56612bd086df2155ce5`;
- backend image: `ab-afisha/backend:backend-release-213e507`;
- frontend commit/image: `afc024cfc9f46ebcba1bb383f77f63779062e648` / `ab-afisha/frontend:frontend-release-afc024c`;
- bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`;
- production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`;
- backend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend.sh`;
- backend + frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`;
- backend + bots deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-bots.sh`;
- frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`.

Текущая promotion — **frontend-only**. Application commit `afc024c` включает PR #136, проверенный полным CI #870. Исправляется мобильная декоративная композиция футера без изменения desktop/tablet и bitmap asset: прежнее notebook/plant crop-окно `124×158 px` обрезало правую кромку блокнота и нижние листья. Финальный mobile override использует crop `129×174 px`, notebook source `180 px`, позицию `right: 10px` и сохраняет отдельную чашку.

Для текущего релиза:

- backend `213e507` не меняется и не пересоздаётся;
- bots `3a64511` не меняются и не пересоздаются;
- nginx, volumes, Telegram IPv6 и server-local `ai.ab-event.pro` сохраняются;
- Prisma schema/migrations не меняются;
- deployment только через `deploy-pinned-frontend.sh`;
- regression `mobile-footer-artwork-clipping.test.mjs` обязателен в frontend test suite.

Сохраняется private MAX source-preview contract из PR #133 / CI #865. Production runtime подтвердил, что source channel MAX приватный (`type=channel`, `is_public=false`) и точный `GET /messages/{mid}` не возвращает `message.url`, поэтому join URL с `?mid=` не является прямым permalink отдельного поста. Backend предоставляет защищённый `GET /events/admin/:id/source-preview`; frontend показывает «Исходный пост MAX»; для приватного канала действие называется «Открыть канал MAX»; repair-service кэширует visibility на 6 часов и не выполняет бессмысленные batch `/messages` запросы для private source channel.

Сохраняется canonical-city publication flow из PR #125 / CI #847: формы создания и редактирования `OFFLINE`/`HYBRID` событий используют активный справочник и сохраняют согласованные `cityId + cityName`; readiness совпадает с реальным backend publication guard; legacy `cityName` без `cityId` автоматически связывается только при единственном активном case-insensitive exact match. Fuzzy/contains и неоднозначная автопривязка запрещены. Сохраняются редакционный кабинет `/admin/editorial`, третий независимый MAX target `MAX_CHANNEL_3`, контракт карусели «Главные события» и все предыдущие production-гарантии.

Новой Prisma migration в этой promotion нет; ручной SQL запрещён.

Для backend обязателен CI-step `Compiled MAX parser runtime regression tests`, который проверяет `Экспофорум, Санкт-Петербург -> venue=Экспофорум, city=Санкт-Петербург` и блокировку не-городских значений.

Production components закрепляются независимо. Запрещено считать `main`, `latest`, `APP_VERSION`, старый release-тег или rollback-образ текущей production-версией. Новая версия становится production только после отдельного явного утверждения владельцем проекта и одновременного обновления production lock-файлов.

## Роль Claude Code

Ты работаешь как аккуратный senior fullstack-разработчик проекта календаря бухгалтерских событий.

Главная цель: безопасно развивать проект, не ломая будущий функционал, дизайн, данные, админку, интеграции и бизнес-логику.

## Главные принципы

1. Не менять бизнес-логику без явного указания.
2. Не менять дизайн произвольно.
3. Если есть макет, скриншот или фирменные цвета — строго следовать им.
4. Не удалять существующий функционал без отдельного подтверждения.
5. Не переписывать большие части проекта без необходимости.
6. Перед изменениями изучать связанные файлы и зависимости.
7. После изменений проверять типы, lint и build, если команды доступны.
8. Всегда показывать список изменённых файлов и объяснение изменений.

## Архитектурная цель проекта

Проект должен быть гибким и расширяемым. В будущем без поломок должны меняться:

- тексты;
- визуал;
- блоки интерфейса;
- события;
- фильтры;
- категории;
- роли пользователей;
- Telegram-интеграции;
- AI-парсинг;
- админка;
- API;
- база данных;
- логика импорта и синхронизации.

Не хардкодить данные, которые должны управляться из конфигурации, БД, админки или CMS-подобного слоя.

## Backend

Перед изменениями backend:

- проверить Prisma schema;
- проверить DTO/API-контракты;
- проверить миграции;
- не использовать raw SQL без необходимости;
- если raw SQL нужен — объяснить причину;
- не создавать отдельные подключения к БД, если уже есть общий сервис;
- не логировать секреты, токены, cookies и персональные данные.

## Frontend

Перед изменениями frontend:

- не менять дизайн без задачи;
- сохранять текущие классы, layout и UX, если задача не требует обратного;
- nullable-поля обрабатывать безопасно;
- не показывать mock-данные в production/admin при ошибке API;
- показывать понятное сообщение об ошибке вместо фиктивных данных;
- не ломать адаптивность.

## Telegram

- все внешние и пользовательские строки экранировать;
- title, location, description, sourceUrl и другие текстовые поля нельзя вставлять в HTML без escape;
- не менять тексты рассылки и напоминаний без отдельного указания.

## AI-парсер

- имя AI-модели не хардкодить жёстко;
- использовать env-переменную для модели;
- fallback должен быть безопасным;
- при ошибке AI-парсинга возвращать null и логировать ошибку без падения синхронизации.

## Git workflow

Перед коммитом:

1. Выполнить git status.
2. Проверить git diff.
3. Не коммитить build-кэш, tsbuildinfo, временные файлы, patch-файлы.
4. Запустить доступные проверки: lint, typecheck, build.
5. Коммит должен быть маленьким и понятным.

Формат коммитов: `fix: ...`, `feat: ...`, `chore: ...`, `refactor: ...`, `docs: ...`.

## Запрещено без отдельного подтверждения

- менять схему БД и миграции;
- удалять файлы;
- массово форматировать проект;
- менять package manager;
- менять структуру API;
- менять дизайн-систему;
- менять env-переменные;
- пушить напрямую в main;
- делать force push;
- коммитить секреты, `.env`, patch-файлы или `tsbuildinfo`.
