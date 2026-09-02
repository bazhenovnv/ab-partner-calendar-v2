# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Release anchor / backend commit: `213e5076fc274254abf9a56612bd086df2155ce5`
- Backend image: `ab-afisha/backend:backend-release-213e507`
- Frontend commit: `0549f7c10f053dc04813f317cc5df23971f5135a`
- Frontend image: `ab-afisha/frontend:frontend-release-0549f7c`
- Bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`
- Дата утверждения: `2026-09-02`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Production-компоненты закрепляются независимо: release anchor остаётся на backend `213e507`, а frontend продвигается отдельно до `0549f7c`.

## Текущая promotion — финальная коррекция мобильного футера

Текущая promotion меняет **только frontend** до application merge commit `0549f7c10f053dc04813f317cc5df23971f5135a` из PR #140. Изменение прошло полный CI #879.

Исправление относится только к мобильному футеру (`max-width: 767px`):

- декоративный блокнот возвращён ближе к правой границе viewport положительным right-offset;
- предыдущий отрицательный внутренний сдвиг source bitmap удалён: `left: 0` вместо `left: -10px`;
- crop блокнота сужен до безопасной области, чтобы справа не попадал фрагмент чашки из общего bitmap;
- высота crop сохранена, поэтому нижние мятные листья остаются видимыми;
- для экранов до 350 px закреплена отдельная безопасная геометрия;
- чашка остаётся отдельным независимо позиционируемым фрагментом;
- исходный `notebook-stationery.png` не меняется;
- desktop footer не меняется;
- backend, Prisma schema/migrations, bots и nginx не меняются.

## Сохраняемый контракт приватного MAX source preview

Сохраняется application PR #133 / CI #865 и production runtime-диагностика:

- source channel MAX имеет `type=channel`, `is_public=false`;
- точный `GET /messages/{mid}` возвращает нужное сообщение и правильный `recipient.chat_id`;
- `message.url` для приватного канала отсутствует;
- запрещено выдавать `/join/...?...mid=...` за permalink конкретного поста;
- защищённый `GET /events/admin/:id/source-preview` получает точное сообщение по сохранённому `externalId`;
- редактор показывает блок `Исходный пост MAX` с исходным текстом, датой/временем, `mid` и доступными вложениями;
- для приватного канала используется действие `Открыть канал MAX`;
- если MAX реально вернёт `directPostUrl`, разрешено действие `Перейти к посту MAX`;
- source-link repair сначала проверяет `is_public`, кэширует visibility на `6 часов` и не выполняет бессмысленные minute-by-minute batch message-link запросы для приватного канала.

## Сохраняемый canonical-city publication flow

Сохраняется PR #125 / CI #847:

- формы создания и редактирования `OFFLINE`/`HYBRID` используют активный справочник городов;
- сохраняются согласованные `cityId + cityName`;
- readiness совпадает с реальным backend publication guard;
- legacy `cityName` без `cityId` автоматически связывается только при единственном активном case-insensitive exact match;
- fuzzy/contains и неоднозначная автопривязка запрещены.

## Сохраняемый контракт карусели «Главные события»

Сохраняется PR #123 / CI #842:

- backend отдаёт полный упорядоченный список опубликованных `mainEvent=true` с `PLANNED` или `LIVE`;
- одновременно показывается до пяти карточек;
- окно циклически сдвигается на одну карточку;
- завершённые события используются только как fallback, если активных меньше пяти.

## Сохраняемый редакционный функционал

Сохраняются application PR #119 / CI #832 и PR #121 / CI #836, включая:

- `Разместить сейчас` / `Запланировать`;
- очередь публикаций каждые 15 секунд;
- атомарный `SCHEDULED -> PUBLISHING`;
- существующий `EditorialPost.scheduledAt`;
- Sharp image-processing с `fit: contain`;
- единый предварительный просмотр;
- три MAX target;
- `MAX_EDITORIAL_CHANNEL_3_ID`;
- persistent binding `editorial.max.binding.MAX_CHANNEL_3`;
- третий join-link `https://max.ru/join/iPKA4EFVMhPU9oJXqHDk7vRhD4Tl0BAswVkqfxW8iYA`.

## Prisma schema / migration

**Новой Prisma migration в этой promotion нет.**

Backend остаётся на `213e507` и продолжает использовать `pnpm exec prisma migrate deploy`. Ручное изменение production-схемы и ручной SQL запрещены.

## Production-гарантии

- backend остаётся `ab-afisha/backend:backend-release-213e507` и не пересоздаётся;
- frontend меняется только на `ab-afisha/frontend:frontend-release-0549f7c`;
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
2. собрать frontend из commit `0549f7c10f053dc04813f317cc5df23971f5135a` в detached worktree;
3. проверить `org.opencontainers.image.revision`;
4. выполнить frontend preflight;
5. переключить только frontend;
6. не пересоздавать backend, bots и nginx;
7. проверить публичный HTTP;
8. при ошибке автоматически откатить frontend на предыдущий образ.

## Проверка после deployment

Обязательно проверить:

- `https://ab-event.pro/` → HTTP 200;
- frontend image = `ab-afisha/frontend:frontend-release-0549f7c`;
- frontend revision = `0549f7c10f053dc04813f317cc5df23971f5135a`;
- backend остаётся `ab-afisha/backend:backend-release-213e507`;
- bots остаются `ab-afisha/bots:bots-release-3a64511`;
- nginx не пересоздан;
- на мобильном viewport блокнот расположен у правой границы, нижние листья видимы и фрагмент второй чашки справа не появляется;
- desktop footer визуально не изменён.

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
- frontend release кроме `frontend-release-0549f7c`;
- bots release кроме `bots-release-3a64511`;
- пересоздавать backend, bots или nginx;
- терять server-local `ai.ab-event.pro`;
- менять production-таблицы вручную;
- использовать backend-only или backend+frontend deployment для этой frontend-only promotion.

## Новая версия в будущем

Новая версия становится production только после явного утверждения владельцем проекта и согласованного обновления:

- `infra/deploy/production-frontend.env`;
- `PRODUCTION_RELEASE.md`;
- `docker-compose.production.v2.yml`;
- `AGENTS.md`;
- `CLAUDE.md`;
- `apps/frontend/test/production-release-lock.test.mjs`.
