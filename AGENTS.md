# AGENTS.md

## Production release lock — read first

Перед любыми изменениями, сборкой, откатом или deployment обязательно прочитать:

- `PRODUCTION_RELEASE.md`;
- `infra/deploy/production-frontend.env`.

Единственная утверждённая production-конфигурация:

- release anchor: `0f3938dd6cd348700f6b867fdd140eb515a14791`;
- backend commit/image: `0f3938dd6cd348700f6b867fdd140eb515a14791` / `ab-afisha/backend:backend-release-0f3938d`;
- bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`;
- frontend commit/image: `0f3938dd6cd348700f6b867fdd140eb515a14791` / `ab-afisha/frontend:frontend-release-0f3938d`;
- backend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend.sh`;
- backend+frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`;
- backend+bots deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-bots.sh`;
- frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`.

Для текущей promotion меняются backend и frontend. Release `0f3938d` добавляет редакционный кабинет `/admin/editorial` для публикаций Telegram/MAX, MAX `chat_id` discovery/binding, rich-text/emoji/image templates, per-channel errors/retry и MAX native views. Bots `3a64511` и nginx должны остаться без пересоздания. Использовать только `deploy-pinned-backend-frontend.sh`.

Релиз включает аддитивную Prisma migration `20260831100000_add_editorial_publisher`. Backend Docker entrypoint перед запуском приложения выполняет `pnpm exec prisma migrate deploy`; ручное изменение production-схемы запрещено. Старый backend совместим с добавленными таблицами, поэтому rollback images после успешной migration остаётся безопасным.

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
