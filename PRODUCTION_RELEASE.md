# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Release anchor/backend commit: `213e5076fc274254abf9a56612bd086df2155ce5`
- Backend commit/image: `213e5076fc274254abf9a56612bd086df2155ce5` / `ab-afisha/backend:backend-release-213e507`
- Frontend commit/image: `afc024cfc9f46ebcba1bb383f77f63779062e648` / `ab-afisha/frontend:frontend-release-afc024c`
- Bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`
- Дата утверждения: `2026-09-02`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Production-компоненты закрепляются независимо.

## Текущая promotion — мобильный футер

Текущая promotion меняет **только frontend** до application merge commit `afc024cfc9f46ebcba1bb383f77f63779062e648`. Backend остаётся `213e507`, bots — `3a64511`, nginx не пересоздаётся.

Релиз включает application PR #136, проверенный полным CI #870. Исправлен дефект мобильной версии, показанный на реальном телефонном скриншоте: декоративный блокнот и нижние листья растения в футере обрезались не краем viewport, а внутренним `overflow: hidden` crop-окном.

Корень проблемы:

- mobile footer использует один bitmap `notebook-stationery.png`, но отображает блокнот/растение и чашку через два независимых clipped view;
- старое окно блокнота имело размер `124×158 px`;
- правая кромка блокнота и нижние листья выходили за crop, хотя сама композиция уже находилась внутри мобильного viewport;
- простого сдвига `right` было недостаточно, потому что обрезка происходила внутри crop-контейнера.

Исправление:

- notebook/plant crop: `129×174 px`;
- notebook source width: `180 px` вместо `190 px`;
- notebook position: `right: 10px`;
- существующий `transform: scale(0.9)` сохраняется;
- отдельная чашка сохраняет свою геометрию;
- bitmap `notebook-stationery.png` не меняется;
- desktop/tablet layout не меняется;
- для `max-width: 350px` сохраняется отдельное уменьшение artwork;
- добавлен regression-test `apps/frontend/test/mobile-footer-artwork-clipping.test.mjs`.

## Сохраняемый private MAX source-preview contract

Backend `213e507` и соответствующий frontend-функционал из PR #133 / CI #865 остаются без изменений.

Runtime-диагностика MAX ранее подтвердила для исходного канала:

- `chat.type=channel`;
- `chat.is_public=false`;
- точный `GET /messages/{mid}` возвращает нужное сообщение и правильный `recipient.chat_id`;
- `message.url` отсутствует даже для точного `mid`;
- MAX API не предоставляет canonical permalink на отдельный пост этого приватного канала.

Придумывать или конструировать прямую ссылку на сообщение запрещено.

Backend предоставляет защищённый endpoint `GET /events/admin/:id/source-preview` для `ADMIN` и `EDITOR`. Он получает точное MAX-сообщение по сохранённому `externalId`, проверяет `mid` и `MAX_SOURCE_CHANNEL_ID`, возвращает исходный текст, timestamp, attachments и `directPostUrl` только если MAX реально его предоставил.

Редактор события показывает блок `Исходный пост MAX`. Если canonical permalink отсутствует, join/channel URL используется только как `Открыть канал MAX`. Если MAX когда-либо вернёт валидный `message.url`, интерфейс может показать `Перейти к посту MAX`.

`MaxSourcePostLinkService` проверяет `is_public`, кэширует visibility канала на `6 часов` и для приватного source channel не выполняет бессмысленные minute-by-minute batch `/messages` запросы.

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

Backend entrypoint продолжает использовать `pnpm exec prisma migrate deploy`.

Существующая migration редакционного кабинета:

`apps/backend/prisma/migrations/20260831100000_add_editorial_publisher/migration.sql`

Ручное изменение production-схемы и ручной SQL запрещены.

## Production-гарантии

- backend остаётся `ab-afisha/backend:backend-release-213e507` и **не пересоздаётся**;
- frontend меняется только на `ab-afisha/frontend:frontend-release-afc024c`;
- bots остаются `ab-afisha/bots:bots-release-3a64511` и не пересоздаются;
- nginx не пересоздаётся;
- server-local блок `ai.ab-event.pro` сохраняется;
- PostgreSQL, Redis и uploads volumes сохраняются;
- Telegram IPv6 network сохраняется;
- MAX bindings и редакционный функционал сохраняются;
- `Compiled MAX parser runtime regression tests` остаётся обязательным CI-step.

## Deployment

Использовать только:

`infra/scripts/deploy-pinned-frontend.sh`

Скрипт должен:

1. прочитать точный frontend pin из production lock;
2. собрать frontend из commit `afc024cfc9f46ebcba1bb383f77f63779062e648` в detached worktree;
3. проверить `org.opencontainers.image.revision` образа;
4. выполнить frontend preflight;
5. переключить только frontend через `--no-deps --force-recreate frontend`;
6. не пересоздавать backend, bots или nginx;
7. проверить публичный HTTP;
8. проверить неизменность backend/bots/nginx и server-local файлов;
9. при ошибке автоматически откатить только frontend image.

## Проверка после deployment

Обязательно проверить:

- `https://ab-event.pro/` → HTTP 200;
- frontend image/revision = `afc024cfc9f46ebcba1bb383f77f63779062e648`;
- backend остаётся `213e507`;
- bots остаются `3a64511`;
- nginx не пересоздан;
- в мобильном футере полностью видны правая кромка блокнота и нижние листья растения;
- чашка остаётся отдельным нижним правым объектом и не дублируется рядом с блокнотом;
- desktop/tablet footer не изменён.

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
- frontend release кроме `frontend-release-afc024c`;
- bots release кроме `bots-release-3a64511`;
- пересоздавать backend, bots или nginx;
- терять server-local `ai.ab-event.pro`;
- менять production-таблицы вручную;
- менять bitmap `notebook-stationery.png` в рамках этой promotion;
- использовать backend-only или backend+frontend deployment вместо `deploy-pinned-frontend.sh`.

## Новая версия в будущем

Новая версия становится production только после явного утверждения владельцем проекта и согласованного обновления:

- `infra/deploy/production-frontend.env`;
- `PRODUCTION_RELEASE.md`;
- `docker-compose.production.v2.yml`;
- `AGENTS.md`;
- `CLAUDE.md`;
- `apps/frontend/test/production-release-lock.test.mjs`.
