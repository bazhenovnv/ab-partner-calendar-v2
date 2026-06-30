FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.0
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/bots/package.json ./apps/bots/
RUN pnpm install --frozen-lockfile

FROM deps AS shared-build
COPY packages/shared ./packages/shared
RUN pnpm --filter @ab-afisha/shared build

FROM shared-build AS build
COPY apps/bots ./apps/bots
RUN pnpm --filter bots run build

FROM node:20-alpine AS runner
RUN npm install -g pnpm@9.15.0
WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/bots/package.json ./apps/bots/
COPY --from=build /app/apps/bots/dist ./apps/bots/dist

RUN pnpm install --prod --frozen-lockfile

WORKDIR /app/apps/bots
CMD ["node", "dist/index.js"]
