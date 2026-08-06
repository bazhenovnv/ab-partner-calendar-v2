# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии frontend.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Git commit: `7b8464d7048a9920943add44d633362d3990dec0`
- Docker tag: `frontend-release-7b8464d`
- Docker image: `ab-afisha/frontend:frontend-release-7b8464d`
- Дата утверждения: `2026-08-06`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Единственный разрешённый frontend-деплой: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`.

## Обязательное правило для новых чатов и AI-агентов

Перед любыми изменениями frontend, сборкой, откатом или деплоем сначала прочитать:

1. `PRODUCTION_RELEASE.md`;
2. `infra/deploy/production-frontend.env`;
3. `AGENTS.md`;
4. `CLAUDE.md`.

Нельзя считать `main`, `latest`, старый Docker-тег, старый release-скрипт или ранее собранный образ утверждённой production-версией.

Разрешено использовать только commit и Docker image, указанные в `infra/deploy/production-frontend.env`.

## Запрещено

- деплоить frontend с тегом `latest`;
- деплоить любой `frontend-release-*`, кроме `frontend-release-7b8464d`;
- использовать старые `rollback-before-*`, `temporary-rollback-*`, preflight-образы или старые release-образы как production;
- определять production-версию по последнему коммиту `main`;
- менять закреплённую версию без отдельного явного утверждения владельца проекта;
- перезапускать backend, bots или nginx при frontend-деплое;
- изменять локальный production-конфиг `infra/nginx/conf.d/production.v2.conf` во время frontend-деплоя.

## Как утвердить новую версию в будущем

Новая версия считается production только после отдельного явного подтверждения владельца проекта и одновременного обновления:

- `infra/deploy/production-frontend.env`;
- `PRODUCTION_RELEASE.md`;
- `docker-compose.production.v2.yml`;
- теста `apps/frontend/test/production-release-lock.test.mjs`.

До этого момента действующей остаётся версия `7b8464d7048a9920943add44d633362d3990dec0`.
