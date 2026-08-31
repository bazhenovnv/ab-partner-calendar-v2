# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Release anchor commit: `0f3938dd6cd348700f6b867fdd140eb515a14791`
- Backend commit/image: `0f3938dd6cd348700f6b867fdd140eb515a14791` / `ab-afisha/backend:backend-release-0f3938d`
- Bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`
- Frontend commit/image: `0f3938dd6cd348700f6b867fdd140eb515a14791` / `ab-afisha/frontend:frontend-release-0f3938d`
- Дата утверждения: `2026-08-31`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Backend + frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Production-компоненты закрепляются независимо.

## Текущая promotion — редакционный кабинет Telegram / MAX

Backend и frontend обновляются до `0f3938d`; bots остаются на `3a64511`, nginx не пересоздаётся.

Application PR #117 добавляет отдельный редакционный кабинет `/admin/editorial` для подготовки и публикации новостей/событий в два Telegram- и два MAX-канала. PR #117 прошёл полный CI #828 перед merge.

В релиз входят:

- rich-text редактор и Unicode emoji-панель;
- загрузка до 10 изображений с шаблонами 1:1, 4:5, 16:9, 9:16 и original;
- предпросмотр Telegram / MAX;
- выбор одного или нескольких каналов;
- раздельный статус публикации и конкретная ошибка по каждому каналу;
- retry только проблемного канала;
- счётчики публикаций и ошибок;
- MAX native views с автоматическим обновлением статистики;
- отдельный экран `/admin/editorial/max-channels` для обнаружения и привязки MAX `chat_id`;
- автоматическое сохранение MAX-привязок в `SiteConfig` PostgreSQL;
- сохранение редакционных изображений в существующем persistent volume `ab-afisha_uploads`.

Telegram native views не эмулируются: Bot API их не предоставляет. Для этого позже нужен отдельный read-only MTProto adapter.

## Prisma migration

Релиз включает миграцию:

`apps/backend/prisma/migrations/20260831100000_add_editorial_publisher/migration.sql`

Она создаёт новые таблицы редакционного контура (`EditorialPost`, `EditorialPublication`, `EditorialStatsSnapshot`), индексы и связи и не удаляет существующие production-данные.

Backend image уже использует `apps/backend/docker-entrypoint.sh`: перед запуском NestJS выполняется `pnpm exec prisma migrate deploy`. Поэтому отдельный ручной запуск migration перед переключением backend не требуется.

Миграция аддитивная. Если после её применения deployment нового приложения потребует rollback, старый backend совместим с дополнительными таблицами; автоматический rollback образов не обязан откатывать схему.

## Сохраняемые production-гарантии

- bots остаются на `ab-afisha/bots:bots-release-3a64511` и не пересоздаются;
- nginx container/image/config не изменяются;
- persistent volumes PostgreSQL, Redis и uploads сохраняются;
- Telegram IPv6 network остаётся без изменения;
- compiled MAX parser runtime regression продолжает проверять `Экспофорум, Санкт-Петербург`, canonical city и hybrid cases;
- существующие frontend-правки предыдущих approved promotions входят в commit `0f3938d` через историю `main`.

## Deployment

Использовать только `infra/scripts/deploy-pinned-backend-frontend.sh`.

Скрипт:

1. читает точные component pins из production lock;
2. собирает backend и frontend только из release anchor commit `0f3938d` в detached worktree;
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
- вход в admin;
- наличие пункта `Публикации TG / MAX`;
- открытие `/admin/editorial` без frontend/API ошибок;
- открытие `/admin/editorial/max-channels`;
- отображение двух Telegram и двух MAX каналов;
- создание и повторное открытие черновика без фактической публикации;
- загрузку тестового изображения и доступность сохранённого `/uploads/editorial/...`;
- состояние MAX-привязок; если `chat_id` ещё неизвестен, добавить бота администратором в канал или выполнить проверку известного ID через экран настройки;
- что bots и nginx не были пересозданы.

Фактическую тестовую публикацию выполнять только после подтверждения admin-rights бота в выбранном Telegram/MAX канале, чтобы не получать заведомо ложную ошибку прав доступа.

## Обязательное правило

Перед любыми изменениями, сборкой, откатом или deployment прочитать:

1. `PRODUCTION_RELEASE.md`;
2. `infra/deploy/production-frontend.env`;
3. `AGENTS.md`;
4. `CLAUDE.md`.

Нельзя определять production по `main`, `latest`, `APP_VERSION`, rollback-образу или последнему Docker image. Разрешено использовать только component commits/images из production lock.

## Запрещено для текущего релиза

- `latest` для backend, bots или frontend;
- любой backend release кроме `backend-release-0f3938d`;
- любой bots release кроме `bots-release-3a64511`;
- любой frontend release кроме `frontend-release-0f3938d`;
- пересоздание bots или nginx;
- изменение `infra/nginx/conf.d/production.v2.conf`;
- ручное изменение production-таблиц вместо штатного `prisma migrate deploy`;
- использование frontend-only или backend-only deploy вместо `deploy-pinned-backend-frontend.sh` для этой promotion.

## Новая версия в будущем

Новая версия становится production только после явного утверждения владельца проекта и согласованного обновления:

- `infra/deploy/production-frontend.env`;
- `PRODUCTION_RELEASE.md`;
- `docker-compose.production.v2.yml`;
- `AGENTS.md`;
- `CLAUDE.md`;
- `apps/frontend/test/production-release-lock.test.mjs`.
