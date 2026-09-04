# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Release anchor / backend commit: `213e5076fc274254abf9a56612bd086df2155ce5`
- Backend image: `ab-afisha/backend:backend-release-213e507`
- Frontend commit: `8c13e9bd57fce7205cd6ea55223812061bf38d4e`
- Frontend image: `ab-afisha/frontend:frontend-release-8c13e9b`
- Bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`
- Дата утверждения: `2026-09-04`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Production-компоненты закрепляются независимо: release anchor остаётся на backend `213e507`, а frontend продвигается отдельно до `8c13e9b`.

## Текущая promotion — зеркальный opening image-flight без скачка handoff

Текущая promotion меняет **только frontend** до application merge commit `8c13e9bd57fce7205cd6ea55223812061bf38d4e`.

Application PR #164 / CI #948 уточняет opening image-flight как геометрически обратный closing path и устраняет жёсткий handoff между отдельными card/modal image variants:

- opening начинается точной картинкой карточки (`originImageElement`), поэтому в исходной точке сохраняются её `src/currentSrc`, `object-fit` и `object-position`;
- стартовая геометрия берётся из `sourceRect`, конечная — из `finalImageRect = modalImage.getBoundingClientRect()` после рендера modal;
- opening image duration = closing image duration: `500 ms`;
- opening easing `cubic-bezier(0, 0.55, 0.45, 1)` является зеркальной кривой к closing `cubic-bezier(0.55, 0, 1, 0.45)`;
- flight содержит только `fromRect -> toRect`, без промежуточного `scale`, `transform` или дополнительного geometry overshoot;
- real modal image скрыта на время движения; после достижения точной конечной геометрии она раскрывается под неподвижным clone;
- clone в конечной точке больше не меняет `x/y/width/height` и плавно растворяется за `90 ms` только по opacity, поэтому смена `eventCardUrl` / `mainEventUrl` / `modalUrl` не создаёт скачка размера или координат;
- при desktop 1920 утверждённая максимальная геометрия: modal `1496×788`, финальная картинка `647×647`, примерно `x=65px`, `y=70.5px` относительно modal;
- при mobile 390: modal `348×684`, финальная картинка `309×309`, `x=19px`, `y=54px` относительно modal;
- runtime не хардкодит эти координаты: браузер каждый раз измеряет фактический `getBoundingClientRect()` для текущего viewport;
- при закрытии события сохраняется существующий reverse image-flight к исходной карточке;
- общий transition path работает одинаково для desktop, tablet и mobile;
- regression-tests фиксируют exact `sourceRect -> finalImageRect`, reverse easing/duration и stationary handoff без повторного geometry movement;
- backend, bots, nginx, данные, Prisma schema и migrations не меняются.

Сохраняется application PR #162 / CI #935, который вернул видимый opening image-flight и закрепил его конечную геометрию по фактической modal image. PR #164 не меняет размеры modal layout и развивает этот контракт: исходная card artwork сохраняется до начала движения, а завершение flight происходит без геометрического скачка между разными image variants.

Сохраняется application PR #160 / CI #929, в котором была устранена предыдущая версия overshoot-проблемы. Текущий контракт по-прежнему требует, чтобы opening-flight завершался строго в фактической конечной геометрии modal image без дополнительного увеличения `x/y/width/height`.

Сохраняется application PR #158 / CI #925 с устранением короткого мерцания центральной точки после ускоренного возврата direction indicator:

- визуальный возврат в центр по-прежнему происходит через `280 ms` внутри существующего `560 ms` indicator cycle;
- временный `::after` overlay удалён;
- после `280 ms` тёмной становится сама реальная центральная точка `button:nth-child(2)`;
- боковая активная точка в тот же момент возвращается к серому цвету;
- к моменту финального React state reset на `560 ms` центральная точка уже имеет нужный тёмный цвет, поэтому больше нет краткого blink/провала яркости;
- отдельный regression-test запрещает возврат pseudo-element overlay и проверяет real-centre-dot path;
- скорость карусели и iOS swipe workaround не меняются.

Сохраняется application PR #156 / CI #919 с финальной корректировкой mobile footer notebook:

- размер блокнота/растения сохраняется `146×206`;
- стандартная mobile-композиция поднята выше через `top: -8px`;
- production anchor `right: -6px` сохранён, а дополнительный визуальный сдвиг вправо выполняется через `translateX(4px)`;
- для экранов до 350 px используется отдельная безопасная геометрия: `top: -4px`, `right: -3px`, `translateX(3px)`, `scale(0.94)`;
- independent cup artwork не меняется;
- regression-test извлекает standard/narrow declaration blocks отдельно, поэтому более поздний narrow media query больше не может ложно удовлетворить проверку стандартной mobile-геометрии;
- desktop footer, hero, backend, bots и nginx не меняются.

Сохраняется application PR #154 / CI #913:

- верхняя граница mobile Figma artwork плавно растворяется в белой поверхности hero через CSS `mask-image` / `-webkit-mask-image`;
- заголовок, описание и CTA остаются отдельным верхним слоем над artwork;
- mobile hero сохраняет утверждённый artwork `hero-mobile-figma-20260903.webp` с календарём, книгами и вазой;
- блокнот/растение в мобильном футере дополнительно увеличены;
- для экранов до 350 px сохраняется отдельная безопасная геометрия;
- independent cup artwork не меняется;
- desktop footer, desktop hero, backend, bots и nginx не меняются.

Сохраняется application PR #151 / CI #907:

- мобильный hero использует утверждённый Figma artwork `hero-mobile-figma-20260903.webp`;
- исходная desktop-композиция hero сохраняется и на mobile не рендерится;
- у hero, календаря и quote-area на touch-устройствах убраны переходы состояний, создававшие вторую тень и артефакты скруглённых углов;
- footer brand/logo оптически сдвинут влево к вертикали текста «Мероприятия для бухгалтеров по всей России»;
- блокнот/растение увеличены и закреплены у правой границы;
- иконка телефона в «Контакты» увеличена оптически без сдвига текста;
- тень белой quote-band сделана темнее;
- изображения людей закреплены по реальным левому и правому краям mobile viewport без отрицательных горизонтальных offsets;
- direction indicator карусели визуально возвращается в центр через `280 ms`.

Сохраняется application PR #152 / CI #909, устраняющий конфликт ускорения с iOS swipe:

- stylesheet не задаёт `--card-motion-duration: 260ms !important`;
- обычный шаг карусели визуально нормализуется `520 -> 260 ms`;
- двухшаговое движение нормализуется `780 -> 390 ms`;
- iOS Touch Events bridge сохраняет возможность временно ставить `--card-motion-duration: 90ms` во время drag;
- после drag восстанавливается ускоренная базовая длительность `260 ms`;
- таким образом 2× визуальная скорость сохраняется и не ломает существующий iOS workaround против ghost cards/коалесцированных свайпов.

## Сохраняемая mobile quote-band

Сохраняется PR #148 / CI #898:

- зона с изображениями ног выше quote-band остаётся серой `#f1f1f1`;
- белая quote-band накрывает нижнюю часть изображений ног, поэтому ноги визуально уходят **под** белый фон цитаты;
- quote-band имеет `height: 114px`, `bottom: 8px`, `z-index: 2`;
- изображения людей имеют `z-index: 1`, мятная рамка/цитата `z-index: 3`;
- верхний и нижний визуальный отступы белой quote-band относительно мятной рамки выравниваются;
- колонка «Контакты» выровнена с «Наши проекты»;
- footer/header brand title сохраняют утверждённую оптическую геометрию.

