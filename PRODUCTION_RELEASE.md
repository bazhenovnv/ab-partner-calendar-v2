# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Git commit: `3923a40f92a786c071bf15887ed5ec6d5759da4e`
- Backend image: `ab-afisha/backend:backend-release-3923a40`
- Frontend image: `ab-afisha/frontend:frontend-release-3923a40`
- Дата утверждения: `2026-08-24`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Полный backend + frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-app.sh`
- Frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Историческое имя lock-файла сохранено для совместимости; он закрепляет и backend, и frontend.

## Что входит в этот релиз

- полный ролевой ЛК администратора по утверждённому ТЗ;
- безопасный lifecycle мероприятий: архив, удаление и восстановление без ложных ошибок после HTTP 204;
- канонический контракт «Главных событий»: только `PUBLISHED + mainEvent=true` с отдельной обложкой `mainEventUrl`;
- синхронизация раздела «Требует внимания» с маршрутом и левым меню;
- визуальный редактор юридических документов без показа сырого HTML;
- восстановление справочника городов из опубликованных офлайн-мероприятий и исправление venue-first адресов MAX;
- публичный фильтр направлений показывает только направления, реально связанные с опубликованными мероприятиями;
- исправлена доставка напоминаний Telegram/MAX: корректный MAX `user_id`, сетевые retry/timeout и запись ошибок в `ErrorLog`;
- внутренняя аналитика: визиты, просмотры событий и регистрационные действия;
- роль `EDITOR` может читать справочники для редактирования мероприятий, но менять города и направления может только `ADMIN`;
- MAX-рассылки личным пользователям отправляются через `user_id`, а не ошибочный `chat_id`;
- контакты и согласия сохраняют существующую модель: в контактах только пользователи с принятыми юридическими документами, маркетинговые рассылки требуют отдельного согласия;
- сохранены предыдущие исправления публичного календаря, карточек, модальных окон и живая MAX-синхронизация;
- безопасный seed первого администратора без известного fallback-пароля.

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
- деплоить любой `backend-release-*`, кроме `backend-release-3923a40`;
- деплоить любой `frontend-release-*`, кроме `frontend-release-3923a40`;
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

До следующего отдельного утверждения действующей остаётся версия `3923a40f92a786c071bf15887ed5ec6d5759da4e`.
