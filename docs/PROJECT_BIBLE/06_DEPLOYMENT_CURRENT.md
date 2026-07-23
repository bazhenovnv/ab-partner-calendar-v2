# 06 — Current Deployment Procedure

## Canonical environment
- Repository: `bazhenovnv/ab-partner-calendar-v2`.
- Branch: `claude/ab-afisha-architecture-plan-805f5o`.
- Server path: `/srv/ab-afisha`.
- Staging: `test.ab-event.pro`.
- Current VPS: `5.129.243.179`.

## Important architecture fact
Current compose files reference prebuilt images and do not define a `build:` section for the frontend. Therefore `docker compose build frontend` is not the canonical build command.

## Frontend deployment
```bash
cd /srv/ab-afisha

git fetch origin
git checkout claude/ab-afisha-architecture-plan-805f5o
git reset --hard origin/claude/ab-afisha-architecture-plan-805f5o

docker build \
  -f apps/frontend/Dockerfile \
  -t ab-afisha/frontend:latest \
  .

docker compose \
  -f docker-compose.prod.yml \
  -f docker-compose.staging.yml \
  up -d --no-deps --force-recreate frontend
```

Do not run `compose up` after a failed build. Confirm the build ended successfully first.

## Verification
```bash
git rev-parse HEAD

docker image inspect ab-afisha/frontend:latest \
  --format 'IMAGE={{.Id}} CREATED={{.Created}}'

docker inspect ab-afisha-frontend-1 \
  --format 'RUNNING={{.Image}} CREATED={{.Created}}'

docker compose \
  -f docker-compose.prod.yml \
  -f docker-compose.staging.yml \
  ps frontend nginx
```

The image ID and running container image ID must match.

Also verify:
- Next BUILD_ID;
- HTTP 200 for visible assets;
- correct `Content-Type`;
- current staging screenshot;
- no broken images.

## Backend/staging seed
Production backend images do not contain `ts-node` because development dependencies are excluded. Staging TypeScript seeds require the documented temporary build-stage seed runner or an equivalent reviewed procedure. Do not install ad hoc development dependencies into the running production container.

## Docker Hub rate limiting
Do not use `--pull` unless an updated base image is required and registry access is authenticated. A local base image may be used for normal builds. A failed build leaves the previous tagged image intact.

## Prohibited
- old repository;
- old VPS;
- password authentication to GitHub;
- hardcoded production secrets;
- treating a restarted old image as a successful deploy.