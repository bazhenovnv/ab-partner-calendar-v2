# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Release anchor commit: `8aeecd1140812f6c92941146cdd4fba671ae8c93`
- Backend commit/image: `8aeecd1140812f6c92941146cdd4fba671ae8c93` / `ab-afisha/backend:backend-release-8aeecd1`
- Bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`
- Frontend commit/image: `b65e7aa5d3fff87cdca783eecc4c7b2280cc45b4` / `ab-afisha/frontend:frontend-release-b65e7aa`
- Дата утверждения: `2026-08-28`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Production-компоненты закрепляются независимо.

## Текущая frontend-only promotion

Frontend обновлён до `b65e7aa`; backend остаётся на `8aeecd1`, bots остаются на `3a64511`, nginx не пересоздаётся.

Frontend `b65e7aa` включает mobile layout 390 px из PR #106, исправления PR #108 и визуальную доводку PR #110:

- header-кнопки Telegram / MAX / «Стать партнёром» удерживают иконки и подписи внутри своих белых контейнеров;
- существующий hero artwork показывается без mobile crop, с мягким переходом из белой части;
- пробел между `роста,` и `обмена` сохранён после скрытия desktop `<br>`;
- «Главные события» листаются стрелками, клавиатурой и свайпом пальцем вправо/влево; touch/pen pointer capture усилен, при этом вертикальный scroll страницы сохранён;
- существующий `notebook-stationery.png` не изменяется: на mobile блокнот/растение и кружка выводятся как два независимо позиционируемых CSS-clipped представления одного asset;
- desktop stationery остаётся цельным;
- изображения не генерируются и bitmap assets не заменяются.

Application PR #110 прошёл полный CI #805 перед merge. Promotion обязана пройти полный release-control CI перед deployment.

## Сохраняемые backend-гарантии

Backend pin `8aeecd1` сохраняет canonical-city защиту и venue-first MAX location parsing. CI продолжает запускать compiled MAX parser runtime regression и проверять `Экспофорум, Санкт-Петербург`, canonical city и hybrid cases. Frontend-only promotion не изменяет backend, bots, Prisma migrations, API-контракты или production-данные.

## Deployment

Использовать только `infra/scripts/deploy-pinned-frontend.sh`.

Скрипт читает точный frontend pin, собирает detached worktree при необходимости, проверяет OCI revision, запускает preflight, переключает только frontend через `--no-deps --force-recreate frontend`, проверяет публичный HTTP и подтверждает неизменность backend, bots и nginx. При ошибке откатывается только frontend.

Ожидаемый финальный marker: `PRODUCTION_PIN_OK`.

После deployment проверить mobile 390 px: header, hero, свайп «Главных событий», footer artwork, collapsed filter, календарь, карточки событий, цитаты, а также длинные месяцы `августа` и `сентября`.

## Обязательное правило

Перед любыми изменениями, сборкой, откатом или deployment прочитать:

1. `PRODUCTION_RELEASE.md`;
2. `infra/deploy/production-frontend.env`;
3. `AGENTS.md`;
4. `CLAUDE.md`.

Нельзя определять production по `main`, `latest`, `APP_VERSION`, rollback-образу или последнему Docker image. Разрешено использовать только component commits/images из production lock.

## Запрещено для текущего релиза

- `latest` для backend, bots или frontend;
- любой backend release кроме `backend-release-8aeecd1`;
- любой bots release кроме `bots-release-3a64511`;
- любой frontend release кроме `frontend-release-b65e7aa`;
- пересоздание backend, bots или nginx при frontend-only deployment;
- изменение `infra/nginx/conf.d/production.v2.conf`;
- использование `deploy-pinned-app.sh`, `deploy-pinned-backend.sh`, `deploy-pinned-backend-frontend.sh` или `deploy-pinned-backend-bots.sh` для этой promotion.

## Новая версия в будущем

Новая версия становится production только после явного утверждения владельца проекта и согласованного обновления:

- `infra/deploy/production-frontend.env`;
- `PRODUCTION_RELEASE.md`;
- `docker-compose.production.v2.yml`;
- `AGENTS.md`;
- `CLAUDE.md`;
- `apps/frontend/test/production-release-lock.test.mjs`.
