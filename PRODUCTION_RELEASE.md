# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Git commit: `a8a91ced755eb0ee036176336bc12b4d230f7b75`
- Backend image: `ab-afisha/backend:backend-release-a8a91ce`
- Frontend image: `ab-afisha/frontend:frontend-release-a8a91ce`
- Дата утверждения: `2026-08-10`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Полный backend + frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-app.sh`
- Frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Историческое имя lock-файла сохранено для совместимости; он закрепляет и backend, и frontend.

## Что входит в этот релиз

- полный ролевой ЛК администратора по утверждённому ТЗ;
- Dashboard и управление мероприятиями;
- раздел `Требует внимания` и управление `Главными событиями`;
- фильтры, города/регионы, цитаты и конструктор сайта;
- MAX import и интеграции/API sources;
- боты, напоминания, контакты и рассылки;
- внутренняя аналитика;
- пользователи и роли `ADMIN` / `EDITOR`;
- архив/удалённые, журнал действий и журнал технических ошибок;
- реальная проверка административной JWT-сессии через `/auth/me`;
- безопасный seed первого администратора без известного fallback-пароля;
- сохранены предыдущие исправления календаря и живая MAX-синхронизация.

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
- деплоить любой `backend-release-*`, кроме `backend-release-a8a91ce`;
- деплоить любой `frontend-release-*`, кроме `frontend-release-a8a91ce`;
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

До следующего отдельного утверждения действующей остаётся версия `a8a91ced755eb0ee036176336bc12b4d230f7b75`.
