# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Release anchor / backend commit: `213e5076fc274254abf9a56612bd086df2155ce5`
- Backend image: `ab-afisha/backend:backend-release-213e507`
- Frontend commit: `4aa0bd5f32889a92c4afa332b8a15e32df2c13b8`
- Frontend image: `ab-afisha/frontend:frontend-release-4aa0bd5`
- Bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`
- Дата утверждения: `2026-09-03`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Production-компоненты закрепляются независимо: release anchor остаётся на backend `213e507`, а frontend продвигается отдельно до `4aa0bd5`.

## Текущая promotion — мобильная quote-band и выравнивание бренда/контактов

Текущая promotion меняет **только frontend** до application merge commit `4aa0bd5f32889a92c4afa332b8a15e32df2c13b8`.

Application PR #148 / CI #898 вносит мобильные коррекции:

- зона с изображениями ног выше quote-band остаётся серой `#f1f1f1`;
- белая quote-band накрывает нижнюю часть изображений ног, поэтому ноги визуально уходят **под** белый фон цитаты;
- quote-band имеет `height: 114px`, `bottom: 8px`, `z-index: 2`;
- изображения людей имеют `z-index: 1`, мятная рамка/цитата `z-index: 3`;
- верхний и нижний визуальный отступы белой quote-band относительно мятной рамки выравниваются;
- симметричная тень quote-band сверху и снизу сохраняется;
- колонка «Контакты» больше не поднята на `-2px` и выровнена с «Наши проекты»;
- footer title «Афиша бухгалтера» опущен до `top: 7px` относительно логотипа;
- верхний mobile header title «Афиша Бухгалтера» опущен до `top: 4px` относительно логотипа;
- notebook crop, desktop header, desktop footer и desktop quotes не меняются.

## Сохраняемый iOS swipe

Сохраняется PR #146 / CI #894:

- Android, мышь и pen продолжают использовать существующий Pointer Events path;
- только iOS/iPadOS получает отдельный native Touch Events path на **всю gallery-зону** карусели;
- direction lock срабатывает после `7 px`, поэтому вертикальная прокрутка страницы сохраняется;
- подтверждённый горизонтальный жест использует `touchmove` с `passive: false` и `preventDefault()` только после определения горизонтального направления;
- iOS swipe threshold = `28 px`;
- drag feedback сохраняется через существующие `--drag-offset` и `--card-motion-duration`;
- после горизонтального swipe подавляется случайный click по карточке;
- переход выполняется через существующий `ArrowLeft` / `ArrowRight` path.

## Сохраняемое выравнивание compact-карусели «Главные события»

Сохраняется PR #142 / CI #887:

- боковые карточки в compact-режиме (`max-width: 1023px`) не имеют `rotateY` и `rotateZ`;
- верхние и нижние края карточек остаются горизонтальными, боковые края — вертикальными;
- сохраняются `translateX`, `translateY`, `translateZ`, `scale`, `opacity`, `brightness`, `blur` и `z-index`;
- эффект глубины и перекрытия карусели сохраняется;
- desktop-геометрия не меняется.

## Сохраняемый мобильный футер

Сохраняются PR #138 / CI #873, PR #140 / CI #879 и PR #144 / CI #891:

- блокнот расположен у правой границы мобильного viewport;
- отрицательный внутренний сдвиг source bitmap удалён;
- crop блокнота не показывает лишний фрагмент чашки справа;
- нижние мятные листья остаются видимыми;
- для экранов до 350 px используется отдельная безопасная геометрия;
- desktop footer не меняется.

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

## Сохраняемый редакционный функционал

Сохраняются application PR #119 / CI #832 и PR #121 / CI #836:

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
- frontend меняется только на `ab-afisha/frontend:frontend-release-4aa0bd5`;
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
2. собрать frontend из commit `4aa0bd5f32889a92c4afa332b8a15e32df2c13b8` в detached worktree;
3. проверить `org.opencontainers.image.revision`;
4. выполнить frontend preflight;
5. переключить только frontend;
6. не пересоздавать backend, bots и nginx;
7. проверить публичный HTTP;
8. при ошибке автоматически откатить frontend на предыдущий образ.

## Проверка после deployment

Обязательно проверить:

- `https://ab-event.pro/` → HTTP 200;
- frontend image = `ab-afisha/frontend:frontend-release-4aa0bd5`;
- frontend revision = `4aa0bd5f32889a92c4afa332b8a15e32df2c13b8`;
- backend остаётся `ab-afisha/backend:backend-release-213e507`;
- bots остаются `ab-afisha/bots:bots-release-3a64511`;
- nginx не пересоздан;
- на мобильном белая quote-band накрывает нижнюю часть ног;
- серый фон над quote-band сохраняется;
- верхний и нижний отступы белой полосы относительно мятной рамки визуально сбалансированы;
- «Контакты» находятся на уровне «Наши проекты»;
- footer title «Афиша бухгалтера» опущен ниже относительно логотипа;
- header title «Афиша Бухгалтера» опущен ниже относительно логотипа;
- на Android свайп «Главных событий» работает как до promotion;
- на iPhone/iPad короткий горизонтальный swipe уверенно переключает карточку;
- desktop carousel, quotes, header и footer визуально не изменены.

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
- frontend release кроме `frontend-release-4aa0bd5`;
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
