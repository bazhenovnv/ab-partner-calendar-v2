# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Release anchor commit: `aa13b0f8cf5ea226e05cef5a9edc053428bc70f8`
- Backend commit/image: `aa13b0f8cf5ea226e05cef5a9edc053428bc70f8` / `ab-afisha/backend:backend-release-aa13b0f`
- Bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`
- Frontend commit/image: `aa13b0f8cf5ea226e05cef5a9edc053428bc70f8` / `ab-afisha/frontend:frontend-release-aa13b0f`
- Дата утверждения: `2026-09-01`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Backend + frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Production-компоненты закрепляются независимо.

## Текущая promotion — канонический город при публикации событий

Backend и frontend обновляются до `aa13b0f`; bots остаются на `3a64511`, nginx не пересоздаётся.

Релиз включает исправление PR #125, проверенное полным CI #847. Контракт публикации города:

- формы создания и редактирования `OFFLINE`/`HYBRID` событий используют активный справочник городов вместо произвольного текста;
- сохраняются согласованные `cityId` и канонический `cityName`;
- readiness-индикатор использует то же правило, что и реальный backend publication guard;
- legacy-событие без `cityId` может быть автоматически привязано только при единственном активном case-insensitive exact match по `cityName`;
- fuzzy/contains и неоднозначное совпадение не допускаются;
- `HYBRID` поддерживается формой создания согласованно с backend DTO;
- Prisma schema и migrations не менялись.

## Сохраняемый контракт карусели «Главные события»

Предыдущая promotion PR #123, проверенная полным CI #842, остаётся частью release anchor. Сохраняется следующий контракт:

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

Предыдущие Application PR #119 и PR #121 остаются частью release anchor. Они прошли CI #832 и CI #836; предыдущий merge также проверялся CI #837.

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

**Новой Prisma migration в этой promotion нет.** Поле `EditorialPost.scheduledAt` уже присутствует в production-схеме после ранее применённой migration:

`apps/backend/prisma/migrations/20260831100000_add_editorial_publisher/migration.sql`

Backend image использует `apps/backend/docker-entrypoint.sh`: перед запуском NestJS выполняется `pnpm exec prisma migrate deploy`. При текущем deployment команда должна подтвердить актуальную схему. Ручное изменение production-схемы запрещено.

## Сохраняемые production-гарантии

- bots остаются на `3a64511` / `ab-afisha/bots:bots-release-3a64511` и не пересоздаются;
- nginx не пересоздаётся;
- server-local блок `ai.ab-event.pro` должен быть сохранён;
- persistent volumes PostgreSQL, Redis и uploads сохраняются;
- Telegram IPv6 network остаётся без изменения;
- MAX bindings и редакционный функционал сохраняются;
- compiled MAX parser runtime regression продолжает проверять `Экспофорум, Санкт-Петербург`, canonical city и hybrid cases.

## Deployment

Использовать только `infra/scripts/deploy-pinned-backend-frontend.sh`.

Скрипт должен:

1. прочитать точные component pins из production lock;
2. собрать backend и frontend из release anchor `aa13b0f` в detached worktree;
3. проверить `org.opencontainers.image.revision` обоих образов;
4. выполнить preflight;
5. переключить backend, где entrypoint запускает `prisma migrate deploy`;
6. дождаться healthy backend;
7. переключить frontend;
8. проверить публичный HTTP и canonical-city runtime contract;
9. подтвердить неизменность bots, nginx и server-local файлов;
10. при ошибке автоматически откатить backend/frontend images.

Ожидаемый финальный marker:

`PRODUCTION_BACKEND_FRONTEND_PIN_OK=true`

## Проверка после deployment

Обязательно проверить:

- `https://ab-event.pro/` → HTTP 200;
- `https://ab-event.pro/api/health` → HTTP 200;
- публичный справочник городов содержит каноническую `Москва` и не содержит не-городские значения;
- legacy published events с единственным точным активным совпадением города корректно проходят canonical-city runtime contract;
- `/events/public/main` не обрезается до пяти активных событий;
- при 7 активных главных событиях порядок окна соответствует `1–5 → 2–6 → 3–7 → 4–7+1`;
- если активных событий 3, карусель содержит эти 3 активных и до 2 последних `COMPLETED`;
- завершённые не вытесняют активные;
- `/admin/main-events` показывает все участвующие активные события и корректный резерв завершённых;
- `/admin/editorial` и третий MAX target продолжают работать;
- bots и nginx не были пересозданы;
- локальный `ai.ab-event.pro` продолжает проходить `nginx -t`.

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
- любой frontend release кроме `frontend-release-aa13b0f`;
- пересоздание bots или nginx;
- изменение или потеря server-local блока `ai.ab-event.pro`;
- ручное изменение production-таблиц;
- использование frontend-only или backend-only deploy вместо `deploy-pinned-backend-frontend.sh` для этой promotion.

## Новая версия в будущем

Новая версия становится production только после явного утверждения владельца проекта и согласованного обновления:

- `infra/deploy/production-frontend.env`;
- `PRODUCTION_RELEASE.md`;
- `docker-compose.production.v2.yml`;
- `AGENTS.md`;
- `CLAUDE.md`;
- `apps/frontend/test/production-release-lock.test.mjs`.
