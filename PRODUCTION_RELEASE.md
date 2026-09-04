# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Release anchor / backend commit: `213e5076fc274254abf9a56612bd086df2155ce5`
- Backend image: `ab-afisha/backend:backend-release-213e507`
- Frontend commit: `df7dd97b248f8eec391227c2e5bf8c8e6dc40817`
- Frontend image: `ab-afisha/frontend:frontend-release-df7dd97`
- Bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`
- Дата утверждения: `2026-09-04`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Production-компоненты закрепляются независимо: release anchor остаётся на backend `213e507`, а frontend продвигается отдельно до `df7dd97`.

## Текущая promotion — структурный текст модального окна без дублей

Текущая promotion меняет **только frontend** до application merge commit `df7dd97b248f8eec391227c2e5bf8c8e6dc40817`.

Application PR #166 / CI #956 исправляет загрузку и очистку текста события в общем modal path для desktop, tablet и mobile:

- карточка может открыть modal на preview-данных, после чего `EventModalProvider` получает полное событие через `GET /api/events/public/:id` с `cache: no-store`;
- short/full description проходят через единый `cleanEventModalDescription`, поэтому логика одинакова на desktop и mobile;
- служебный location-tail `Где:` распознаётся как structured metadata и не должен дублироваться в основном body;
- narrative schedule-фрагменты вида `Мероприятие пройдет ...` удаляются только при наличии подтверждённого structured signal текущего события — даты/endDate, времени, города, адреса, площадки или формата;
- inline-tail `Где:`, `Дата:`, `Место:`, `Адрес:` удаляется консервативно только если хвост подтверждается реальными structured fields события;
- числовые даты вида `09.09` корректно распознаются внутри schedule-предложения;
- обычная редакционная проза, включая слова вроде `формат`, не обрезается без structured-match;
- существующая очистка speaker/registration/messenger metadata сохраняется;
- backend, bots, nginx, данные, Prisma schema и migrations не меняются.

Regression-case PR #166 фиксирует конкретный сценарий:

`Мероприятие пройдет в два этапа: 9 сентября — онлайн-марафон регионов, 11 сентября — Всероссийская конференция в Москве. Где: Москва, Космодамианская наб., 52/7`

Этот schedule/location tail больше не должен отображаться внутри основного текста модального окна; дата/место остаются в предназначенных для них структурных плашках/строках.

Сохраняется application PR #164 / CI #948 с текущим opening/closing image-flight. Эта promotion **не меняет анимацию открытия/закрытия** и не считается исправлением отложенного визуального скачка:

- opening начинается точной картинкой карточки (`originImageElement`) и сохраняет её `src/currentSrc`, `object-fit` и `object-position`;
- стартовая геометрия берётся из `sourceRect`, конечная — из `finalImageRect = modalImage.getBoundingClientRect()` после рендера modal;
- opening image duration = closing image duration: `500 ms`;
- opening easing `cubic-bezier(0, 0.55, 0.45, 1)` зеркален closing easing `cubic-bezier(0.55, 0, 1, 0.45)`;
- flight содержит `fromRect -> toRect` без дополнительного геометрического overshoot;
- real modal image скрыта на время opening-flight; clone в конечной точке растворяется через opacity-handoff;
- при desktop 1920 текущая максимальная геометрия: modal `1496×788`, image `647×647`; при mobile 390: modal `348×684`, image `309×309`;
- reverse image-flight при закрытии сохраняется;
- общий transition path работает для desktop, tablet и mobile.

Сохраняется application PR #162 / CI #935, который вернул видимый opening image-flight и закрепил его конечную геометрию по фактической modal image.

Сохраняется application PR #160 / CI #929: opening-flight должен завершаться в фактической конечной геометрии modal image без дополнительного увеличения `x/y/width/height`.

Сохраняется application PR #158 / CI #925 с устранением короткого мерцания центральной точки после ускоренного возврата direction indicator:

- визуальный возврат в центр происходит через `280 ms` внутри существующего `560 ms` indicator cycle;
- временный `::after` overlay удалён;
- после `280 ms` тёмной становится сама реальная центральная точка `button:nth-child(2)`;
- к моменту финального React state reset на `560 ms` центральная точка уже имеет нужный тёмный цвет;
- скорость карусели и iOS swipe workaround не меняются.

Сохраняется application PR #156 / CI #919 с финальной корректировкой mobile footer notebook:

- размер блокнота/растения сохраняется `146×206`;
- стандартная mobile-композиция поднята выше через `top: -8px`;
- production anchor `right: -6px` сохранён, дополнительный визуальный сдвиг вправо выполняется через `translateX(4px)`;
- для экранов до 350 px используется `top: -4px`, `right: -3px`, `translateX(3px)`, `scale(0.94)`;
- independent cup artwork не меняется;
- regression-test проверяет standard/narrow declaration blocks отдельно;
- desktop footer, hero, backend, bots и nginx не меняются.

Сохраняется application PR #154 / CI #913:

- верхняя граница mobile Figma artwork плавно растворяется в белой поверхности hero через CSS `mask-image` / `-webkit-mask-image`;
- заголовок, описание и CTA остаются отдельным верхним слоем;
- mobile hero сохраняет artwork `hero-mobile-figma-20260903.webp`;
- для экранов до 350 px сохраняется отдельная безопасная геометрия;
- desktop footer, desktop hero, backend, bots и nginx не меняются.

Сохраняется application PR #151 / CI #907:

- мобильный hero использует утверждённый Figma artwork `hero-mobile-figma-20260903.webp`;
- исходная desktop-композиция hero сохраняется и на mobile не рендерится;
- у hero, календаря и quote-area на touch-устройствах убраны переходы состояний, создававшие вторую тень и артефакты скруглённых углов;
- footer brand/logo оптически сдвинут влево;
- блокнот/растение закреплены у правой границы;
- иконка телефона в «Контакты» увеличена оптически;
- тень белой quote-band сделана темнее;
- изображения людей закреплены по левому/правому краям mobile viewport;
- direction indicator карусели визуально возвращается в центр через `280 ms`.

Сохраняется application PR #152 / CI #909:

- stylesheet не задаёт `--card-motion-duration: 260ms !important`;
- обычный шаг карусели нормализован `520 -> 260 ms`;
- двухшаговое движение `780 -> 390 ms`;
- iOS Touch Events bridge может временно ставить `90 ms` во время drag и затем восстанавливать `260 ms`.

## Сохраняемая mobile quote-band

Сохраняется PR #148 / CI #898:

- зона с изображениями ног выше quote-band остаётся серой `#f1f1f1`;
- белая quote-band накрывает нижнюю часть изображений ног;
- quote-band имеет `height: 114px`, `bottom: 8px`, `z-index: 2`;
- изображения людей имеют `z-index: 1`, мятная рамка/цитата `z-index: 3`;
- колонка «Контакты» выровнена с «Наши проекты»;
- footer/header brand title сохраняют утверждённую оптическую геометрию.

