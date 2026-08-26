# AGENTS.md

## Production release lock — read first

Перед любыми изменениями, сборкой, откатом или deployment обязательно прочитать:

- `PRODUCTION_RELEASE.md`;
- `infra/deploy/production-frontend.env`.

Единственная утверждённая production-конфигурация:

- release anchor: `a0727468eb1966cdc7fd4ca3f469eeacf51b09a5`;
- backend commit/image: `a0727468eb1966cdc7fd4ca3f469eeacf51b09a5` / `ab-afisha/backend:backend-release-a072746`;
- bots commit/image: `a0727468eb1966cdc7fd4ca3f469eeacf51b09a5` / `ab-afisha/bots:bots-release-a072746`;
- frontend commit/image: `79d85dc230b71699977bfec633db411a49c72f4f` / `ab-afisha/frontend:frontend-release-79d85dc`;
- backend+bots deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-bots.sh`;
- frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`.

Production компоненты закрепляются независимо. Нельзя определять production по `main`, `latest`, `APP_VERSION`, старому Docker-тегу или rollback-образу. Нельзя выбирать backend или bots через общий `APP_VERSION`. Новая версия становится production только после явного утверждения владельцем и обновления production lock-файлов.

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
