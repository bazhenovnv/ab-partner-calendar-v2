# AGENTS.md

## Production release lock — read first

Перед любыми изменениями, сборкой, откатом или deployment обязательно прочитать:

- `PRODUCTION_RELEASE.md`;
- `infra/deploy/production-frontend.env`.

Единственная утверждённая production-конфигурация:

- release anchor/backend/frontend commit: `213e5076fc274254abf9a56612bd086df2155ce5`;
- backend image: `ab-afisha/backend:backend-release-213e507`;
- frontend image: `ab-afisha/frontend:frontend-release-213e507`;
- bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`;
- backend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend.sh`;
- backend+frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`;
- backend+bots deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-bots.sh`;
- frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`.

Текущая promotion — backend+frontend из PR #133, финально проверенного CI #865. Production runtime подтвердил для source channel MAX: `type=channel`, `is_public=false`, а точный `GET /messages/{mid}` возвращает нужное сообщение и `chat_id`, но не возвращает `message.url`. Поэтому запрещено выдавать `/join/...?...mid=...` за permalink конкретного поста.

Контракт текущего релиза:

- защищённый `GET /events/admin/:id/source-preview` получает точное MAX-сообщение по сохранённому `externalId` и проверяет `MAX_SOURCE_CHANNEL_ID`;
- редактор события показывает блок «Исходный пост MAX»: исходный текст, дату/время, message ID и доступное изображение;
- для приватного канала join-link остаётся без переписывания и действие называется «Открыть канал MAX»;
- если MAX когда-либо вернёт валидный `message.url`, интерфейс может показать «Перейти к посту MAX»;
- repair-сервис сначала проверяет visibility канала, кэширует её на 6 часов и для приватного канала не выполняет бессмысленные minute-by-minute batch `/messages` запросы;
- Prisma schema/migrations не меняются;
- bots `3a64511` и nginx не пересоздаются;
- использовать только `deploy-pinned-backend-frontend.sh`.

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
