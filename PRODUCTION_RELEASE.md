# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Release anchor/backend commit: `8f2f74ac633e12212688f2d52b2df86502850cdd`
- Backend commit/image: `8f2f74ac633e12212688f2d52b2df86502850cdd` / `ab-afisha/backend:backend-release-8f2f74a`
- Bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`
- Frontend commit/image: `3420a9d37b64ed00be26932a6a09cf72d02307cd` / `ab-afisha/frontend:frontend-release-3420a9d`
- Дата утверждения: `2026-09-01`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Backend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Production-компоненты закрепляются независимо.

## Текущая promotion — каноническая ссылка на исходный пост MAX

Меняется только backend до `8f2f74a`; frontend остаётся `3420a9d`, bots — `3a64511`, nginx не пересоздаётся.

Релиз включает PR #131, проверенный полным CI #859. Исправлен механизм `sourcePostUrl` для импортированных событий MAX:

- прежний импорт формировал `sourcePostUrl` как join-ссылку канала с `?mid=...`; такая ссылка открывает канал, но не гарантирует переход к конкретному сообщению;
- backend использует сохранённый `externalId` сообщения (`mid`) и официальный MAX endpoint `GET /messages?message_ids=...`;
- в `sourcePostUrl` сохраняется только официальный `message.url`, возвращённый MAX;
- перед сохранением проверяется соответствие `recipient.chat_id` настроенному `MAX_SOURCE_CHANNEL_ID`;
- принимаются только HTTPS URL на `max.ru` или его поддомене;
- старые записи с отсутствующей ссылкой или `/join/` ремонтируются при старте backend и затем проверяются каждую минуту;
- если MAX не возвращает `message.url`, backend не придумывает permalink;
- Prisma schema и migrations не меняются.

## Сохраняемая строка «Ссылка на источник» в админке

Frontend `3420a9d` из PR #129 / CI #855 остаётся без изменений:

- сохранённый `sourcePostUrl` отображается в форме редактирования как read-only поле «Ссылка на источник»;
- рядом находится кнопка «Перейти на источник»;
- кнопка открывает тот же сохранённый URL в новой вкладке с `noopener noreferrer`;
- верхняя кнопка «Перейти к событию» отсутствует.

После backend-ремонта эта же форма автоматически начинает показывать и открывать официальный `message.url` без дополнительного frontend-релиза.

## Сохраняемый canonical-city publication flow

PR #125 / CI #847 остаётся действующим в новом backend как часть его истории:

- формы создания и редактирования `OFFLINE`/`HYBRID` событий используют активный справочник городов;
- сохраняются согласованные `cityId` и канонический `cityName`;
- readiness-индикатор использует то же правило, что и backend publication guard;
- legacy-событие без `cityId` может быть автоматически привязано только при единственном активном case-insensitive exact match по `cityName`;
- fuzzy/contains и неоднозначное совпадение не допускаются;
- `HYBRID` поддерживается формой создания согласованно с backend DTO.

## Сохраняемый контракт карусели «Главные события»

PR #123 / CI #842 остаётся частью production:

- backend отдаёт весь упорядоченный список опубликованных главных событий с `mainEvent=true`, отдельной `mainEventUrl` и активным состоянием `PLANNED` или `LIVE`;
- одновременно отображается до пяти карточек;
- начальное окно для семи активных событий: `1 2 3 4 5`;
- следующий шаг: `2 3 4 5 6`, затем `3 4 5 6 7`;
- после исчерпания новых событий цикл продолжается с первого: `4 5 6 7 1`, затем `5 6 7 1 2` и далее;
- свайп, стрелки и автоматическая прокрутка используют один и тот же циклический порядок;
- завершившееся событие больше не входит в активную последовательность;
- если активных `PLANNED`/`LIVE` событий меньше пяти, только недостающие места заполняются последними `COMPLETED` главными событиями;
- завершённые события никогда не вытесняют активные и не ограничивают полный цикл активных событий.

## Сохраняемый редакционный функционал

Application PR #119 и PR #121 остаются частью production. Они прошли CI #832 и CI #836; предыдущий merge также проверялся CI #837.

Сохраняются:

- режим `Разместить сейчас` или `Запланировать`;
- серверная очередь запланированных публикаций каждые 15 секунд;
- атомарный переход `SCHEDULED -> PUBLISHING`;
- использование существующего `EditorialPost.scheduledAt`;
- image-processing на Sharp;
- шаблоны 1:1, 4:5, 16:9 и 9:16 сохраняют весь кадр через `fit: contain`;
- `Оригинальный размер` как безопасный формат по умолчанию;
- сохранение уже успешно обработанных изображений при частичной ошибке пачки;
- единый предварительный просмотр;
- колонки MAX и ТГ;
- три MAX target:
  - `Макс - "АБ Афиша бухгалтера простая"`;
  - `Макс - "АБ| Афиша бухгалтера"`;
  - `Макс - "АБ| Пратнер"`;
- третий MAX join-link `https://max.ru/join/iPKA4EFVMhPU9oJXqHDk7vRhD4Tl0BAswVkqfxW8iYA`;
- runtime binding `MAX_EDITORIAL_CHANNEL_3_ID`;
- persistent binding `editorial.max.binding.MAX_CHANNEL_3`;
- native MAX views и экран `/admin/editorial/max-channels`.