## Сохраняемый iOS swipe

Сохраняется PR #146 / CI #894:

- Android, мышь и pen продолжают использовать существующий Pointer Events path;
- только iOS/iPadOS получает отдельный native Touch Events path на **всю gallery-зону** карусели;
- direction lock срабатывает после `7 px`, поэтому вертикальная прокрутка страницы сохраняется;
- подтверждённый горизонтальный жест использует `touchmove` с `passive: false` и `preventDefault()` только после определения горизонтального направления;
- iOS swipe threshold = `28 px`;
- drag feedback сохраняется через существующие `--drag-offset` и `--card-motion-duration`;
- после горизонтального swipe подавляется случайный click по карточке;
- переход выполняется через существующий `ArrowLeft` / `ArrowRight` path.

## Сохраняемое выравнивание compact-карусели «Главные события»

Сохраняется PR #142 / CI #887:

- боковые карточки в compact-режиме (`max-width: 1023px`) не имеют `rotateY` и `rotateZ`;
- верхние и нижние края карточек остаются горизонтальными, боковые края — вертикальными;
- сохраняются `translateX`, `translateY`, `translateZ`, `scale`, `opacity`, `brightness`, `blur` и `z-index`;
- эффект глубины и перекрытия карусели сохраняется;
- desktop-геометрия не меняется.

