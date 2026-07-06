FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.0
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/bots/package.json ./apps/bots/
RUN pnpm install --frozen-lockfile

FROM deps AS shared-build
COPY packages/shared ./packages/shared
RUN pnpm --filter @ab-afisha/shared build

FROM shared-build AS build
COPY apps/bots ./apps/bots
RUN pnpm --filter bots run build
# Create production deployment with prod deps resolved (handles workspace deps correctly)
RUN pnpm --filter bots deploy --prod /app/bots-deploy
# Copy built dist into the deployment directory
RUN cp -r apps/bots/dist /app/bots-deploy/dist

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=build /app/bots-deploy .
CMD ["node", "dist/index.js"]
