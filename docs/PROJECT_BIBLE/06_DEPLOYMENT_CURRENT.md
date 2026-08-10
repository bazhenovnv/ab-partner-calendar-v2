# 06 — Current Deployment Procedure

## Canonical environment

- Repository: `bazhenovnv/ab-partner-calendar-v2`.
- Canonical integration branch: `main`.
- Server path: `/srv/ab-afisha`.
- Production: `ab-event.pro`.
- Staging: `test.ab-event.pro`.
- Current VPS: `5.129.243.179`.
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`.

## Production application lock

The only approved production application release is defined by:

- `PRODUCTION_RELEASE.md`;
- `infra/deploy/production-frontend.env`.

Current approved values:

- commit: `a8a91ced755eb0ee036176336bc12b4d230f7b75`;
- backend image: `ab-afisha/backend:backend-release-a8a91ce`;
- frontend image: `ab-afisha/frontend:frontend-release-a8a91ce`.

Do not infer production approval from `main`, `latest`, an old release tag, a rollback image, staging, a successful build, or a previously used deploy script.

## Important architecture facts

- Production Compose references pinned backend and frontend images.
- Backend is selected through `BACKEND_IMAGE`; frontend is selected through `FRONTEND_IMAGE`.
- The shared `APP_VERSION` remains for bots and must not be used to select backend/frontend.
- Full application deployment must not restart bots or nginx.
- The server has a locally modified production Nginx configuration. Deployment must preserve its checksum and must not run `git reset --hard`, `git clean` or overwrite that file.
- `deploy-pinned-app.sh` builds both pinned images from the exact approved commit, validates OCI revision labels, performs preflight checks and automatically rolls back backend/frontend if deployment fails.

## Only approved full application deployment

```bash
cd /srv/ab-afisha

git fetch --prune origin main
git checkout main
git pull --ff-only origin main

ROOT=/srv/ab-afisha \
COMPOSE_FILE=/srv/ab-afisha/docker-compose.production.v2.yml \
bash /srv/ab-afisha/infra/scripts/deploy-pinned-app.sh
```

A successful deployment must finish with the script's success marker:

```text
PRODUCTION_APP_PIN_OK
```

and confirm at minimum:

```text
PINNED_COMMIT=a8a91ced755eb0ee036176336bc12b4d230f7b75
PINNED_BACKEND=ab-afisha/backend:backend-release-a8a91ce
PINNED_FRONTEND=ab-afisha/frontend:frontend-release-a8a91ce
PUBLIC_HTTP=200
PUBLIC_HEALTH_HTTP=200
BOTS_UNCHANGED=true
NGINX_PRESERVED=true
```

## Frontend-only deployment

Frontend-only deployment is reserved for releases that intentionally do not change backend:

```bash
cd /srv/ab-afisha

ROOT=/srv/ab-afisha \
COMPOSE_FILE=/srv/ab-afisha/docker-compose.production.v2.yml \
bash /srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh
```

The current `a8a91ce` release changes both backend and frontend, so use `deploy-pinned-app.sh`.

## Verification

```bash
cd /srv/ab-afisha
source infra/deploy/production-frontend.env

backend_container="$(BACKEND_IMAGE="$PRODUCTION_BACKEND_IMAGE" FRONTEND_IMAGE="$PRODUCTION_FRONTEND_IMAGE" docker compose -p ab-afisha -f docker-compose.production.v2.yml ps -q backend)"
frontend_container="$(BACKEND_IMAGE="$PRODUCTION_BACKEND_IMAGE" FRONTEND_IMAGE="$PRODUCTION_FRONTEND_IMAGE" docker compose -p ab-afisha -f docker-compose.production.v2.yml ps -q frontend)"

docker inspect "$backend_container" --format 'BACKEND_STATE={{.State.Status}} BACKEND_IMAGE={{.Config.Image}}'
docker inspect "$frontend_container" --format 'FRONTEND_STATE={{.State.Status}} FRONTEND_IMAGE={{.Config.Image}}'

docker image inspect "$PRODUCTION_BACKEND_IMAGE" --format 'BACKEND_REVISION={{index .Config.Labels "org.opencontainers.image.revision"}}'
docker image inspect "$PRODUCTION_FRONTEND_IMAGE" --format 'FRONTEND_REVISION={{index .Config.Labels "org.opencontainers.image.revision"}}'

curl -sS -o /dev/null -w 'PUBLIC_HTTP=%{http_code}\n' https://ab-event.pro/
curl -sS -o /dev/null -w 'PUBLIC_HEALTH_HTTP=%{http_code}\n' https://ab-event.pro/api/health
```

Both running image names and both OCI revisions must exactly match the production lock.

## Approving a future release

A future application version is not production until the project owner explicitly approves it and the same release change updates:

1. `PRODUCTION_RELEASE.md`;
2. `infra/deploy/production-frontend.env`;
3. `docker-compose.production.v2.yml`;
4. `AGENTS.md`;
5. `CLAUDE.md`;
6. `apps/frontend/test/production-release-lock.test.mjs`.

The change must use a feature branch and pull request. Until it is approved and merged, the current pinned release remains authoritative.

## Prohibited

- old repository;
- old VPS `77.232.136.248`;
- obsolete feature branches as deployment sources;
- backend/frontend `latest` for production;
- arbitrary `origin/main` deployment without the lock;
- any backend/frontend image other than the locked images;
- password authentication to GitHub;
- hardcoded production secrets;
- deploying an unaccepted commit;
- restarting bots or nginx during backend/frontend deployment;
- changing the local production Nginx configuration;
- treating restarted old images as a successful deploy.
