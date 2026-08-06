# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Git commit: `eaada79ef32bd28a874d828ad71b4d87a6775376`
- Backend image: `ab-afisha/backend:backend-release-eaada79`
- Frontend image: `ab-afisha/frontend:frontend-release-eaada79`
- Дата утверждения: `2026-08-06`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Полный backend + frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-app.sh`
- Frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Историческое имя lock-файла сохранено для совместимости; он закрепляет и backend, и frontend.

## Что входит в этот релиз

- переход по серым датам предыдущего месяца;
- тихое обновление карточек и календарных маркеров раз в 60 секунд;
- немедленное обновление после возврата на вкладку;
- запросы событий и маркеров без браузерного кеша;
- резервная MAX-синхронизация каждые 5 минут;
- повторная обработка недавних MAX-обновлений при deployment.

## Обязательное правило для новых чатов и AI-агентов

Перед любыми изменениями, сборкой, откатом или deployment сначала прочитать:

1. `PRODUCTION_RELEASE.md`;
2. `infra/deploy/production-frontend.env`;
3. `AGENTS.md`;
4. `CLAUDE.md`.

Нельзя считать `main`, `latest`, старый Docker-тег, старый release-скрипт или ранее собранный образ утверждённой production-версией.

Разрешено использовать только commit и Docker images, указанные в `infra/deploy/production-frontend.env`.

## Запрещено

- деплоить backend или frontend с тегом `latest`;
- выбирать backend через общий `APP_VERSION`;
- деплоить любой `backend-release-*`, кроме `backend-release-eaada79`;
- деплоить любой `frontend-release-*`, кроме `frontend-release-eaada79`;
- использовать старые `max-ingestion-*`, `rollback-before-*`, `temporary-rollback-*`, preflight-образы или старые release-образы как production;
- определять production-версию по последнему commit в `main`;
- менять закреплённую версию без отдельного явного утверждения владельца проекта;
- перезапускать bots или nginx при deployment backend/frontend;
- изменять локальный production-конфиг `infra/nginx/conf.d/production.v2.conf`.

## Как утвердить новую версию в будущем

Новая версия считается production только после отдельного явного подтверждения владельца проекта и одновременного обновления:

- `infra/deploy/production-frontend.env`;
- `PRODUCTION_RELEASE.md`;
- `docker-compose.production.v2.yml`;
- `AGENTS.md`;
- `CLAUDE.md`;
- теста `apps/frontend/test/production-release-lock.test.mjs`.

До этого момента действующей остаётся версия `eaada79ef32bd28a874d828ad71b4d87a6775376`.
