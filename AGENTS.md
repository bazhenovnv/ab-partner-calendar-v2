# AGENTS.md

## Production release lock — read first

Перед любыми изменениями, сборкой, откатом или deployment обязательно прочитать:

- `PRODUCTION_RELEASE.md`;
- `infra/deploy/production-frontend.env`.

Единственная утверждённая production-конфигурация:

- release anchor/backend commit: `8f2f74ac633e12212688f2d52b2df86502850cdd`;
- backend image: `ab-afisha/backend:backend-release-8f2f74a`;
- bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`;
- frontend commit/image: `3420a9d37b64ed00be26932a6a09cf72d02307cd` / `ab-afisha/frontend:frontend-release-3420a9d`;
- backend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend.sh`;
- backend+frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`;
- backend+bots deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-bots.sh`;
- frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`.

Для текущей promotion меняется только backend. Backend `8f2f74a` включает PR #131 / CI #859: legacy MAX `sourcePostUrl`, ранее сформированные как `/join/...?...mid=...`, ремонтируются через официальный `GET /messages?message_ids=...`; сохраняется только `message.url`, возвращённый MAX, после проверки `MAX_SOURCE_CHANNEL_ID`, HTTPS и домена `max.ru`. Repair запускается при старте backend и каждую минуту. Если MAX не возвращает `message.url`, permalink не придумывается. Frontend `3420a9d`, bots `3a64511` и nginx должны остаться без пересоздания. Использовать только `deploy-pinned-backend.sh`.

Frontend `3420a9d` сохраняет PR #129 / CI #855: в форме редактирования `sourcePostUrl` показывается read-only полем «Ссылка на источник», рядом кнопка «Перейти на источник». После backend repair форма автоматически использует обновлённый официальный URL.

Сохраняется canonical-city publication flow из PR #125 / CI #847: формы создания/редактирования физического события сохраняют согласованные `cityId + cityName`, readiness использует тот же контракт, что real publication guard, а legacy `cityName` без `cityId` может быть автоматически привязан только по единственному активному case-insensitive exact match. Fuzzy/contains и неоднозначная автопривязка запрещены. Сохраняются также контракт карусели «Главные события», редакционный кабинет и третий MAX target.

Новой Prisma migration в этой promotion нет. Ручное изменение production-схемы запрещено.

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
