#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${ROOT:-/srv/ab-afisha}"
TARGET="${1:-a261a9de43126b22ccc09db3d101b03c0deb9319}"
BASE_SCRIPT="/tmp/promote-built-max-ingestion.sh"

cd "$ROOT"

if [[ ! "$TARGET" =~ ^[0-9a-f]{40}$ ]]; then
  echo "TARGET must be a full 40-character commit SHA" >&2
  exit 2
fi

COMPOSE_FILE="$ROOT/docker-compose.production.v2.yml"

dc() {
  docker compose -p ab-afisha -f "$COMPOSE_FILE" "$@"
}

backend_container="$(dc ps -q backend)"
test -n "$backend_container"

echo "=== 1. ДИАГНОСТИКА И РУЧНОЕ УТВЕРЖДЕНИЕ ТРЁХ СОБЫТИЙ ==="

docker exec -i "$backend_container" node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const approved = [
  {
    key: 'AUTOUSN',
    titlePart: 'АВТОУСН',
    date: '2026-07-30',
  },
  {
    key: 'FNS_RISKS',
    titlePart: 'ФНС УЖЕ ВИДИТ РИСКИ',
    date: '2026-08-04',
  },
  {
    key: 'HR_CHANGES',
    titlePart: 'КАДРОВЫЕ ИЗМЕНЕНИЯ ИДУТ',
    date: '2026-08-05',
  },
];

function utcRange(date) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

async function main() {
  for (const item of approved) {
    const { start, end } = utcRange(item.date);
    const candidates = await prisma.event.findMany({
      where: {
        source: 'MAX',
        startDate: { gte: start, lt: end },
      },
      include: {
        images: true,
        tags: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const matching = candidates.filter((candidate) =>
      candidate.title.toLocaleUpperCase('ru-RU').includes(item.titlePart),
    );

    if (matching.length !== 1) {
      throw new Error(
        `${item.key}: expected exactly one matching event, found ${matching.length}`,
      );
    }

    const event = matching[0];
    const hasImage = event.images.some((image) => Boolean(
      image.eventCardUrl ||
      image.originalUrl ||
      image.thumbnailUrl ||
      image.mainEventUrl
    ));

    console.log(`${item.key}_BEFORE_STATUS=${event.status}`);
    console.log(`${item.key}_BEFORE_MANUAL=${event.isManualStatus}`);
    console.log(`${item.key}_EXTERNAL_ID=${event.externalId ?? ''}`);
    console.log(`${item.key}_IMAGE=${hasImage}`);

    if (!hasImage) {
      throw new Error(`${item.key}: image is absent; approval cannot be applied`);
    }

    await prisma.$transaction([
      prisma.event.update({
        where: { id: event.id },
        data: {
          status: 'PUBLISHED',
          autoStatus: 'COMPLETED',
          isManualStatus: true,
          manualStatusAt: new Date(),
          manualStatusById: null,
          publishedAt: event.publishedAt ?? new Date(),
          lastSyncedAt: new Date(),
        },
      }),
      prisma.eventTag.deleteMany({
        where: {
          eventId: event.id,
          tag: 'manual-recovery-approved',
        },
      }),
      prisma.eventTag.create({
        data: {
          eventId: event.id,
          tag: 'manual-recovery-approved',
        },
      }),
    ]);

    const after = await prisma.event.findUniqueOrThrow({
      where: { id: event.id },
      select: {
        status: true,
        autoStatus: true,
        isManualStatus: true,
      },
    });

    if (
      after.status !== 'PUBLISHED' ||
      after.autoStatus !== 'COMPLETED' ||
      after.isManualStatus !== true
    ) {
      throw new Error(`${item.key}: approved status was not persisted`);
    }

    console.log(`${item.key}_AFTER_STATUS=${after.status}`);
    console.log(`${item.key}_AFTER_AUTO_STATUS=${after.autoStatus}`);
    console.log(`${item.key}_AFTER_MANUAL=${after.isManualStatus}`);
  }

  console.log('APPROVED_EVENT_STATUS_REPAIR_OK');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
NODE

echo "=== 2. ПОЛУЧАЕМ И ПРОВЕРЯЕМ PROMOTION-СЦЕНАРИЙ ==="

git fetch --prune origin main

git show origin/main:infra/scripts/promote-built-max-ingestion.sh \
  > "$BASE_SCRIPT"

chmod +x "$BASE_SCRIPT"
bash -n "$BASE_SCRIPT"
echo "BASE_SCRIPT_SYNTAX_OK"

echo "=== 3. ПЕРЕКЛЮЧАЕМ ПРОВЕРЕННЫЕ ОБРАЗЫ ==="

bash "$BASE_SCRIPT" "$TARGET"
