# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Release anchor: `213e5076fc274254abf9a56612bd086df2155ce5`
- Backend commit/image: `213e5076fc274254abf9a56612bd086df2155ce5` / `ab-afisha/backend:backend-release-213e507`
- Frontend commit/image: `213e5076fc274254abf9a56612bd086df2155ce5` / `ab-afisha/frontend:frontend-release-213e507`
- Bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`
- Дата утверждения: `2026-09-01`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Backend + frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Production-компоненты закрепляются независимо.

## Текущая promotion — исходный пост приватного MAX-канала

Текущая promotion меняет **backend и frontend** до application merge commit `213e5076fc274254abf9a56612bd086df2155ce5`. Bots остаются `3a64511`, nginx не пересоздаётся.

Релиз включает application PR #133, проверенный полным CI #865. Runtime-диагностика MAX подтвердила для исходного канала:

- `chat.type=channel`;
- `chat.is_public=false`;
- точный `GET /messages/{mid}` возвращает нужное сообщение и правильный `recipient.chat_id`;
- `message.url` отсутствует даже для точного `mid`;
- следовательно, MAX API не предоставляет canonical permalink на отдельный пост этого приватного канала.

Придумывать или конструировать прямую ссылку на сообщение запрещено.

## Backend: защищённый source preview

Backend добавляет защищённый endpoint:

`GET /events/admin/:id/source-preview`

Доступ — только `ADMIN` и `EDITOR` через существующие `JwtAuthGuard` + `RolesGuard`.

`MaxSourcePreviewService`:

- загружает Event из БД и использует сохранённый `externalId` как точный MAX `mid`;
- запрашивает `GET https://platform-api2.max.ru/messages/{mid}`;
- проверяет, что возвращённый `body.mid` совпадает с `externalId`;
- проверяет, что `recipient.chat_id === MAX_SOURCE_CHANNEL_ID`;
- отдельно читает данные канала через `/chats/{chat_id}`;
- возвращает исходный текст, timestamp, вложения, данные канала и `directPostUrl`, только если MAX реально вернул допустимый URL;
- не создаёт фиктивный permalink;
- Prisma schema и migrations не меняет.

## Backend: отключение бессмысленного repair для приватного канала

Существующий `MaxSourcePostLinkService` сохраняется для случая, если исходный канал когда-либо станет публичным, но теперь перед попытками ремонта проверяет `is_public` канала.

Для приватного канала:

- repair возвращает `skipped=true` до запроса пачки сообщений;
- ежеминутные бессмысленные запросы за отсутствующими `message.url` прекращаются;
- visibility канала кэшируется на `6 часов` (`CHANNEL_VISIBILITY_TTL_MS`), чтобы не создавать лишний MAX API traffic;
- в лог один раз выводится понятное сообщение: source-link repair пропущен, потому что канал приватный и MAX не выдаёт canonical `message.url`;
- если канал в будущем станет публичным, после истечения TTL проверка может снова разрешить canonical repair.

Cron остаётся раз в минуту, но для приватного канала фактический message-link repair не выполняется.

## Frontend: исходный MAX-пост прямо в редакторе события

В `/admin/events/:id` добавлен `MaxSourcePreviewCard`.

Для MAX-события карточка показывает:

- заголовок `Исходный пост MAX`;
- исходный текст сообщения;
- время публикации в `Europe/Moscow`;
- название канала;
- точный `mid`;
- изображения из MAX attachment, а при их отсутствии — безопасный fallback на сохранённое изображение события;
- понятное сообщение для приватного канала о том, что MAX API не предоставляет прямую ссылку на отдельный пост.

Навигация имеет два режима:

- если MAX реально вернул `directPostUrl` — кнопка `Перейти к посту MAX`;
- если canonical permalink отсутствует, но доступна join/channel URL — кнопка `Открыть канал MAX`.

Сохранённое поле `sourcePostUrl` по-прежнему отображается read-only как `Ссылка на источник`. Если это `/join/` URL приватного канала, он не называется прямой ссылкой на пост.

## Сохраняемый canonical-city publication flow

Сохраняются PR #125 / CI #847:

- формы создания и редактирования `OFFLINE`/`HYBRID` используют активный справочник городов;
- сохраняются согласованные `cityId + cityName`;
- readiness совпадает с реальным backend publication guard;
- legacy `cityName` без `cityId` автоматически связывается только при единственном активном case-insensitive exact match;
- fuzzy/contains и неоднозначная автопривязка запрещены.

## Сохраняемый контракт карусели «Главные события»

Сохраняются PR #123 / CI #842:

- backend отдаёт полный упорядоченный список опубликованных `mainEvent=true` с активным `PLANNED` или `LIVE`;
- одновременно показывается до пяти карточек;
- окно циклически сдвигается на одну карточку;
- завершённые события используются только как fallback, если активных меньше пяти.

