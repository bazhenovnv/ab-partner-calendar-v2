# AGENTS.md

## Production release lock — read first

Перед любыми изменениями, сборкой, откатом или deployment обязательно прочитать:

- `PRODUCTION_RELEASE.md`;
- `infra/deploy/production-frontend.env`.

Единственная утверждённая production-версия приложения:

- commit: `a8a91ced755eb0ee036176336bc12b4d230f7b75`;
- backend image: `ab-afisha/backend:backend-release-a8a91ce`;
- frontend image: `ab-afisha/frontend:frontend-release-a8a91ce`;
- full deploy script: `/srv/ab-afisha/infra/scripts/deploy-pinned-app.sh`;
- frontend-only deploy script: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`.

Нельзя определять production по `main`, `latest`, старому Docker-тегу или старому deploy-скрипту. Нельзя выбирать backend через общий `APP_VERSION`, потому что он также используется bots. Новая версия становится production только после явного утверждения владельцем и обновления production lock-файлов.

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
