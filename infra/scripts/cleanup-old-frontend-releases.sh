#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${ROOT:-/srv/ab-afisha}"
LOCK_FILE="${LOCK_FILE:-$ROOT/infra/deploy/production-frontend.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/docker-compose.production.v2.yml}"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[ -f "$LOCK_FILE" ] || fail "production lock is missing: $LOCK_FILE"
# shellcheck disable=SC1090
source "$LOCK_FILE"

: "${PRODUCTION_FRONTEND_COMMIT:?missing PRODUCTION_FRONTEND_COMMIT}"
: "${PRODUCTION_FRONTEND_IMAGE:?missing PRODUCTION_FRONTEND_IMAGE}"

cd "$ROOT"

compose() {
  FRONTEND_IMAGE="$PRODUCTION_FRONTEND_IMAGE" \
    docker compose -p ab-afisha -f "$COMPOSE_FILE" "$@"
}

echo "=== ПРОВЕРКА ЗАКРЕПЛЁННОГО PRODUCTION FRONTEND ==="

frontend_container="$(compose ps -q frontend)"
[ -n "$frontend_container" ] || fail "production frontend container is missing"

running_image="$(docker inspect "$frontend_container" --format '{{.Config.Image}}')"
running_state="$(docker inspect "$frontend_container" --format '{{.State.Status}}')"
image_revision="$(docker image inspect "$PRODUCTION_FRONTEND_IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"

echo "RUNNING_STATE=$running_state"
echo "RUNNING_IMAGE=$running_image"
echo "RUNNING_REVISION=$image_revision"

[ "$running_state" = "running" ] || fail "production frontend is not running"
[ "$running_image" = "$PRODUCTION_FRONTEND_IMAGE" ] \
  || fail "refusing cleanup: production does not use pinned image"
[ "$image_revision" = "$PRODUCTION_FRONTEND_COMMIT" ] \
  || fail "refusing cleanup: pinned image revision mismatch"

echo "=== УДАЛЕНИЕ ОСТАНОВЛЕННЫХ КОНТЕЙНЕРОВ СТАРЫХ FRONTEND-ОБРАЗОВ ==="

mapfile -t images < <(
  docker image ls 'ab-afisha/frontend' --format '{{.Repository}}:{{.Tag}}' \
    | grep -v '<none>' \
    | sort -u
)

for image in "${images[@]}"; do
  [ "$image" = "$PRODUCTION_FRONTEND_IMAGE" ] && continue

  while IFS=' ' read -r container_id state; do
    [ -n "$container_id" ] || continue

    if [ "$state" = "running" ]; then
      container_name="$(docker inspect "$container_id" --format '{{.Name}}' | sed 's#^/##')"
      echo "SKIP_RUNNING_CONTAINER=$container_name IMAGE=$image"
      continue
    fi

    container_name="$(docker inspect "$container_id" --format '{{.Name}}' | sed 's#^/##')"
    echo "REMOVE_STOPPED_CONTAINER=$container_name IMAGE=$image"
    docker rm -f "$container_id" >/dev/null
  done < <(
    docker ps -a --filter "ancestor=$image" --format '{{.ID}} {{.State}}'
  )
done

echo "=== УДАЛЕНИЕ СТАРЫХ FRONTEND-ОБРАЗОВ ==="

for image in "${images[@]}"; do
  [ "$image" = "$PRODUCTION_FRONTEND_IMAGE" ] && continue

  if docker ps -a --filter "ancestor=$image" -q | grep -q .; then
    echo "SKIP_IMAGE_IN_USE=$image"
    continue
  fi

  echo "REMOVE_IMAGE=$image"
  docker image rm "$image" >/dev/null
 done

echo "=== ИТОГ ==="

docker image ls 'ab-afisha/frontend' \
  --format 'FRONTEND_IMAGE={{.Repository}}:{{.Tag}} ID={{.ID}} CREATED={{.CreatedSince}}'

remaining_non_pinned="$({
  docker image ls 'ab-afisha/frontend' --format '{{.Repository}}:{{.Tag}}' \
    | grep -v '<none>' \
    | grep -v -Fx "$PRODUCTION_FRONTEND_IMAGE" || true
} | sed '/^$/d')"

if [ -n "$remaining_non_pinned" ]; then
  echo "OLD_IMAGES_STILL_IN_USE:"
  printf '%s\n' "$remaining_non_pinned"
else
  echo "ONLY_PINNED_FRONTEND_IMAGE_REMAINS=true"
fi

echo "PINNED_FRONTEND_IMAGE=$PRODUCTION_FRONTEND_IMAGE"
echo "PINNED_FRONTEND_COMMIT=$PRODUCTION_FRONTEND_COMMIT"
