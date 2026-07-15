FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.0
# openssl is required by Prisma; ca-certificates is required for outbound HTTPS.
RUN apk add --no-cache openssl ca-certificates
# MAX platform-api2.max.ru is signed by the Russian Trusted Root CA, which is
# not included in Alpine's default trust store. Add the approved root certificate
# and rebuild the generated CA bundle without disabling TLS verification.
COPY apps/backend/certs/russian-trusted-root-ca.crt /usr/local/share/ca-certificates/russian-trusted-root-ca.crt
RUN update-ca-certificates
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --frozen-lockfile

FROM deps AS shared-build
COPY packages/shared ./packages/shared
RUN pnpm --filter @ab-afisha/shared build

FROM shared-build AS build
COPY apps/backend ./apps/backend
# MAX GET /updates is a long-poll endpoint. The hourly reconciliation job must
# request a one-second server timeout so an empty queue is not reported as an
# application TimeoutError after 30 seconds. Keep this build guard idempotent
# until the source-level change is present in every deployment checkout.
RUN python3 - <<'PY'
from pathlib import Path

path = Path('/app/apps/backend/src/modules/max-import/max-import.service.ts')
text = path.read_text()
needle = "      types: 'message_created,message_edited,message_removed,bot_added,bot_removed',\n"
addition = (
    needle
    + "      // Hourly reconciliation is a short poll, not a persistent long-poll connection.\n"
    + "      timeout: '1',\n"
)
if "      timeout: '1',\n" not in text:
    if needle not in text:
        raise SystemExit('MAX poll URLSearchParams block not found')
    path.write_text(text.replace(needle, addition, 1))
PY
# prebuild script in apps/backend/package.json runs "prisma generate" first
RUN pnpm --filter backend run build

FROM node:20-alpine AS runner
RUN npm install -g pnpm@9.15.0
# openssl is required by Prisma; ca-certificates is required for outbound HTTPS.
RUN apk add --no-cache openssl ca-certificates
COPY apps/backend/certs/russian-trusted-root-ca.crt /usr/local/share/ca-certificates/russian-trusted-root-ca.crt
RUN update-ca-certificates
WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/backend/package.json ./apps/backend/
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/prisma ./apps/backend/prisma

RUN pnpm install --prod
# Generate Prisma Client in the production image after prod deps are installed
RUN pnpm --filter backend exec prisma generate --schema=prisma/schema.prisma

WORKDIR /app/apps/backend

COPY apps/backend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/main"]