## Prisma schema / migration

**Новой Prisma migration в этой promotion нет.** Существующая production-схема не меняется. Поле `EditorialPost.scheduledAt` уже присутствует после migration:

`apps/backend/prisma/migrations/20260831100000_add_editorial_publisher/migration.sql`

Ручное изменение production-схемы запрещено.

## Сохраняемые production-гарантии

- frontend остаётся `3420a9d` / `ab-afisha/frontend:frontend-release-3420a9d` и не пересоздаётся;
- bots остаются `3a64511` / `ab-afisha/bots:bots-release-3a64511` и не пересоздаются;
- nginx не пересоздаётся;
- server-local блок `ai.ab-event.pro` сохраняется;
- persistent volumes PostgreSQL, Redis и uploads сохраняются;
- Telegram IPv6 network остаётся без изменения;
- MAX bindings и редакционный функционал сохраняются;
- compiled MAX parser runtime regression продолжает проверять `Экспофорум, Санкт-Петербург`, canonical city и hybrid cases.

## Deployment

Использовать только `infra/scripts/deploy-pinned-backend.sh`.

Скрипт должен:

1. прочитать точный backend pin из production lock;
2. собрать backend из commit `8f2f74ac633e12212688f2d52b2df86502850cdd` в detached worktree;
3. проверить `org.opencontainers.image.revision` образа;
4. выполнить backend preflight и health checks;
5. переключить только backend через `--no-deps --force-recreate backend`;
6. проверить публичный health/runtime;
7. подтвердить неизменность frontend, bots, nginx и server-local config;
8. при ошибке автоматически откатить только backend image.

## Проверка после deployment

Обязательно проверить:

- `https://ab-event.pro/` и `/api/health` → HTTP 200;
- backend image/revision соответствует `8f2f74a`;
- в backend log присутствует результат `MAX source-link repair` либо отсутствуют legacy `/join/` записи;
- для контрольного `externalId=mid.ffffbab719b28a8e01a05c80a30b2250` поле `sourcePostUrl` после ремонта больше не является join-ссылкой, если MAX вернул `message.url`;
- в `/admin/events/:id` поле «Ссылка на источник» показывает обновлённый URL, а кнопка «Перейти на источник» открывает именно его;
- frontend, bots и nginx не были пересозданы;
- canonical-city publication flow и карусель «Главные события» сохраняют утверждённые контракты.

## Обязательное правило

Перед любыми изменениями, сборкой, откатом или deployment прочитать:

1. `PRODUCTION_RELEASE.md`;
2. `infra/deploy/production-frontend.env`;
3. `AGENTS.md`;
4. `CLAUDE.md`.

Нельзя определять production по `main`, `latest`, `APP_VERSION`, rollback-образу или последнему Docker image. Разрешено использовать только component commits/images из production lock.

## Запрещено для текущего релиза

- `latest` для backend, bots или frontend;
- любой backend release кроме `backend-release-8f2f74a`;
- любой bots release кроме `bots-release-3a64511`;
- любой frontend release кроме `frontend-release-3420a9d`;
- пересоздание frontend, bots или nginx;
- изменение или потеря server-local блока `ai.ab-event.pro`;
- ручное изменение production-таблиц;
- использование frontend-only или backend+frontend deploy вместо `deploy-pinned-backend.sh` для этой promotion.

## Новая версия в будущем

Новая версия становится production только после явного утверждения владельца проекта и согласованного обновления:

- `infra/deploy/production-frontend.env`;
- `PRODUCTION_RELEASE.md`;
- `docker-compose.production.v2.yml`;
- `AGENTS.md`;
- `CLAUDE.md`;
- `apps/frontend/test/production-release-lock.test.mjs`.
