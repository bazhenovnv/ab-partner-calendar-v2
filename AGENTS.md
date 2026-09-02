# AGENTS.md

## Production release lock — read first

Перед любыми изменениями, сборкой, откатом или deployment обязательно прочитать:

- `PRODUCTION_RELEASE.md`;
- `infra/deploy/production-frontend.env`.

Единственная утверждённая production-конфигурация:

- release anchor/backend commit: `213e5076fc274254abf9a56612bd086df2155ce5`;
- backend image: `ab-afisha/backend:backend-release-213e507`;
- frontend commit/image: `afc024cfc9f46ebcba1bb383f77f63779062e648` / `ab-afisha/frontend:frontend-release-afc024c`;
- bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`;
- backend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend.sh`;
- backend+frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`;
- backend+bots deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-bots.sh`;
- frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`.

Текущая promotion — **frontend-only** из application PR #136, проверенного полным CI #870. Исправляется только мобильная геометрия декоративного блокнота/растения в футере: прежнее crop-окно `124×158 px` обрезало правую кромку блокнота и нижние листья. Финальный mobile override использует crop `129×174 px`, notebook source `180 px` и `right: 10px`, сохраняя отдельную чашку и desktop/tablet без изменений. Добавлен regression-test `mobile-footer-artwork-clipping.test.mjs`.

Для этой promotion:

- backend остаётся `213e507` и не пересоздаётся;
- bots остаются `3a64511` и не пересоздаются;
- nginx не пересоздаётся;
- Prisma schema/migrations не меняются;
- bitmap `notebook-stationery.png` не меняется;
- использовать только `deploy-pinned-frontend.sh`.

Сохраняется private MAX source-preview contract из PR #133 / CI #865: source channel MAX подтверждён как `type=channel`, `is_public=false`; точный `GET /messages/{mid}` возвращает сообщение и `chat_id`, но не `message.url`. Поэтому `/join/...?...mid=...` не считается permalink конкретного поста. Защищённый `GET /events/admin/:id/source-preview` получает точное сообщение по `externalId`, редактор показывает «Исходный пост MAX», а fallback-действие для приватного канала называется «Открыть канал MAX». Repair-сервис кэширует visibility канала на 6 часов и не выполняет бессмысленные minute-by-minute batch `/messages` запросы для приватного канала.

Сохраняется canonical-city publication flow из PR #125 / CI #847: формы создания/редактирования физического события сохраняют согласованные `cityId + cityName`, readiness использует тот же контракт, что real publication guard, а legacy `cityName` без `cityId` может быть автоматически привязан только по единственному активному case-insensitive exact match. Fuzzy/contains и неоднозначная автопривязка запрещены. Сохраняются также контракт карусели «Главные события», редакционный кабинет, три MAX target и Telegram IPv6 runtime.

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
