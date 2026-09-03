# AB Partner Calendar v2 — правила работы Claude Code

## Критическая фиксация production — читать первой

Перед любыми изменениями, сборкой, откатом или deployment обязательно прочитать:

- `PRODUCTION_RELEASE.md`;
- `infra/deploy/production-frontend.env`.

Единственная утверждённая production-конфигурация:

- release anchor/backend commit: `213e5076fc274254abf9a56612bd086df2155ce5`;
- backend image: `ab-afisha/backend:backend-release-213e507`;
- frontend commit: `639e0cc7dbc2c4bd4945602711cbc5d81efe2b73`;
- frontend image: `ab-afisha/frontend:frontend-release-639e0cc`;
- bots commit/image: `3a64511c98f7bf8cd59776dd5dce233939cd2988` / `ab-afisha/bots:bots-release-3a64511`;
- production Compose: `/srv/ab-afisha/docker-compose.production.v2.yml`;
- backend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend.sh`;
- backend + frontend deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-frontend.sh`;
- backend + bots deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-backend-bots.sh`;
- frontend-only deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`.

Текущая promotion — **frontend-only**. Application commit `639e0cc` включает PR #151 / CI #907 и PR #152 / CI #909. Контракт текущей promotion:

- мобильный hero использует утверждённый Figma artwork `hero-mobile-figma-20260903.webp`;
- touch/hover/focus состояния hero, календаря и quote-area больше не создают лишнюю тень и квадратные артефакты на скруглениях;
- footer brand/logo оптически сдвинут влево к вертикали описания;
- блокнот/растение увеличены, но остаются внутри правой границы viewport;
- телефон в «Контакты» увеличен оптически;
- quote-band имеет более тёмную тень, а изображения людей закреплены по реальным левому/правому краям мобильного viewport;
- карусель «Главные события» визуально движется в 2 раза быстрее: `520 -> 260 ms`, двухшаговое движение `780 -> 390 ms`;
- direction indicator визуально возвращается в центр через `280 ms`;
- PR #152 сохраняет iOS drag workaround: CSS больше не блокирует `--card-motion-duration` через `!important`, поэтому native Touch Events path может временно использовать `90 ms` и затем восстановить `260 ms`;
- backend, bots, nginx, volumes и server-local конфигурация не меняются.

Сохраняется PR #148 / CI #898: белая quote-band находится поверх нижней части изображений ног, зона выше остаётся серой `#f1f1f1`, «Контакты» выровнены с «Наши проекты», а notebook crop не показывает лишний фрагмент чашки.

Сохраняется PR #146 / CI #894: iOS/iPadOS swipe «Главных событий» использует native Touch Events на всей gallery-зоне, axis lock `7 px`, swipe threshold `28 px`, horizontal `touchmove` с `passive: false`/`preventDefault()` только после direction lock, подавление случайного card click и существующий ArrowLeft/ArrowRight carousel path. Android Pointer Events path сохраняется.

Текущий контракт deployment:

- backend `213e507` сохраняется и не пересоздаётся;
- frontend меняется только на `frontend-release-639e0cc`;
- bots `3a64511`, nginx, volumes и server-local `ai.ab-event.pro` сохраняются;
- deployment только через `deploy-pinned-frontend.sh`;
- Prisma schema/migrations не меняются.

Сохраняется PR #142 / CI #887: compact-карусель «Главные события» остаётся без `rotateY` и `rotateZ`, при этом существующие translate/scale/opacity/brightness/blur/z-index и эффект глубины сохраняются.

Сохраняются PR #138 / CI #873 и PR #140 / CI #879 по мобильному футеру: блокнот остаётся у правой границы, лишний фрагмент чашки справа не показывается, нижние мятные листья видимы, desktop footer не меняется.

Сохраняется MAX source-preview контракт из PR #133 / CI #865. Production runtime подтвердил, что source channel MAX приватный (`type=channel`, `is_public=false`) и точный `GET /messages/{mid}` не возвращает `message.url`, поэтому join URL с `?mid=` не является прямым permalink отдельного поста. Backend предоставляет защищённый `GET /events/admin/:id/source-preview`; frontend показывает блок «Исходный пост MAX»; для приватного канала действие называется «Открыть канал MAX»; repair-сервис проверяет `is_public`, кэширует visibility на 6 часов и не выполняет бессмысленные batch message-link запросы.

