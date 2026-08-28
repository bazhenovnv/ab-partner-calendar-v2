# АБ Афиша — закреплённая production-версия

Этот файл — **единственный источник истины (SSOT)** для production-версии приложения.

## Закреплённый релиз

- Домен: `https://ab-event.pro`
- Release anchor commit: `8aeecd1140812f6c92941146cdd4fba671ae8c93`
- Backend commit: `8aeecd1140812f6c92941146cdd4fba671ae8c93`
- Backend image: `ab-afisha/backend:backend-release-8aeecd1`
- Bots commit: `3a64511c98f7bf8cd59776dd5dce233939cd2988`
- Bots image: `ab-afisha/bots:bots-release-3a64511`
- Frontend commit: `3b70ea58e9284e8e590eb7bf08a0c394000ebcd2`
- Frontend image: `ab-afisha/frontend:frontend-release-3b70ea5`
- Дата утверждения: `2026-08-27`
- Серверный корень: `/srv/ab-afisha`
- Production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`
- Backend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend.sh`
- Backend + frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`
- Backend + bots deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-bots.sh`
- Frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`

Машиночитаемая фиксация находится в `infra/deploy/production-frontend.env`. Историческое имя lock-файла сохранено для совместимости. Компоненты production закрепляются **независимо**.

## Что входит в этот релиз

Backend pin `8aeecd1` включает предыдущую canonical-city защиту и исправляет runtime-дефект venue-first MAX location parsing, найденный отдельным read-only production QA на предыдущем backend `4121d00`.

Сохраняются предыдущие гарантии:

- MAX parser использует общий shared location parser перед автопубликацией `OFFLINE/HYBRID` событий;
- значения формата, улицы, дома и площадки не считаются физическим городом только потому, что поле непустое;
- `Очно`, `офлайн + онлайн`, `ст1`, адресные фрагменты и venue-only значения без распознаваемого города дают `city=null` и причину `Город очного участия не определён или требует проверки`;
- такие MAX-события переходят в `NEEDS_ATTENTION` вместо автоматического `PUBLISHED`;
- ручная публикация `OFFLINE/HYBRID` через `/publish` требует активную каноническую связь `cityId -> City`;
- ручной перевод статуса через `/status` в `PUBLISHED` проходит ту же canonical-city проверку;
- при ручной публикации `cityName` выравнивается по имени связанного активного `City`;
- создание и переименование записей справочника `City` отвергает очевидные значения формата, адреса и площадки;
- схема `Формат: Очно` + отдельная строка `Где: Москва` даёт `format=OFFLINE`, `city=Москва` без ложного `NEEDS_ATTENTION`;
- hybrid syntax распознаётся в обоих порядках: `онлайн + офлайн` и `офлайн + онлайн`.

Runtime QA предыдущего backend `4121d00` обнаружил, что строка `Где: Экспофорум, Санкт-Петербург` давала корректный `city=Санкт-Петербург`, но ошибочный `venue=Санкт-Петербург`. Причина оказалась в использовании JavaScript `\b` для кириллического venue-prefix: стандартная word-boundary семантика `\b` не считает кириллицу ASCII `\w`, поэтому `Экспофорум\b` не распознавался как ожидаемый токен.

В `8aeecd1`:

- structured physical `Где:` разбирается детерминированно отдельным `applyPhysicalWhereValue`;
- venue-first `Экспофорум, Санкт-Петербург` даёт `venue=Экспофорум`, `city=Санкт-Петербург` и не дублирует город в поле площадки;
- venue-prefix использует кириллически-безопасное окончание токена вместо `\b`;
- тот же deterministic physical-location parser используется для hybrid location;
- legacy venue-first repair сохранён для старых/non-structured путей.

### Обязательный compiled MAX parser runtime regression

После обычного `pnpm build` CI обязан запускать:

`node --test apps/backend/test/max-parser-runtime.test.mjs`

Тест импортирует именно собранный `dist/modules/max-import/max-parser.service.js`, а не анализирует только исходный текст. Он проверяет:

- `Формат: Очно` + `Где: Москва`;
- `Формат: Очно` + `Где: Экспофорум, Санкт-Петербург` с точным `venue=Экспофорум`, `city=Санкт-Петербург` и `venue != city`;
- блокировку `ст1`, `Очно`, venue-only `Экспофорум`;
- hybrid без физического места остаётся в attention.

Application PR #100 прошёл полный CI #777, включая этот compiled MAX parser runtime step.

Frontend остаётся на `3b70ea5`: публичный city filter уже использует канонические города и общий location parser. Bots остаются на `3a64511`: reminder/legal-gate поведение не меняется.

Исторические production-данные были ранее отдельно нормализованы операционной транзакцией с резервной копией и проверкой `COMMIT`:

- `Москва` — активный канонический `City`, 6 связанных событий;
- `Санкт-Петербург` — активный канонический `City`, 2 связанных события;
- `Зеленоградск` — активный канонический `City`, 1 связанное событие;
- старые `4-й Лесной пер.`, `Очно в Москве / онлайн-трансляция`, `ст1` деактивированы и имеют 0 связей;
- в публичном фильтре остаются чистые `Зеленоградск`, `Москва`, `Санкт-Петербург` с `filterValues=[name]`;
- три старых опубликованных `OFFLINE/HYBRID` события остаются с `cityId=null`, потому что их город нельзя достоверно определить из имеющихся данных. Этот release не угадывает и не изменяет их автоматически.

Новых Prisma migrations и автоматической массовой мутации production-данных в этом релизе нет.

## Deployment этого релиза

Использовать только `infra/scripts/deploy-pinned-backend.sh`.

Скрипт:

- читает component pins из release lock;
- не двигает root Git HEAD;
- строит только backend из detached worktree точного commit `8aeecd1`;
- проверяет OCI revision label и наличие compiled canonical-city guards в image;
- фиксирует текущие backend/frontend/bots/nginx container IDs и images, nginx config SHA и полный local Git status;
- переключает только backend через `--no-deps --force-recreate backend`;
- не пересоздаёт frontend, bots или nginx;
- после замены backend выполняет `nginx -t` и `nginx -s reload` **в том же nginx-container**, чтобы nginx заново разрешил Docker DNS-имя `backend` и не сохранил IP старого контейнера;
- reload nginx не меняет его container ID, image или конфигурационный файл;
- проверяет health и public HTTP;
- проверяет Telegram `getMe` из нового backend по IPv6 до 6 попыток с backoff;
- проверяет публичный city filter и активные City rows через общий classifier;
- выводит число исторических опубликованных `OFFLINE/HYBRID` с `cityId=null` только как диагностический legacy-counter;
- проверяет, что frontend, bots, nginx-container, nginx image/config и local Git status остались неизменными;
- при ошибке автоматически откатывает только backend на ранее запущенный image и после восстановления backend повторно выполняет `nginx -t` + `nginx -s reload`.

После deployment обязателен отдельный read-only runtime QA parser/publication guard без создания и изменения событий. Только после успешных `QA_DATABASE_UNCHANGED=true`, `READ_ONLY_PRODUCTION_QA_OK=true` и `PRODUCTION_CITY_LIFECYCLE_QA_OK=true` проблема жизненного цикла города считается полностью закрытой.

Ожидаемый финальный marker deployment:

`PRODUCTION_BACKEND_PIN_OK=true`

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
- деплоить любой `frontend-release-*`, кроме `frontend-release-3b70ea5`;
- использовать rollback/preflight/temporary images как production;
- определять production-версию по последнему commit в `main`;
- менять component pins без отдельного утверждения владельцем проекта;
- пересоздавать или останавливать frontend, bots или nginx при deployment этого backend-only release; разрешён только контролируемый `nginx -s reload` внутри существующего nginx-container после проверки `nginx -t`;
- изменять локальный production-конфиг `infra/nginx/conf.d/production.v2.conf`;
- использовать для этого релиза старый `deploy-pinned-app.sh`;
- использовать для этого backend-only релиза `deploy-pinned-backend-frontend.sh` или `deploy-pinned-backend-bots.sh`, потому что они пересоздают компоненты, которые в этом release не меняются.

## Как утвердить новую версию в будущем

Новая версия считается production только после отдельного явного подтверждения владельца проекта и одновременного обновления:

- `infra/deploy/production-frontend.env`;
- `PRODUCTION_RELEASE.md`;
- `docker-compose.production.v2.yml`;
- `AGENTS.md`;
- `CLAUDE.md`;
- `apps/frontend/test/production-release-lock.test.mjs`.

Для backend-only релиза использовать `infra/scripts/deploy-pinned-backend.sh`. Для backend+frontend использовать `infra/scripts/deploy-pinned-backend-frontend.sh`. Для backend+bots использовать `infra/scripts/deploy-pinned-backend-bots.sh`. Frontend-only обновляется через `infra/scripts/deploy-pinned-frontend.sh`.
