# AGENTS.md

## Production release lock — read first

Перед любыми изменениями, сборкой, откатом или deployment обязательно прочитать:

- `PRODUCTION_RELEASE.md`;
- `infra/deploy/production-frontend.env`.

Единственная утверждённая production-конфигурация:

- release anchor: `9ecf18060b600e3575d86755dcebd9a2ee3f14ff`;
- backend commit/image: `9ecf18060b600e3575d86755dcebd9a2ee3f14ff` / `ab-afisha/backend:backend-release-9ecf180`;
- bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`;
- frontend commit/image: `9ecf18060b600e3575d86755dcebd9a2ee3f14ff` / `ab-afisha/frontend:frontend-release-9ecf180`;
- backend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend.sh`;
- backend+frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`;
- backend+bots deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-bots.sh`;
- frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`.

Для текущей promotion меняются backend и frontend. Release `9ecf180` исправляет редакционный кабинет `/admin/editorial`: добавляет публикацию сейчас или по дате/времени через существующее поле `scheduledAt`, безопасный scheduler с атомарным `SCHEDULED -> PUBLISHING`, обработку изображений без crop, сохранение успешных файлов при частичной ошибке загрузки, единый полный preview, новые подписи каналов и двухколоночный выбор MAX/ТГ. Bots `3a64511` и nginx должны остаться без пересоздания. Использовать только `deploy-pinned-backend-frontend.sh`.

Новой Prisma migration в этой promotion нет: поле `EditorialPost.scheduledAt` уже существует в production-схеме после ранее применённой migration `20260831100000_add_editorial_publisher`. Backend Docker entrypoint по-прежнему перед запуском приложения выполняет `pnpm exec prisma migrate deploy`; ручное изменение production-схемы запрещено.

CI обязан сохранять `Compiled MAX parser runtime regression tests`, включая проверку `Экспофорум, Санкт-Петербург -> venue=Экспофорум, city=Санкт-Петербург`.

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