Сохраняется canonical-city publication flow из PR #125 / CI #847: формы создания и редактирования `OFFLINE`/`HYBRID` событий используют активный справочник и сохраняют согласованные `cityId + cityName`; readiness совпадает с реальным backend publication guard; legacy `cityName` без `cityId` автоматически связывается только при единственном активном case-insensitive exact match. Fuzzy/contains и неоднозначная автопривязка запрещены. Сохраняются редакционный кабинет `/admin/editorial`, третий независимый MAX target `MAX_CHANNEL_3`, контракт карусели «Главные события» и все предыдущие production-гарантии.

Новой Prisma migration в этой promotion нет; ручной SQL запрещён.

Для backend обязателен CI-step `Compiled MAX parser runtime regression tests`, который проверяет `Экспофорум, Санкт-Петербург -> venue=Экспофорум, city=Санкт-Петербург` и блокировку не-городских значений.

Production components закрепляются независимо. Запрещено считать `main`, `latest`, `APP_VERSION`, старый release-тег или rollback-образ текущей production-версией. Новая версия становится production только после отдельного явного утверждения владельцем проекта и одновременного обновления production lock-файлов.

## Роль Claude Code

Ты работаешь как аккуратный senior fullstack-разработчик проекта календаря бухгалтерских событий.

Главная цель: безопасно развивать проект, не ломая будущий функционал, дизайн, данные, админку, интеграции и бизнес-логику.

## Главные принципы

1. Не менять бизнес-логику без явного указания.
2. Не менять дизайн произвольно.
3. Если есть макет, скриншот или фирменные цвета — строго следовать им.
4. Не удалять существующий функционал без отдельного подтверждения.
5. Не переписывать большие части проекта без необходимости.
6. Перед изменениями изучать связанные файлы и зависимости.
7. После изменений проверять типы, lint и build, если команды доступны.
8. Всегда показывать список изменённых файлов и объяснение изменений.

## Архитектурная цель проекта

Проект должен быть гибким и расширяемым. В будущем без поломок должны меняться:

- тексты;
- визуал;
- блоки интерфейса;
- события;
- фильтры;
- категории;
- роли пользователей;
- Telegram-интеграции;
- AI-парсинг;
- админка;
- API;
- база данных;
- логика импорта и синхронизации.

Не хардкодить данные, которые должны управляться из конфигурации, БД, админки или CMS-подобного слоя.

## Backend

Перед изменениями backend:

- проверить Prisma schema;
- проверить DTO/API-контракты;
- проверить миграции;
- не использовать raw SQL без необходимости;
- если raw SQL нужен — объяснить причину;
- не создавать отдельные подключения к БД, если уже есть общий сервис;
- не логировать секреты, токены, cookies и персональные данные.

## Frontend

Перед изменениями frontend:

- не менять дизайн без задачи;
- сохранять текущие классы, layout и UX, если задача не требует обратного;
- nullable-поля обрабатывать безопасно;
- не показывать mock-данные в production/admin при ошибке API;
- показывать понятное сообщение об ошибке вместо фиктивных данных;
- не ломать адаптивность.

## Telegram

- все внешние и пользовательские строки экранировать;
- title, location, description, sourceUrl и другие текстовые поля нельзя вставлять в HTML без escape;
- не менять тексты рассылки и напоминаний без отдельного указания.

## AI-парсер

- имя AI-модели не хардкодить жёстко;
- использовать env-переменную для модели;
- fallback должен быть безопасным;
- при ошибке AI-парсинга возвращать null и логировать ошибку без падения синхронизации.

## Git workflow

Перед коммитом:

1. Выполнить git status.
2. Проверить git diff.
3. Не коммитить build-кэш, tsbuildinfo, временные файлы, patch-файлы.
4. Запустить доступные проверки: lint, typecheck, build.
5. Коммит должен быть маленьким и понятным.

Формат коммитов: `fix: ...`, `feat: ...`, `chore: ...`, `refactor: ...`, `docs: ...`.

## Запрещено без отдельного подтверждения

- менять схему БД и миграции;
- удалять файлы;
- массово форматировать проект;
- менять package manager;
- менять структуру API;
- менять дизайн-систему;
- менять env-переменные;
- пушить напрямую в main;
- делать force push;
- коммитить секреты, `.env`, patch-файлы или `tsbuildinfo`.
