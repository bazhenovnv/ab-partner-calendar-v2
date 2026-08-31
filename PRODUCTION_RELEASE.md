# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Release anchor commit: `9ecf18060b600e3575d86755dcebd9a2ee3f14ff`
- Backend commit/image: `9ecf18060b600e3575d86755dcebd9a2ee3f14ff` / `ab-afisha/backend:backend-release-9ecf180`
- Bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`
- Frontend commit/image: `9ecf18060b600e3575d86755dcebd9a2ee3f14ff` / `ab-afisha/frontend:frontend-release-9ecf180`
- Дата утверждения: `2026-08-31`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Backend + frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Production-компоненты закрепляются независимо.

## Текущая promotion — время размещения и изображения редакционного кабинета

Backend и frontend обновляются до `9ecf180`; bots остаются на `3a64511`, nginx не пересоздаётся.

Application PR #119 исправляет и расширяет `/admin/editorial`. PR #119 прошёл полный CI #832 перед merge: lint, typecheck shared/bots/frontend/backend, regression tests, Prisma migration check, production build и compiled MAX parser runtime regression — успешно.

В релиз входят:

- режим `Разместить сейчас` или `Запланировать` с выбором даты и времени;
- серверная очередь запланированных публикаций каждые 15 секунд;
- атомарный переход `SCHEDULED -> PUBLISHING`, исключающий двойную отправку одной записи при пересечении cron-запусков;
- использование уже существующего `EditorialPost.scheduledAt` без изменения production-схемы;
- отдельный image-processing service на Sharp;
- шаблоны изображений 1:1, 4:5, 16:9 и 9:16 сохраняют весь кадр через `fit: contain` вместо скрытого `cover` crop;
- `Оригинальный размер` выбран как безопасный формат по умолчанию;
- лимит backend upload увеличен до 40 МБ, что остаётся ниже production nginx `client_max_body_size 50M`;
- понятная ошибка с именем конкретного файла, если формат/декодирование изображения не поддержано;
- frontend сохраняет уже успешно обработанные изображения, даже если другой файл той же пачки завершился ошибкой;
- загрузка изображения перенесена перед редактором текста;
- один общий предварительный просмотр вместо неработающего переключателя ТГ/MAX;
- preview показывает обработанный файл целиком — тот же URL, который передаётся провайдерам;
- выбор каналов разделён на две вертикальные колонки: MAX слева, ТГ справа;
- MAX-подписи: `Макс - "АБ Афиша бухгалтера простая"` и `Макс - "АБ| Афиша бухгалтера"`;
- в списке последних публикаций показывается фактическое или запланированное время размещения.

Существующий редакционный функционал сохраняется: rich text, Unicode emoji, до 10 изображений, per-channel status/error/retry, MAX native views и экран `/admin/editorial/max-channels`.

Telegram native views не эмулируются: Bot API их не предоставляет. Для этого позже нужен отдельный read-only MTProto adapter.

## Prisma schema / migration

**Новой Prisma migration в этой promotion нет.** Поле `EditorialPost.scheduledAt` уже присутствует в production-схеме после ранее применённой migration:

`apps/backend/prisma/migrations/20260831100000_add_editorial_publisher/migration.sql`

Эта migration уже была проверена в production: таблицы `EditorialPost`, `EditorialPublication`, `EditorialStatsSnapshot` существуют, а `prisma migrate status` сообщал `Database schema is up to date!`.

Backend image использует `apps/backend/docker-entrypoint.sh`: перед запуском NestJS выполняется `pnpm exec prisma migrate deploy`. При текущем deployment эта команда должна подтвердить актуальную схему и не создавать новую migration.

Ручное изменение production-схемы запрещено.

## Сохраняемые production-гарантии

- bots остаются на `ab-afisha/bots:bots-release-3a64511` и не пересоздаются;
- nginx container/image/config не изменяются;
- server-local блок `ai.ab-event.pro` в `infra/nginx/conf.d/production.v2.conf` должен быть сохранён при синхронизации рабочего дерева;
- persistent volumes PostgreSQL, Redis и uploads сохраняются;
- Telegram IPv6 network остаётся без изменения;
- MAX channel binding/runtime config сохраняются;
- compiled MAX parser runtime regression продолжает проверять `Экспофорум, Санкт-Петербург`, canonical city и hybrid cases.

## Deployment

Использовать только `infra/scripts/deploy-pinned-backend-frontend.sh`.

Скрипт:

1. читает точные component pins из production lock;
2. собирает backend и frontend только из release anchor commit `9ecf180` в detached worktree;
3. проверяет OCI revision обоих образов;
4. запускает preflight;
5. переключает backend, при старте которого entrypoint выполняет `prisma migrate deploy`;
6. после healthy backend переключает frontend;
7. проверяет публичный HTTP и существующий canonical-city контракт;
8. подтверждает неизменность bots, nginx и локальных файлов;
9. при ошибке автоматически откатывает backend/frontend images.

Ожидаемый финальный marker:

`PRODUCTION_BACKEND_FRONTEND_PIN_OK=true`

## Проверка после deployment

Обязательно проверить:

- `https://ab-event.pro/` → HTTP 200;
- `https://ab-event.pro/api/health` → HTTP 200;
- `/admin/editorial` открывается без frontend/API ошибок;
- слева отображается колонка MAX, справа ТГ, каналы идут сверху вниз;
- MAX-каналы имеют подписи `Макс - "АБ Афиша бухгалтера простая"` и `Макс - "АБ| Афиша бухгалтера"`;
- переключателя ТГ/MAX в preview больше нет, используется один общий preview;
- блок загрузки изображений расположен перед редактором текста;
- загрузка JPEG/PNG/WebP и других поддерживаемых Sharp форматов возвращает понятную per-file ошибку при неудаче;
- если из пачки один файл не обработался, уже успешно обработанные изображения остаются в публикации;
- шаблоны не обрезают исходный кадр и preview показывает изображение целиком;
- немедленная публикация в уже настроенный MAX-канал работает;
- тестовая публикация, запланированная на ближайшее будущее, автоматически отправляется один раз и получает статус `PUBLISHED`;
- в списке последних публикаций отображается время размещения;
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
- любой backend release кроме `backend-release-9ecf180`;
- любой bots release кроме `bots-release-3a64511`;
- любой frontend release кроме `frontend-release-9ecf180`;
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
