# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Release anchor commit: `3a64511c98f7bf8cd59776dd5dce233939cd2988`
- Backend commit: `3a64511c98f7bf8cd59776dd5dce233939cd2988`
- Backend image: `ab-afisha/backend:backend-release-3a64511`
- Bots commit: `3a64511c98f7bf8cd59776dd5dce233939cd2988`
- Bots image: `ab-afisha/bots:bots-release-3a64511`
- Frontend commit: `79d85dc230b71699977bfec633db411a49c72f4f`
- Frontend image: `ab-afisha/frontend:frontend-release-79d85dc`
- Дата утверждения: `2026-08-27`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Backend + bots deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-bots.sh`
- Frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Историческое имя lock-файла сохранено для совместимости. Компоненты production закрепляются **независимо**.

## Что входит в этот релиз

Backend и bots pin `3a64511` включают предыдущие исправления Telegram IPv6/reminders и дополнительно:

- перед каждым новым запуском bot-flow требуется явное подтверждение основных юридических документов;
- `legalAcceptedAt` обновляется при подтверждении;
- обязательный сервисный legal gate не включает автоматически согласие на рекламные/информационные рассылки;
- Telegram показывает документы и кнопку «Принимаю» до перехода к календарю;
- MAX показывает документы и кнопку «Принять» до перехода к календарю;
- после выбора минуты пользователь остаётся в минутной сетке того же часа;
- на минутном экране показываются уже выбранные времена текущего часа;
- несколько минут одного часа добавляются последовательно без повторного выбора часа;
- повторный клик по уже выбранной минуте Telegram не делает идентичный `editMessageText` и не вызывает `message is not modified`;
- сохраняются мультидаты, удаление отдельных времён, очистка, отмена и `Применить (N)`;
- backend Telegram reminders/test-send/broadcasts продолжают использовать IPv6 transport;
- MAX webhook сохраняет тот же reminder UX.

Deployment hardening:

- `deploy-pinned-backend-bots.sh` проверяет Telegram `getMe` по IPv6 отдельно из bots и backend;
- `getMe` имеет до 6 попыток с возрастающей паузой, чтобы единичный transient IPv6 timeout не вызывал ложный rollback;
- при устойчивой ошибке автоматический rollback backend+bots сохраняется;
- frontend и nginx не пересоздаются backend+bots deployment.

Frontend остаётся на `frontend-release-79d85dc`; UI сайта в этом релизе не меняется.

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
- деплоить любой `backend-release-*`, кроме `backend-release-3a64511`;
- деплоить любой `bots-release-*`, кроме `bots-release-3a64511`;
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
