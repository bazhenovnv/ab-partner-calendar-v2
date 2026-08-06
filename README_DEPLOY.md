# README: текущий деплой АБ Афиша Бухгалтера

## Канонический production

- Production: `https://ab-event.pro`.
- Staging: `https://test.ab-event.pro`.
- Current VPS: `5.129.243.179`.
- Server root: `/srv/ab-afisha`.
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`.

## Закреплённый production frontend

Перед любым frontend-деплоем прочитать:

1. `PRODUCTION_RELEASE.md`;
2. `infra/deploy/production-frontend.env`;
3. `docs/PROJECT_BIBLE/06_DEPLOYMENT_CURRENT.md`.

Единственная утверждённая версия:

- commit: `85b1a65c52bfd5f0c4ec16f82702e9604a5d162c`;
- image: `ab-afisha/frontend:frontend-release-85b1a65`;
- deploy script: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`;
- cleanup script: `/srv/ab-afisha/infra/scripts/cleanup-old-frontend-releases.sh`.

## Единственный разрешённый frontend-деплой

```bash
cd /srv/ab-afisha

git fetch --prune origin main
git checkout main
git pull --ff-only origin main

ROOT=/srv/ab-afisha \
COMPOSE_FILE=/srv/ab-afisha/docker-compose.production.v2.yml \
bash /srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh
```

Успешный результат обязан содержать:

```text
PRODUCTION_PIN_OK
PRODUCTION_COMMIT=85b1a65c52bfd5f0c4ec16f82702e9604a5d162c
PRODUCTION_FRONTEND=ab-afisha/frontend:frontend-release-85b1a65
PRODUCTION_REVISION=85b1a65c52bfd5f0c4ec16f82702e9604a5d162c
PUBLIC_HTTP=200
NGINX_PRESERVED=true
```

## Удаление старых frontend-релизов

Только после успешного закреплённого деплоя и визуальной проверки:

```bash
cd /srv/ab-afisha

ROOT=/srv/ab-afisha \
COMPOSE_FILE=/srv/ab-afisha/docker-compose.production.v2.yml \
bash /srv/ab-afisha/infra/scripts/cleanup-old-frontend-releases.sh
```

Ожидаемый итог:

```text
ONLY_PINNED_FRONTEND_IMAGE_REMAINS=true
PINNED_FRONTEND_IMAGE=ab-afisha/frontend:frontend-release-85b1a65
PINNED_FRONTEND_COMMIT=85b1a65c52bfd5f0c4ec16f82702e9604a5d162c
```

## Запрещено

- использовать старый VPS `77.232.136.248`;
- использовать старый репозиторий;
- деплоить frontend с тегом `latest`;
- деплоить произвольный `origin/main`;
- использовать любой `frontend-release-*`, кроме `frontend-release-85b1a65`;
- использовать `rollback-before-*`, `temporary-rollback-*` или preflight-образы как production;
- запускать старые frontend deploy-скрипты вместо `deploy-pinned-frontend.sh`;
- выполнять `git reset --hard` или `git clean` на production-сервере;
- менять или перезапускать backend, bots и nginx при frontend-деплое;
- коммитить `.env`, секреты, токены и пароли.

## Новая production-версия

Новая версия допускается только после отдельного явного утверждения владельцем проекта и одновременного обновления:

- `PRODUCTION_RELEASE.md`;
- `infra/deploy/production-frontend.env`;
- `docker-compose.production.v2.yml`;
- `apps/frontend/test/production-release-lock.test.mjs`.

До этого момента используется только закреплённый релиз `85b1a65c52bfd5f0c4ec16f82702e9604a5d162c`.
