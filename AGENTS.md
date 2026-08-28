# AGENTS.md

## Production release lock — read first

Перед любыми изменениями, сборкой, откатом или deployment обязательно прочитать:

- `PRODUCTION_RELEASE.md`;
- `infra/deploy/production-frontend.env`.

Единственная утверждённая production-конфигурация:

- release anchor: `8aeecd1140812f6c92941146cdd4fba671ae8c93`;
- backend commit/image: `8aeecd1140812f6c92941146cdd4fba671ae8c93` / `ab-afisha/backend:backend-release-8aeecd1`;
- bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`;
- frontend commit/image: `b0e71314ec162149d2b5d63b43d0906bec6b09cd` / `ab-afisha/frontend:frontend-release-b0e7131`;
- backend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend.sh`;
- backend+frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`;
- backend+bots deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-bots.sh`;
- frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`.

Для текущего release меняется только frontend: `b0e7131` включает ранее утверждённое исправление плашки даты и финальное выравнивание публичной mobile-страницы под утверждённый макет 390 px из PR #106. Backend `8aeecd1`, bots `3a64511` и nginx должны остаться без пересоздания. Использовать только `deploy-pinned-frontend.sh`. Не использовать `deploy-pinned-app.sh`, `deploy-pinned-backend.sh`, `deploy-pinned-backend-frontend.sh` или `deploy-pinned-backend-bots.sh` для этой frontend-only promotion.

Backend `8aeecd1` остаётся утверждённым backend pin. Для его предыдущей promotion был обязателен CI-step `Compiled MAX parser runtime regression tests`, который запускает собранный `dist` и проверяет в том числе `Экспофорум, Санкт-Петербург -> venue=Экспофорум, city=Санкт-Петербург`.

Production компоненты закрепляются независимо. Нельзя определять production по `main`, `latest`, `APP_VERSION`, старому Docker-тегу или rollback-образу. Нельзя выбирать backend или bots через общий `APP_VERSION`. Новая версия становится production только после явного утверждения владельцем и одновременного обновления production lock-файлов.

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
