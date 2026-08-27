# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Release anchor commit: `3b70ea58e9284e8e590eb7bf08a0c394000ebcd2`
- Backend commit: `3b70ea58e9284e8e590eb7bf08a0c394000ebcd2`
- Backend image: `ab-afisha/backend:backend-release-3b70ea5`
- Bots commit: `3a64511c98f7bf8cd59776dd5dce233939cd2988`
- Bots image: `ab-afisha/bots:bots-release-3a64511`
- Frontend commit: `3b70ea58e9284e8e590eb7bf08a0c394000ebcd2`
- Frontend image: `ab-afisha/frontend:frontend-release-3b70ea5`
- Дата утверждения: `2026-08-27`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Backend + frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`
- Backend + bots deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-bots.sh`
- Frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Историческое имя lock-файла сохранено для совместимости. Компоненты production закрепляются **независимо**.

## Что входит в этот релиз

Backend и frontend pin `3b70ea5` исправляют публичный фильтр городов:

- `/filters/cities` формируется по опубликованным событиям, а не только по таблице `City`;
- `cityName` больше не трактуется безусловно как город;
- город канонизируется из смешанных строк локации через единый shared parser;
- значения формата, улицы, дома, площадки и venue-строки не должны попадать в публичный список городов;
- гибридные строки вроде `Очно в Москве / онлайн-трансляция` сопоставляются с каноническим `Москва`, когда такой город известен;
- исходные legacy-значения `cityName` сохраняются как скрытые `filterValues`, поэтому старые загрязнённые события остаются фильтруемыми через один видимый канонический город;
- frontend сохраняет backend aliases вместо замены их на `[name]`;
- city facets используют точное сопоставление, без опасного substring-поиска вроде `Омск` внутри `Томск`;
- неактивные города и события, связанные с неактивным `City`, не возвращаются в публичный selector;
- address-only/venue-only запись без `cityName`/`cityId` не создаёт пункт, который затем невозможно найти тем же public event query;
- reconciliation городов работает и для `OFFLINE`, и для `HYBRID`, при этом composite location text не перезаписывается без необходимости.

Новых Prisma migrations и массовой мутации production-данных в этом релизе нет.

Bots остаются на `3a64511` и не пересоздаются при deployment этого релиза. Telegram/MAX reminder/legal-gate поведение из предыдущего релиза сохраняется без изменений.

## Deployment этого релиза

Использовать только `infra/scripts/deploy-pinned-backend-frontend.sh`.

Скрипт:

- проверяет release lock и component pins;
- не двигает root Git HEAD;
- строит backend и frontend из detached worktree точного commit `3b70ea5`;
- проверяет OCI revision labels;
- выполняет preflight backend/frontend;
- переключает сначала backend, затем frontend;
- не перезапускает bots и nginx;
- не меняет `.env`, nginx config и локальные Git-изменения;
- не сбрасывает MAX backfill marker и не запускает специальные MAX reconciliation mutations;
- после переключения проверяет homepage, health и публичный city filter;
- требует канонический пункт `Москва`, отсутствие известных non-city значений и фактическую фильтруемость Moscow aliases;
- при ошибке автоматически откатывает backend и frontend на ранее запущенные images.

Ожидаемый финальный marker:

`PRODUCTION_BACKEND_FRONTEND_PIN_OK=true`

## Обязательное правило для новых чатов и AI-агентов

Перед любыми изменениями, сборкой, откатом или deployment сначала прочитать:

1. `PRODUCTION_RELEASE.md`;
2. `infra/deploy/production-frontend.env`;
3. `AGENTS.md`;
4. `CLAUDE.md`.

Нельзя считать `main`, `latest`, `APP_VERSION`, старый Docker-тег, rollback-образ или ранее собранный image утверждённой production-версией.

Разрешено использовать только component commits и Docker images, указанные в `infra/deploy/production-frontend.env`.

## Запрещено

- деплоить backend, bots или frontend с тегом `latest`;
- выбирать backend или bots через общий `APP_VERSION`;
- деплоить любой `backend-release-*`, кроме `backend-release-3b70ea5`;
- деплоить любой `bots-release-*`, кроме `bots-release-3a64511`;
- деплоить любой `frontend-release-*`, кроме `frontend-release-3b70ea5`;
- использовать `rollback-before-*`, `temporary-rollback-*`, preflight-образы или старые release-образы как production;
- определять production-версию по последнему commit в `main`;
- менять закреплённые component pins без отдельного явного утверждения владельца проекта;
- перезапускать bots или nginx при deployment этого backend+frontend релиза;
- изменять локальный production-конфиг `infra/nginx/conf.d/production.v2.conf`;
- использовать для этого релиза старый `deploy-pinned-app.sh`, потому что он содержит MAX-specific backfill/reconciliation процедуры, не относящиеся к исправлению фильтра городов.

## Как утвердить новую версию в будущем

Новая версия считается production только после отдельного явного подтверждения владельца проекта и одновременного обновления:

- `infra/deploy/production-frontend.env`;
- `PRODUCTION_RELEASE.md`;
- `docker-compose.production.v2.yml`;
- `AGENTS.md`;
- `CLAUDE.md`;
- теста `apps/frontend/test/production-release-lock.test.mjs`.

Для релиза, меняющего одновременно backend и frontend при неизменных bots, использовать `infra/scripts/deploy-pinned-backend-frontend.sh`. Для backend+bots используется `infra/scripts/deploy-pinned-backend-bots.sh`. Frontend-only обновляется через `infra/scripts/deploy-pinned-frontend.sh`.