## Сохраняемый iOS swipe

Сохраняется PR #146 / CI #894:

- Android, мышь и pen продолжают использовать Pointer Events path;
- iOS/iPadOS получает native Touch Events path на всю gallery-зону;
- direction lock = `7 px`;
- horizontal `touchmove` использует `passive: false`/`preventDefault()` только после direction lock;
- iOS swipe threshold = `28 px`;
- после горизонтального swipe подавляется случайный click по карточке;
- переход выполняется через существующий ArrowLeft / ArrowRight path.

## Сохраняемое выравнивание compact-карусели «Главные события»

Сохраняется PR #142 / CI #887:

- боковые карточки в compact-режиме (`max-width: 1023px`) не имеют `rotateY` и `rotateZ`;
- сохраняются `translateX`, `translateY`, `translateZ`, `scale`, `opacity`, `brightness`, `blur` и `z-index`;
- desktop-геометрия не меняется.

## Сохраняемый мобильный футер

Сохраняются PR #138 / CI #873, PR #140 / CI #879 и PR #144 / CI #891:

- блокнот расположен у правой границы мобильного viewport;
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
- редактор показывает блок `Исходный пост MAX`;
- для приватного канала используется действие `Открыть канал MAX`;
- если MAX реально вернёт `directPostUrl`, разрешено действие `Перейти к посту MAX`;
- source-link repair проверяет `is_public`, кэширует visibility на `6 часов` и не выполняет бессмысленные batch message-link запросы для приватного канала.

## Сохраняемый canonical-city publication flow

Сохраняется PR #125 / CI #847:

- формы создания и редактирования `OFFLINE`/`HYBRID` используют активный справочник городов;
- сохраняются согласованные `cityId + cityName`;
- readiness совпадает с backend publication guard;
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
- frontend меняется только на `ab-afisha/frontend:frontend-release-df7dd97`;
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
2. собрать frontend из commit `df7dd97b248f8eec391227c2e5bf8c8e6dc40817` в detached worktree;
3. проверить `org.opencontainers.image.revision`;
4. выполнить frontend preflight;
5. переключить только frontend;
6. не пересоздавать backend, bots и nginx;
7. проверить публичный HTTP;
8. при ошибке автоматически откатить frontend на предыдущий образ.

## Проверка после deployment

Обязательно проверить:

- `https://ab-event.pro/` → HTTP 200;
- frontend image = `ab-afisha/frontend:frontend-release-df7dd97`;
- frontend revision = `df7dd97b248f8eec391227c2e5bf8c8e6dc40817`;
- backend остаётся `ab-afisha/backend:backend-release-213e507`;
- bots остаются `ab-afisha/bots:bots-release-3a64511`;
- nginx не пересоздан;
- на desktop открыть событие с текстом, содержащим schedule/location metadata: эти данные не должны повторяться в body;
- на mobile открыть тот же тип события: результат очистки должен совпадать с desktop;
- `Где:`, `Дата:`, `Место:`, `Адрес:` не должны дублировать данные, уже выведенные в структурных плашках/строках;
- обычный редакционный текст со словами `формат`, `место` и т.п. не должен обрезаться без совпадения со structured fields;
- даты вида `09.09` внутри schedule-tail должны корректно очищаться при совпадении с событием;
- существующий opening/closing image-flight сохраняется без изменений этой promotion;
- на mobile hero отображается утверждённый artwork;
- footer logo/brand, notebook, phone icon, quote-band и изображения людей сохраняют утверждённую геометрию;
- direction indicator и iOS swipe сохраняют текущий контракт.

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
- frontend release кроме `frontend-release-df7dd97`;
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
