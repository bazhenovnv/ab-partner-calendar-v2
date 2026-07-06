FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.0
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --frozen-lockfile

FROM deps AS shared-build
COPY packages/shared ./packages/shared
RUN pnpm --filter @ab-afisha/shared build

FROM shared-build AS build
COPY apps/backend ./apps/backend
RUN pnpm --filter backend exec prisma generate
RUN pnpm --filter backend run build

FROM node:20-alpine AS runner
RUN npm install -g pnpm@9.15.0
WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/backend/package.json ./apps/backend/
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/prisma ./apps/backend/prisma

RUN pnpm install --prod --frozen-lockfile
# Generate Prisma Client in the production image after prod deps are installed
RUN pnpm --filter backend exec prisma generate

WORKDIR /app/apps/backend

COPY apps/backend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/main"]