## Сохраняемый мобильный футер

Сохраняются PR #138 / CI #873, PR #140 / CI #879 и PR #144 / CI #891:

- блокнот расположен у правой границы мобильного viewport;
- отрицательный внутренний сдвиг source bitmap удалён;
- crop блокнота не показывает лишний фрагмент чашки справа;
- нижние мятные листья остаются видимыми;
- для экранов до 350 px используется отдельная безопасная геометрия;
- desktop footer не меняется.

## Сохраняемый контракт приватного MAX source preview

Сохраняется application PR #133 / CI #865 и production runtime-диагностика:

- source channel MAX имеет `type=channel`, `is_public=false`;
- точный `GET /messages/{mid}` возвращает нужное сообщение и правильный `recipient.chat_id`;
- `message.url` для приватного канала отсутствует;
- запрещено выдавать `/join/...?...mid=...` за permalink конкретного поста;
- защищённый `GET /events/admin/:id/source-preview` получает точное сообщение по сохранённому `externalId`;
- редактор показывает блок `Исходный пост MAX` с исходным текстом, датой/временем, `mid` и доступными вложениями;
- для приватного канала используется действие `Открыть канал MAX`;
- если MAX реально вернёт `directPostUrl`, разрешено действие `Перейти к посту MAX`;
- source-link repair сначала проверяет `is_public`, кэширует visibility на `6 часов` и не выполняет бессмысленные minute-by-minute batch message-link запросы для приватного канала.

## Сохраняемый canonical-city publication flow

Сохраняется PR #125 / CI #847:

- формы создания и редактирования `OFFLINE`/`HYBRID` используют активный справочник городов;
- сохраняются согласованные `cityId + cityName`;
- readiness совпадает с реальным backend publication guard;
- legacy `cityName` без `cityId` автоматически связывается только при единственном активном case-insensitive exact match;
- fuzzy/contains и неоднозначная автопривязка запрещены.

## Сохраняемый редакционный функционал

Сохраняются application PR #119 / CI #832 и PR #121 / CI #836:

- `Разместить сейчас` / `Запланировать`;
- очередь публикаций каждые 15 секунд;
- атомарный `SCHEDULED -> PUBLISHING`;
- существующий `EditorialPost.scheduledAt`;
- Sharp image-processing с `fit: contain`;
- единый предварительный просмотр;
- три MAX target;
- `MAX_EDITORIAL_CHANNEL_3_ID`;
- persistent binding `editorial.max.binding.MAX_CHANNEL_3`;
- третий join-link `https://max.ru/join/iPKA4EFVMhPU9oJXqHDk7vRhD4Tl0BAswVkqfxW8iYA`.

## Prisma schema / migration

**Новой Prisma migration в этой promotion нет.**

Backend остаётся на `213e507` и продолжает использовать `pnpm exec prisma migrate deploy`. Ручное изменение production-схемы и ручной SQL запрещены.

## Production-гарантии

- backend остаётся `ab-afisha/backend:backend-release-213e507` и не пересоздаётся;
- frontend меняется только на `ab-afisha/frontend:frontend-release-8c13e9b`;
- bots остаются `ab-afisha/bots:bots-release-3a64511` и не пересоздаются;
- nginx не пересоздаётся;
- server-local блок `ai.ab-event.pro` сохраняется;
- PostgreSQL, Redis и uploads volumes сохраняются;
- Telegram IPv6 network сохраняется;
- MAX bindings и редакционный функционал сохраняются;
- `Compiled MAX parser runtime regression tests` остаётся обязательным CI-step.

