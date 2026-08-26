# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Release anchor commit: `ebfb4f9db38c34e58743463a9c5200c46988dd66`
- Backend commit: `ebfb4f9db38c34e58743463a9c5200c46988dd66`
- Backend image: `ab-afisha/backend:backend-release-ebfb4f9`
- Bots commit: `a0727468eb1966cdc7fd4ca3f469eeacf51b09a5`
- Bots image: `ab-afisha/bots:bots-release-a072746`
- Frontend commit: `79d85dc230b71699977bfec633db411a49c72f4f`
- Frontend image: `ab-afisha/frontend:frontend-release-79d85dc`
- Дата утверждения: `2026-08-26`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Backend + bots deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-bots.sh`
- Frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Историческое имя lock-файла сохранено для совместимости. Компоненты production закрепляются **независимо**: backend, bots и frontend могут быть собраны из разных утверждённых commit.

## Что входит в этот релиз

Bots pin `a072746` добавляет:

- Telegram снова получает доступ к `api.telegram.org` через отдельный Docker IPv6 egress;
- host IPv6 фиксируется через `forwarding=1` и `accept_ra=2` после reboot;
- Telegram long polling предпочитает IPv6;
- Telegram reminder flow: календарь → час → минуты с шагом 5 минут;
- можно выбрать несколько времён на одной дате и несколько разных дат;
- можно удалить отдельный вариант, очистить выбор, отменить или применить весь набор;
- MAX webhook использует тот же сценарий выбора даты/часа/минут и мультивыбор;
- в MAX юридическое согласие остаётся кнопкой «Принять».

Backend pin `ebfb4f9` включает всё из `a072746` и дополнительно:

- валидирует напоминание по фактическому `startTime`, а не по полуночи `startDate`;
- показывает фактическое время начала в отправленном напоминании;
- отправляет Telegram-напоминания через точечный IPv6 transport;
- отправляет Telegram test-send и массовые рассылки через тот же IPv6 transport;
- не меняет сетевое поведение MAX и SMTP;
- regression-test запрещает возвращение прямого backend `fetch(api.telegram.org)` в reminders и broadcasts.

Frontend остаётся на ранее утверждённом `frontend-release-79d85dc`; UI сайта в этом релизе не меняется.

Сохраняются все исправления предыдущего production-релиза `79d85dc`, включая MAX `HYBRID`, «Требует внимания», email-уведомления, faceted filters, legal/admin lifecycle и MAX import recovery.

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
- деплоить любой `backend-release-*`, кроме `backend-release-ebfb4f9`;
- деплоить любой `bots-release-*`, кроме `bots-release-a072746`;
- деплоить любой `frontend-release-*`, кроме `frontend-release-79d85dc`;
- использовать `rollback-before-*`, `temporary-rollback-*`, preflight-образы или старые release-образы как production;
- определять production-версию по последнему commit в `main`;
- менять закреплённые component pins без отдельного явного утверждения владельца проекта;
- перезапускать frontend или nginx при deployment backend+bots;
- изменять локальный production-конфиг `infra/nginx/conf.d/production.v2.conf`.

## Как утвердить новую версию в будущем

Новая версия считается production только после отдельного явного подтверждения владельца проекта и одновременного обновления:

- `infra/deploy/production-frontend.env`;
- `PRODUCTION_RELEASE.md`;
- `docker-compose.production.v2.yml`;
- `AGENTS.md`;
- `CLAUDE.md`;
- теста `apps/frontend/test/production-release-lock.test.mjs`.

Для backend+bots используется `infra/scripts/deploy-pinned-backend-bots.sh`. Frontend обновляется отдельно через `infra/scripts/deploy-pinned-frontend.sh`, если его pin изменился.