## Сохраняемый редакционный функционал

Сохраняются application PR #119 / CI #832 и PR #121 / CI #836, включая ранее проверенный CI #837:

- `Разместить сейчас` / `Запланировать`;
- очередь публикаций каждые 15 секунд;
- атомарный `SCHEDULED -> PUBLISHING`;
- существующий `EditorialPost.scheduledAt`;
- Sharp image-processing с `fit: contain`;
- единый предварительный просмотр;
- колонки MAX и ТГ;
- три MAX target;
- `MAX_EDITORIAL_CHANNEL_3_ID`;
- persistent binding `editorial.max.binding.MAX_CHANNEL_3`;
- третий join-link `https://max.ru/join/iPKA4EFVMhPU9oJXqHDk7vRhD4Tl0BAswVkqfxW8iYA`.

## Prisma schema / migration

**Новой Prisma migration в этой promotion нет.**

Backend entrypoint продолжает использовать:

`pnpm exec prisma migrate deploy`

Существующая migration редакционного кабинета:

`apps/backend/prisma/migrations/20260831100000_add_editorial_publisher/migration.sql`

Ручное изменение production-схемы и ручной SQL запрещены.

## Production-гарантии

- backend меняется только на `ab-afisha/backend:backend-release-213e507`;
- frontend меняется только на `ab-afisha/frontend:frontend-release-213e507`;
- bots остаются `ab-afisha/bots:bots-release-3a64511` и не пересоздаются;
- nginx не пересоздаётся;
- server-local блок `ai.ab-event.pro` сохраняется;
- PostgreSQL, Redis и uploads volumes сохраняются;
- Telegram IPv6 network сохраняется;
- MAX bindings и редакционный функционал сохраняются;
- `Compiled MAX parser runtime regression tests` остаётся обязательным CI-step.

## Deployment

Использовать только:

`infra/scripts/deploy-pinned-backend-frontend.sh`

Скрипт должен:

1. прочитать точные backend/frontend pins из production lock;
2. собрать backend и frontend из commit `213e5076fc274254abf9a56612bd086df2155ce5` в detached worktree;
3. проверить `org.opencontainers.image.revision` обоих образов;
4. выполнить preflight и health checks;
5. переключить только backend и frontend;
6. не пересоздавать bots и nginx;
7. проверить публичный HTTP/health;
8. при ошибке автоматически откатить backend и frontend на предыдущие образы.

## Проверка после deployment

Обязательно проверить:

- `https://ab-event.pro/` → HTTP 200;
- `https://ab-event.pro/api/health` → HTTP 200;
- backend image/revision = `213e5076fc274254abf9a56612bd086df2155ce5`;
- frontend image/revision = `213e5076fc274254abf9a56612bd086df2155ce5`;
- bots остаются `3a64511`;
- nginx не пересоздан;
- backend log для приватного исходного MAX-канала содержит однократный skip source-link repair вместо повторяющихся message-link ошибок;
- в редакторе реального MAX-события блок `Исходный пост MAX` загружает точный текст и `mid`;
- для приватного канала отображается `Открыть канал MAX`, а не обещание прямого перехода на конкретный пост;
- если `directPostUrl` отсутствует, никакой permalink не конструируется.

Контрольный `mid` из runtime-диагностики:

`mid.ffffbab719b28a8e01a05c80a30b2250`

Для него MAX подтвердил принадлежность исходному каналу, но не вернул `message.url`.

## Обязательное правило

Перед любыми изменениями, сборкой, откатом или deployment прочитать:

1. `PRODUCTION_RELEASE.md`;
2. `infra/deploy/production-frontend.env`;
3. `AGENTS.md`;
4. `CLAUDE.md`.

Нельзя определять production по `main`, `latest`, `APP_VERSION`, rollback-образу или последнему Docker image. Разрешены только component commits/images из production lock.

## Запрещено для текущего релиза

- использовать `latest` для backend/frontend/bots;
- backend release кроме `backend-release-213e507`;
- frontend release кроме `frontend-release-213e507`;
- bots release кроме `bots-release-3a64511`;
- пересоздавать bots или nginx;
- терять server-local `ai.ab-event.pro`;
- менять production-таблицы вручную;
- придумывать MAX permalink для приватного сообщения;
- использовать frontend-only или backend-only deployment для этой promotion.

## Новая версия в будущем

Новая версия становится production только после явного утверждения владельцем проекта и согласованного обновления:

- `infra/deploy/production-frontend.env`;
- `PRODUCTION_RELEASE.md`;
- `docker-compose.production.v2.yml`;
- `AGENTS.md`;
- `CLAUDE.md`;
- `apps/frontend/test/production-release-lock.test.mjs`.