## Deployment

Использовать только:

`infra/scripts/deploy-pinned-frontend.sh`

Скрипт должен:

1. прочитать точный frontend pin из production lock;
2. собрать frontend из commit `8c13e9bd57fce7205cd6ea55223812061bf38d4e` в detached worktree;
3. проверить `org.opencontainers.image.revision`;
4. выполнить frontend preflight;
5. переключить только frontend;
6. не пересоздавать backend, bots и nginx;
7. проверить публичный HTTP;
8. при ошибке автоматически откатить frontend на предыдущий образ.

## Проверка после deployment

Обязательно проверить:

- `https://ab-event.pro/` → HTTP 200;
- frontend image = `ab-afisha/frontend:frontend-release-8c13e9b`;
- frontend revision = `8c13e9bd57fce7205cd6ea55223812061bf38d4e`;
- backend остаётся `ab-afisha/backend:backend-release-213e507`;
- bots остаются `ab-afisha/bots:bots-release-3a64511`;
- nginx не пересоздан;
- при открытии события на desktop, tablet и mobile картинка видимо увеличивается из исходной карточки к modal image-stage;
- opening использует card artwork в исходной точке и не подменяет её modal crop до начала движения;
- последний кадр image-flight совпадает с фактическими `x/y/width/height` конечной картинки модального окна;
- после достижения finalImageRect геометрия clone остаётся неподвижной, а смена на real modal image выполняется плавным `90 ms` opacity-handoff без изменения размера или координат;
- при закрытии события reverse image-flight к исходной карточке сохраняется;
- на mobile hero отображается утверждённый artwork с календарём, книгами и вазой;
- верх artwork не образует прямую видимую границу: изображение плавно переходит в белую hero-поверхность, а текст и CTA остаются поверх;
- при касании/клике hero, календаря и quote-area не появляется дополнительная тень или квадратные артефакты скругления;
- footer logo/brand находится на утверждённой левой вертикали;
- блокнот/растение находятся выше предыдущего положения и немного правее, при этом сохраняют утверждённый размер и не перекрывают критически строку контактов;
- для экранов до 350 px сохраняется безопасная отдельная геометрия блокнота;
- иконка телефона визуально соответствует масштабу соседних contact icons;
- тень quote-band темнее предыдущей и симметрична;
- изображения людей не уезжают за левый/правый край mobile viewport;
- направление/точка карусели переключается визуально примерно в 2 раза быстрее;
- после возврата direction indicator в центр центральная точка не моргает в конце `560 ms` цикла;
- центральная точка возвращается без отдельного `::after` overlay;
- на Android свайп «Главных событий» работает как до promotion;
- на iPhone/iPad короткий горизонтальный swipe уверенно переключает карточку без ghost-card regression;
- desktop carousel сохраняет 2× визуальное ускорение, прочая desktop geometry не меняется.

## Обязательное правило

Перед любыми изменениями, сборкой, откатом или deployment прочитать:

1. `PRODUCTION_RELEASE.md`;
2. `infra/deploy/production-frontend.env`;
3. `AGENTS.md`;
4. `CLAUDE.md`.

Нельзя определять production по `main`, `latest`, `APP_VERSION`, rollback-образу или последнему Docker image. Разрешены только component commits/images из production lock.

## Запрещено для текущего релиза

- использовать `latest` для backend/frontend/bots;
- backend release кроме `backend-release-213e507`;
- frontend release кроме `frontend-release-8c13e9b`;
- bots release кроме `bots-release-3a64511`;
- пересоздавать backend, bots или nginx;
- терять server-local `ai.ab-event.pro`;
- менять production-таблицы вручную;
- использовать backend-only или backend+frontend deployment для этой frontend-only promotion.

## Новая версия в будущем

Новая версия становится production только после явного утверждения владельцем проекта и согласованного обновления:

- `infra/deploy/production-frontend.env`;
- `PRODUCTION_RELEASE.md`;
- `docker-compose.production.v2.yml`;
- `AGENTS.md`;
- `CLAUDE.md`;
- `apps/frontend/test/production-release-lock.test.mjs`.
