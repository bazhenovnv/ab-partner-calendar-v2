# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Release anchor/backend commit: `aa13b0f8cf5ea226e05cef5a9edc053428bc70f8`
- Backend commit/image: `aa13b0f8cf5ea226e05cef5a9edc053428bc70f8` / `ab-afisha/backend:backend-release-aa13b0f`
- Bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`
- Frontend commit/image: `3420a9d37b64ed00be26932a6a09cf72d02307cd` / `ab-afisha/frontend:frontend-release-3420a9d`
- Дата утверждения: `2026-09-01`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Production-компоненты закрепляются независимо.

## Текущая promotion — ссылка на источник в карточке события

Меняется только frontend до `3420a9d`; backend остаётся на `aa13b0f`, bots — на `3a64511`, nginx не пересоздаётся.

Релиз включает PR #129, проверенный полным CI #855. Контракт строки «Ссылка на источник»:

- сохранённый `sourcePostUrl` отображается в форме редактирования как отдельное read-only поле «Ссылка на источник»;
- значение `sourcePostUrl` не изменяется и не конструируется заново;
- рядом с полем отображается кнопка «Перейти на источник»;
- кнопка открывает тот же сохранённый URL в новой вкладке с `noopener noreferrer`;
- кнопка активна только для HTTP(S)-ссылки;
- прежняя верхняя кнопка «Перейти к событию» удалена;
- backend, Prisma schema, migrations, импорт MAX, bots и nginx не изменяются.

## Сохраняемый canonical-city publication flow

Предыдущая promotion PR #125 / CI #847 остаётся действующей на backend `aa13b0f`:

- формы создания и редактирования `OFFLINE`/`HYBRID` событий используют активный справочник городов вместо произвольного текста;
- сохраняются согласованные `cityId` и канонический `cityName`;
- readiness-индикатор использует то же правило, что и реальный backend publication guard;
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

**Новой Prisma migration в этой promotion нет. Backend не меняется.** Поле `EditorialPost.scheduledAt` уже присутствует в production-схеме после ранее применённой migration:

`apps/backend/prisma/migrations/20260831100000_add_editorial_publisher/migration.sql`

Ручное изменение production-схемы запрещено.

## Сохраняемые production-гарантии

- backend остаётся на `aa13b0f` / `ab-afisha/backend:backend-release-aa13b0f` и не пересоздаётся;
- bots остаются на `3a64511` / `ab-afisha/bots:bots-release-3a64511` и не пересоздаются;
- nginx не пересоздаётся;
- server-local блок `ai.ab-event.pro` должен быть сохранён;
- persistent volumes PostgreSQL, Redis и uploads сохраняются;
- Telegram IPv6 network остаётся без изменения;
- MAX bindings и редакционный функционал сохраняются;
- compiled MAX parser runtime regression продолжает проверять `Экспофорум, Санкт-Петербург`, canonical city и hybrid cases.

## Deployment

Использовать только `infra/scripts/deploy-pinned-frontend.sh`.

Скрипт должен:

1. прочитать точный frontend pin из production lock;
2. собрать frontend из commit `3420a9d37b64ed00be26932a6a09cf72d02307cd` в detached worktree;
3. проверить `org.opencontainers.image.revision` образа;
4. выполнить frontend preflight;
5. переключить только frontend через `--no-deps --force-recreate frontend`;
6. проверить публичный HTTP;
7. подтвердить неизменность backend, bots, nginx, server-local config и root git status;
8. при ошибке автоматически откатить только frontend image.

Ожидаемый финальный marker:

`PRODUCTION_PIN_OK`

## Проверка после deployment

Обязательно проверить:

- `https://ab-event.pro/` → HTTP 200;
- `/admin/events/:id` для события с `sourcePostUrl` показывает read-only поле «Ссылка на источник»;
- рядом с ним находится кнопка «Перейти на источник»;
- кнопка открывает тот же сохранённый URL в новой вкладке;
- верхней кнопки «Перейти к событию» больше нет;
- canonical-city publication flow продолжает работать;
- карусель «Главные события» сохраняет утверждённый циклический контракт;
- backend, bots и nginx не были пересозданы;
- локальный `ai.ab-event.pro` и server-local nginx config сохранены.

## Обязательное правило

Перед любыми изменениями, сборкой, откатом или deployment прочитать:

1. `PRODUCTION_RELEASE.md`;
2. `infra/deploy/production-frontend.env`;
3. `AGENTS.md`;
4. `CLAUDE.md`.

Нельзя определять production по `main`, `latest`, `APP_VERSION`, rollback-образу или последнему Docker image. Разрешено использовать только component commits/images из production lock.

## Запрещено для текущего релиза

- `latest` для backend, bots или frontend;
- любой backend release кроме `backend-release-aa13b0f`;
- любой bots release кроме `bots-release-3a64511`;
- любой frontend release кроме `frontend-release-3420a9d`;
- пересоздание backend, bots или nginx;
- изменение или потеря server-local блока `ai.ab-event.pro`;
- ручное изменение production-таблиц;
- использование backend-only или backend+frontend deploy вместо `deploy-pinned-frontend.sh` для этой promotion.

## Новая версия в будущем

Новая версия становится production только после явного утверждения владельца проекта и согласованного обновления:

- `infra/deploy/production-frontend.env`;
- `PRODUCTION_RELEASE.md`;
- `docker-compose.production.v2.yml`;
- `AGENTS.md`;
- `CLAUDE.md`;
- `apps/frontend/test/production-release-lock.test.mjs`.
