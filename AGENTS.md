# AGENTS.md

## Production release lock — read first

Перед любыми frontend-изменениями, сборкой, откатом или деплоем обязательно прочитать:

- `PRODUCTION_RELEASE.md`;
- `infra/deploy/production-frontend.env`.

Единственная утверждённая production-версия frontend:

- commit: `3e308c5355ad5ebd09c4fd634ba7df965a7bf6ca`;
- image: `ab-afisha/frontend:frontend-release-3e308c5`;
- deploy script: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`.

Нельзя определять production по `main`, `latest`, старому Docker-тегу или старому deploy-скрипту. Новая версия становится production только после явного утверждения владельцем и обновления production lock-файлов.

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
