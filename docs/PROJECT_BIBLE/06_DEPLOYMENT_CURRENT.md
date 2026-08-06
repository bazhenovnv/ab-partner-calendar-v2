# 06 — Current Deployment Procedure

## Canonical environment

- Repository: `bazhenovnv/ab-partner-calendar-v2`.
- Canonical integration branch: `main`.
- Server path: `/srv/ab-afisha`.
- Production: `ab-event.pro`.
- Staging: `test.ab-event.pro`.
- Current VPS: `5.129.243.179`.
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`.

## Production frontend lock

The only approved production frontend is defined by:

- `PRODUCTION_RELEASE.md`;
- `infra/deploy/production-frontend.env`.

Current approved values:

- commit: `3e308c5355ad5ebd09c4fd634ba7df965a7bf6ca`;
- image: `ab-afisha/frontend:frontend-release-3e308c5`.

Do not infer production approval from `main`, `latest`, an old release tag, a rollback image, staging, a successful build, or a previously used deploy script.

## Important architecture facts

- Production Compose references prebuilt images and does not define `build:` for frontend.
- Frontend is selected through `FRONTEND_IMAGE`, independently from the shared `APP_VERSION` used by backend and bots.
- Frontend deployment must not restart backend, bots or nginx.
- The server has a locally modified production Nginx configuration. Frontend deployment must preserve its checksum and must not run `git reset --hard`, `git clean` or overwrite that file.

## Only approved frontend deployment

```bash
cd /srv/ab-afisha

git fetch --prune origin main
git checkout main
git pull --ff-only origin main

ROOT=/srv/ab-afisha \
COMPOSE_FILE=/srv/ab-afisha/docker-compose.production.v2.yml \
bash /srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh
```

The script must finish with:

```text
PRODUCTION_PIN_OK
PRODUCTION_COMMIT=3e308c5355ad5ebd09c4fd634ba7df965a7bf6ca
PRODUCTION_FRONTEND=ab-afisha/frontend:frontend-release-3e308c5
PRODUCTION_REVISION=3e308c5355ad5ebd09c4fd634ba7df965a7bf6ca
PUBLIC_HTTP=200
NGINX_PRESERVED=true
```

## Removing old frontend releases

Run only after `PRODUCTION_PIN_OK` and after confirming the visible site:

```bash
cd /srv/ab-afisha

ROOT=/srv/ab-afisha \
COMPOSE_FILE=/srv/ab-afisha/docker-compose.production.v2.yml \
bash /srv/ab-afisha/infra/scripts/cleanup-old-frontend-releases.sh
```

The cleanup script:

- refuses to run unless production is currently using the pinned image and revision;
- removes stopped containers belonging to old frontend images;
- removes old unused `ab-afisha/frontend:*` images;
- leaves running non-production containers untouched;
- keeps `ab-afisha/frontend:frontend-release-3e308c5`.

Expected final marker:

```text
ONLY_PINNED_FRONTEND_IMAGE_REMAINS=true
```

## Verification

```bash
cd /srv/ab-afisha

source infra/deploy/production-frontend.env

frontend_container="$({
  FRONTEND_IMAGE="$PRODUCTION_FRONTEND_IMAGE" \
  docker compose -p ab-afisha -f docker-compose.production.v2.yml ps -q frontend
})"

docker inspect "$frontend_container" \
  --format 'STATE={{.State.Status}} IMAGE={{.Config.Image}}'

docker image inspect "$PRODUCTION_FRONTEND_IMAGE" \
  --format 'REVISION={{index .Config.Labels "org.opencontainers.image.revision"}} ID={{.Id}}'

curl -sS -o /dev/null -w 'PUBLIC_HTTP=%{http_code}\n' https://ab-event.pro/
```

The running image must equal the pinned image, the image revision must equal the pinned commit, and public HTTP must be `200`.

## Approving a future release

A future frontend version is not production until the project owner explicitly approves it and the same change updates:

1. `PRODUCTION_RELEASE.md`;
2. `infra/deploy/production-frontend.env`;
3. `docker-compose.production.v2.yml`;
4. `apps/frontend/test/production-release-lock.test.mjs`.

The change must use a feature branch and pull request. Until it is approved and merged, the current pinned release remains authoritative.

## Prohibited

- old repository;
- old VPS `77.232.136.248`;
- obsolete feature branches as deployment sources;
- `ab-afisha/frontend:latest` for production;
- arbitrary `origin/main` deployment;
- any frontend image other than the locked image;
- password authentication to GitHub;
- hardcoded production secrets;
- deploying an unaccepted commit;
- changing backend, bots or nginx during a frontend-only deployment;
- treating a restarted old image as a successful deploy.
