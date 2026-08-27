# AGENTS.md

## Production release lock — read first

Перед любыми изменениями, сборкой, откатом или deployment обязательно прочитать:

- `PRODUCTION_RELEASE.md`;
- `infra/deploy/production-frontend.env`.

Единственная утверждённая production-конфигурация:

- release anchor: `3b70ea58e9284e8e590eb7bf08a0c394000ebcd2`;
- backend commit/image: `3b70ea58e9284e8e590eb7bf08a0c394000ebcd2` / `ab-afisha/backend:backend-release-3b70ea5`;
- bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`;
- frontend commit/image: `3b70ea58e9284e8e590eb7bf08a0c394000ebcd2` / `ab-afisha/frontend:frontend-release-3b70ea5`;
- backend+frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`;
- backend+bots deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-bots.sh`;
- frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`.

Для release `3b70ea5` bots и nginx должны остаться без пересоздания. Не использовать `deploy-pinned-app.sh` для этого релиза: в нём есть MAX-specific backfill/reconciliation процедуры, не относящиеся к исправлению фильтра городов.

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