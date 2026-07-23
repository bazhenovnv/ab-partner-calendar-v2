# 06 — Current Deployment Procedure

## Canonical environment
- Repository: `bazhenovnv/ab-partner-calendar-v2`.
- Canonical integration branch: `main`.
- Deploy source: an explicitly accepted commit on `main` or an explicitly approved release tag.
- Server path: `/srv/ab-afisha`.
- Production: `ab-event.pro`.
- Staging: `test.ab-event.pro`.
- Current VPS: `5.129.243.179`.

## Important architecture fact
Current compose files reference prebuilt images and do not define a `build:` section for the frontend. Therefore `docker compose build frontend` is not the canonical build command.

## Pre-deploy gate
Before deployment:
1. confirm the intended commit SHA or release tag;
2. confirm required build and QA evidence in `09B_RELEASE_ACCEPTANCE_CHECKLIST.md`;
3. confirm the target environment (staging or production);
4. never deploy an unreviewed working-tree state.

## Frontend deployment
```bash
cd /srv/ab-afisha

git fetch --prune origin
git checkout main
git reset --hard origin/main

# Record the exact source revision before building.
git rev-parse HEAD

docker build \
  -f apps/frontend/Dockerfile \
  -t ab-afisha/frontend:latest \
  .

docker compose \
  -f docker-compose.prod.yml \
  -f docker-compose.staging.yml \
  up -d --no-deps --force-recreate frontend
```

For production, use the approved production compose invocation and accepted release revision. Do not infer production approval from a successful staging restart.

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

The built image ID and running container image ID must match.

Also verify:
- Next BUILD_ID;
- HTTP 200 for visible assets;
- correct `Content-Type`;
- application and reverse-proxy health;
- current staging screenshot after visual changes;
- no broken images;
- deployed Git SHA equals the accepted source revision.

## Backend/staging seed
Production backend images do not contain `ts-node` because development dependencies are excluded. Staging TypeScript seeds require the documented temporary build-stage seed runner or an equivalent reviewed procedure. Do not install ad hoc development dependencies into the running production container.

## Docker Hub rate limiting
Do not use `--pull` unless an updated base image is required and registry access is authenticated. A local base image may be used for normal builds. A failed build leaves the previous tagged image intact.

## Rollback principle
Rollback must select a previously verified commit/tag and rebuild or restore its verified image. Restarting an unknown old container is not a controlled rollback.

## Prohibited
- old repository;
- old VPS;
- obsolete feature branches as deployment sources;
- password authentication to GitHub;
- hardcoded production secrets;
- deploying an unaccepted commit;
- treating a restarted old image as a successful deploy.
