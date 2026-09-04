# AGENTS.md

## Production release lock — read first

Перед любыми изменениями, сборкой, откатом или deployment обязательно прочитать:

- `PRODUCTION_RELEASE.md`;
- `infra/deploy/production-frontend.env`.

Единственная утверждённая production-конфигурация:

- release anchor/backend commit: `213e5076fc274254abf9a56612bd086df2155ce5`;
- backend image: `ab-afisha/backend:backend-release-213e507`;
- frontend commit: `61b4525db6ff35f43081226fd2989e5b1023863e`;
- frontend image: `ab-afisha/frontend:frontend-release-61b4525`;
- bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`;
- backend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend.sh`;
- backend+frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`;
- backend+bots deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-bots.sh`;
- frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`.

Текущая promotion — **frontend-only**. Application commit `61b4525` сохраняет PR #151 / CI #907, PR #152 / CI #909, PR #154 / CI #913, PR #156 / CI #919, PR #158 / CI #925 и PR #160 / CI #929, а также включает PR #162 / CI #935 с возвращением точного image-flight при открытии события. Текущая геометрия и взаимодействия:

- при открытии события временный image-flight clone снова видим и плавно увеличивается от точного `sourceRect` исходной картинки карточки до точного `finalImageRect`, который браузер получает через `elements.image.getBoundingClientRect()` после рендера модального окна;
- конечные `x/y/width/height` flight полностью совпадают с фактической картинкой в modal image-stage; промежуточный `scale`, `transform` или geometry overshoot не используются;
- реальная modal image скрыта на время opening-flight и становится видимой после достижения конечной геометрии, поэтому двойного изображения нет;
- opening clone не получает увеличивающую визуальную площадь финальную тень, поэтому нет ложного «перераздувания» перед handoff;
- при desktop 1920 утверждённая максимальная геометрия даёт modal `1496×788`, image `647×647`, примерно `x=65px`, `y=70.5px` относительно modal; при mobile 390 modal `348×684`, image `309×309`, `x=19px`, `y=54px`;
- обратный image-flight при закрытии события сохраняется;
- общий transition path действует для desktop, tablet и mobile;
- мобильный hero использует утверждённый Figma artwork `hero-mobile-figma-20260903.webp`;
- верхняя граница mobile hero artwork плавно растворяется в белой поверхности hero через CSS mask, при этом заголовок, описание и CTA остаются отдельным верхним слоем;
- на touch-устройствах у hero, календаря и quote-area убраны лишние hover/active/focus переходы, создававшие вторую тень и артефакты скругления;
- footer brand/logo оптически сдвинут влево к вертикали описания;
- блокнот/растение сохраняют утверждённый размер `146×206`, подняты выше через `top: -8px` и визуально сдвинуты вправо через `translateX(4px)` при сохранении release anchor `right: -6px`; для экранов до 350 px используется `top: -4px`, `right: -3px`, `translateX(3px)` и безопасный scale `0.94`;
- production lock и отдельный regression-test проверяют standard/narrow declaration blocks отдельно, поэтому узкий media query больше не может случайно удовлетворить проверку стандартной mobile-геометрии;
- иконка телефона в «Контакты» увеличена оптически;
- белая quote-band сохраняет более тёмную тень, а фигуры закреплены по левому/правому краям без отрицательного горизонтального смещения;
- визуальное движение карусели «Главные события» ускорено в 2 раза: `520 -> 260 ms`, двухшаговое `780 -> 390 ms`;
- визуальный direction indicator возвращается в центр через `280 ms` на реальной центральной точке; временный `::after` overlay удалён, поэтому при финальном сбросе state на `560 ms` больше нет мерцания;
- PR #152 удаляет CSS `!important` с `--card-motion-duration`, поэтому iOS Touch Events bridge по-прежнему может временно ставить `90 ms` во время drag и безопасно восстанавливать базовую скорость;
- backend, bots и nginx этой promotion не меняются.

Сохраняется PR #146 / CI #894: iOS/iPadOS использует отдельный native Touch Events path на всю gallery-зону карусели «Главные события», axis lock `7 px`, swipe threshold `28 px`, `passive: false` только для horizontal touchmove, подавление случайного click после swipe и повторное использование существующего ArrowLeft/ArrowRight carousel path. Android Pointer Events path не меняется.

Сохраняется PR #148 / CI #898: белая quote-band накрывает нижнюю часть изображений ног, зона выше неё остаётся серой, колонка «Контакты» выровнена с «Наши проекты», а безопасный crop блокнота/растения не показывает лишнюю чашку.

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
