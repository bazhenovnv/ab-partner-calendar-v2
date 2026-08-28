# AGENTS.md

## Production release lock — read first

Перед любыми изменениями, сборкой, откатом или deployment обязательно прочитать:

- `PRODUCTION_RELEASE.md`;
- `infra/deploy/production-frontend.env`.

Единственная утверждённая production-конфигурация:

- release anchor: `8aeecd1140812f6c92941146cdd4fba671ae8c93`;
- backend commit/image: `8aeecd1140812f6c92941146cdd4fba671ae8c93` / `ab-afisha/backend:backend-release-8aeecd1`;
- bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`;
- frontend commit/image: `4d8daa1b069ee8f69f5a43c808cf7506de71d5c9` / `ab-afisha/frontend:frontend-release-4d8daa1`;
- backend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend.sh`;
- backend+frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`;
- backend+bots deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-bots.sh`;
- frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`.

Для текущего release меняется только frontend: `4d8daa1` включает mobile layout 390 px, touch-swipe «Главных событий» и финальную доводку PR #112 — контакты/divider сдвинуты левее, календарь слегка уменьшен, цитатам возвращён белый фон. Bitmap assets не изменяются. Backend `8aeecd1`, bots `3a64511` и nginx должны остаться без пересоздания. Использовать только `deploy-pinned-frontend.sh`.

Backend `8aeecd1` остаётся утверждённым backend pin. CI обязан сохранять `Compiled MAX parser runtime regression tests`, включая проверку `Экспофорум, Санкт-Петербург -> venue=Экспофорум, city=Санкт-Петербург`.

Production компоненты закрепляются независимо. Нельзя определять production по `main`, `latest`, `APP_VERSION`, старому Docker-тегу или rollback-образу. Новая версия становится production только после явного утверждения владельцем и одновременного обновления production lock-файлов.

## Project

AB Partner Calendar v2 — календарь бухгалтерских, налоговых и партнёрских событий.

## Main rule

Do not break existing behavior. Make small, reviewable changes.

## Before editing

- Read related files.
- Check existing patterns.
- Check Prisma schema for backend data changes.
- Check UI components before changing design.
- Check API contracts before changing request/response structures.

## Before committing

Run available checks:

```bash
npm run lint
npm run typecheck
npm run build
# or pnpm equivalents if the project uses pnpm
```

## Never commit

- `.env`;
- `.env.*`;
- secrets;
- tokens;
- patch files;
- build cache;
- `tsbuildinfo`;
- `node_modules`;
- temporary files.
