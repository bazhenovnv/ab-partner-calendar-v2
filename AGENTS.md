# AGENTS.md

## Production release lock — read first

Перед любыми изменениями, сборкой, откатом или deployment обязательно прочитать:

- `PRODUCTION_RELEASE.md`;
- `infra/deploy/production-frontend.env`.

Единственная утверждённая production-конфигурация:

- release anchor/backend commit: `213e5076fc274254abf9a56612bd086df2155ce5`;
- backend image: `ab-afisha/backend:backend-release-213e507`;
- frontend commit: `4aa0bd5f32889a92c4afa332b8a15e32df2c13b8`;
- frontend image: `ab-afisha/frontend:frontend-release-4aa0bd5`;
- bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`;
- backend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend.sh`;
- backend+frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`;
- backend+bots deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-bots.sh`;
- frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`.

Текущая promotion — **frontend-only**. Application commit `4aa0bd5` включает все предыдущие мобильные исправления и PR #148 / CI #898. Текущая мобильная геометрия:

- белая quote-band накрывает нижнюю часть изображений ног; сами ноги остаются на сером фоне выше полосы;
- высота белой quote-band уменьшена до `114 px`, нижний отступ `8 px`, чтобы верхний и нижний запас вокруг мятной рамки выглядели симметрично;
- белая quote-band имеет `z-index: 2`, фигуры `z-index: 1`, а мятная рамка/цитата `z-index: 3`;
- колонка «Контакты» больше не поднята на `-2px` и визуально выровнена с «Наши проекты»;
- footer title «Афиша бухгалтера» опущен до `top: 7px` относительно логотипа;
- верхний mobile header title «Афиша Бухгалтера» опущен до `top: 4px` относительно логотипа;
- безопасный crop блокнота/растения сохраняется без лишней чашки справа;
- desktop header/footer/quotes не меняются.

Сохраняется PR #146 / CI #894: iOS/iPadOS использует отдельный native Touch Events path на всю gallery-зону карусели «Главные события», axis lock `7 px`, swipe threshold `28 px`, `passive: false` только для horizontal touchmove, подавление случайного click после swipe и повторное использование существующего ArrowLeft/ArrowRight carousel path. Android Pointer Events path не меняется.

Сохраняется PR #142 / CI #887: compact-карусель «Главные события» остаётся без `rotateY` и `rotateZ`, при этом translate/scale/opacity/brightness/blur/z-index и эффект глубины сохраняются.

Сохраняются PR #138 / CI #873 и PR #140 / CI #879 по мобильному футеру: блокнот остаётся у правой границы, лишний фрагмент чашки справа не показывается, нижние мятные листья видимы, desktop footer не меняется.

Сохраняется MAX source-preview контракт из PR #133 / CI #865: source channel приватный (`is_public=false`), MAX не возвращает `message.url`, поэтому `/join/...?...mid=...` нельзя выдавать за permalink конкретного поста. Защищённый `GET /events/admin/:id/source-preview` показывает исходный MAX-пост в редакторе, а для приватного канала действие называется «Открыть канал MAX». Repair-сервис кэширует visibility на 6 часов и не делает бессмысленные batch message-link запросы для приватного канала.

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
