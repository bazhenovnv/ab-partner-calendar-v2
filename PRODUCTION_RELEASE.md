# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Release anchor commit: `8aeecd1140812f6c92941146cdd4fba671ae8c93`
- Backend commit: `8aeecd1140812f6c92941146cdd4fba671ae8c93`
- Backend image: `ab-afisha/backend:backend-release-8aeecd1`
- Bots commit: `3a64511c98f7bf8cd59776dd5dce233939cd2988`
- Bots image: `ab-afisha/bots:bots-release-3a64511`
- Frontend commit: `b0e71314ec162149d2b5d63b43d0906bec6b09cd`
- Frontend image: `ab-afisha/frontend:frontend-release-b0e7131`
- Дата утверждения: `2026-08-28`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Backend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend.sh`
- Backend + frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`
- Backend + bots deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-bots.sh`
- Frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Историческое имя lock-файла сохранено для совместимости. Компоненты production закрепляются **независимо**.

## Что входит в текущую promotion

Текущая promotion является **frontend-only**. Frontend обновлён до `b0e7131`; backend остаётся на `8aeecd1`, bots остаются на `3a64511`.

Frontend `b0e7131` включает ранее утверждённое исправление плашки даты для длинных русских названий месяцев и финальное выравнивание публичной mobile-страницы под утверждённый макет 390 px из PR #106:

- добавлен изолированный финальный mobile-слой `mobile-390-final.css`, подключённый после существующего визуального стека;
- восстановлен утверждённый mobile hero artwork и двухрядная композиция header;
- фильтр на mobile стал collapsed-by-default disclosure без изменения опций фильтра и API-потока;
- фильтр, календарь и карточки событий разделены на сером mobile canvas, геометрия календаря уплотнена;
- сохранена утверждённая геометрия плашки даты для длинных русских названий месяцев;
- восстановлены утверждённые mobile-иллюстрации блока цитат и footer stationery;
- desktop Figma geometry, backend, bots, API-контракты и данные не меняются;
- добавлен source regression test для контракта 390 px.

Application PR #106 прошёл полный CI #797 перед merge. Promotion должна пройти полный CI release-control до deployment.

## Сохраняемые backend-гарантии

Backend pin `8aeecd1` сохраняет canonical-city защиту и исправление venue-first MAX location parsing.

В частности:

- MAX parser использует общий shared location parser перед автопубликацией `OFFLINE/HYBRID` событий;
- значения формата, улицы, дома и площадки не считаются физическим городом только потому, что поле непустое;
- `Очно`, `офлайн + онлайн`, `ст1`, адресные фрагменты и venue-only значения без распознаваемого города дают `city=null` и требуют проверки;
- ручная публикация `OFFLINE/HYBRID` требует активную каноническую связь `cityId -> City`;
- structured `Формат: Очно` + `Где: Москва` даёт `format=OFFLINE`, `city=Москва`;
- `Где: Экспофорум, Санкт-Петербург` даёт `venue=Экспофорум`, `city=Санкт-Петербург`, без дублирования города в venue;
- hybrid syntax распознаётся в обоих порядках: `онлайн + офлайн` и `офлайн + онлайн`.

### Обязательный compiled MAX parser runtime regression

CI продолжает запускать compiled MAX parser runtime regression:

`node --test apps/backend/test/max-parser-runtime.test.mjs`

Тест импортирует собранный `dist/modules/max-import/max-parser.service.js` и проверяет, среди прочего, `Экспофорум, Санкт-Петербург -> venue=Экспофорум, city=Санкт-Петербург`, блокировку не-городских значений и hybrid без физического места.

Frontend-only promotion не изменяет backend, bots, Prisma migrations или production-данные.

## Deployment текущего релиза

Использовать только `infra/scripts/deploy-pinned-frontend.sh`.

Скрипт:

- читает `PRODUCTION_FRONTEND_COMMIT`, `PRODUCTION_FRONTEND_TAG` и `PRODUCTION_FRONTEND_IMAGE` из production lock;
- не определяет production по `main` или `latest`;
- не двигает root Git HEAD;
- получает точный pinned frontend commit и при отсутствии образа строит его из detached worktree;
- проверяет OCI revision label образа против `PRODUCTION_FRONTEND_COMMIT`;
- запускает preflight нового frontend image;
- фиксирует текущие frontend/backend/bots/nginx container IDs/images, nginx config SHA и local Git status;
- переключает только frontend через `--no-deps --force-recreate frontend`;
- проверяет внутренний frontend HTTP и публичный `https://ab-event.pro`;
- проверяет, что backend, bots, nginx и локальный production-конфиг не изменились;
- при ошибке автоматически откатывает только frontend на предыдущий image.

Ожидаемый финальный marker deployment:

`PRODUCTION_PIN_OK`

После deployment обязательно визуально проверить desktop и mobile, особенно ширину 390 px: header, hero, collapsed filter, календарь, карточки событий, блок цитат и footer. Дополнительно проверить карточки событий с коротким и длинным названием месяца, в частности `августа` и `сентября`.

## Обязательное правило для новых чатов и AI-агентов

Перед любыми изменениями, сборкой, откатом или deployment сначала прочитать:

1. `PRODUCTION_RELEASE.md`;
2. `infra/deploy/production-frontend.env`;
3. `AGENTS.md`;
4. `CLAUDE.md`.

Нельзя считать `main`, `latest`, `APP_VERSION`, старый Docker-тег, rollback-образ или ранее собранный image утверждённой production-версией.

Разрешено использовать только component commits и Docker images, указанные в `infra/deploy/production-frontend.env`.

## Запрещено

- деплоить backend, bots или frontend с тегом `latest`;
- выбирать backend или bots через общий `APP_VERSION`;
- деплоить любой `backend-release-*`, кроме `backend-release-8aeecd1`;
- деплоить любой `bots-release-*`, кроме `bots-release-3a64511`;
- деплоить любой `frontend-release-*`, кроме `frontend-release-b0e7131`;
- использовать rollback/preflight/temporary images как production;
- определять production-версию по последнему commit в `main`;
- менять component pins без отдельного утверждения владельцем проекта;
- пересоздавать backend, bots или nginx при текущем frontend-only deployment;
- изменять локальный production-конфиг `infra/nginx/conf.d/production.v2.conf`;
- использовать для текущего релиза старый `deploy-pinned-app.sh`;
- использовать для текущей frontend-only promotion `deploy-pinned-backend.sh`, `deploy-pinned-backend-frontend.sh` или `deploy-pinned-backend-bots.sh`.

## Как утвердить новую версию в будущем

Новая версия считается production только после отдельного явного подтверждения владельца проекта и одновременного обновления:

- `infra/deploy/production-frontend.env`;
- `PRODUCTION_RELEASE.md`;
- `docker-compose.production.v2.yml`;
- `AGENTS.md`;
- `CLAUDE.md`;
- `apps/frontend/test/production-release-lock.test.mjs`.

Для backend-only релиза использовать `infra/scripts/deploy-pinned-backend.sh`. Для backend+frontend использовать `infra/scripts/deploy-pinned-backend-frontend.sh`. Для backend+bots использовать `infra/scripts/deploy-pinned-backend-bots.sh`. Frontend-only обновляется через `infra/scripts/deploy-pinned-frontend.sh`.
