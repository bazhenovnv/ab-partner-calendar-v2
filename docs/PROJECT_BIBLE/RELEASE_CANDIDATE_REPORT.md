# Release Candidate Report — АБ Афиша v1.0

**Дата**: 2026-07-08  
**Ветка**: `claude/ab-afisha-architecture-plan-805f5o`  
**Аудитор**: Claude Code (Stage 38)  
**Статус**: **НЕ ГОТОВ К РЕЛИЗУ** — требуется закрыть 4 блокера

---

## 1. Что полностью готово

### Публичный сайт
- ✅ Главная страница: Hero, EventsSection, HowItWorks, RotatingQuotes, RemindersBlock, SiteFooter
- ✅ Страница мероприятия (`/events/[id]`): детали, кнопки действий, ICS-скачивание, скелетон-загрузка, not-found
- ✅ Фильтрация событий: по городу, направлению, формату, цене, дате
- ✅ Правовые документы (`/legal/[slug]`): Privacy Policy, User Agreement, Consent, Cookie Policy, Broadcast Consent
- ✅ Maintenance page: динамический контент из backend + fallback PNG
- ✅ Robots.txt, sitemap.xml (с динамическими событиями)
- ✅ Error boundary (`error.tsx`, `global-error.tsx`)
- ✅ Loading skeleton (root `loading.tsx`, events `loading.tsx`)
- ✅ SEO meta tags (og:image, twitter:card, canonical)
- ✅ Cookie Banner с согласием и интеграцией с legal docs
- ✅ Адаптивная вёрстка (mobile / tablet / desktop)
- ✅ Dark mode поддержка в компонентах

### Admin панель
- ✅ Аутентификация: JWT login, logout, 8h токен
- ✅ Dashboard: stats, needs-attention, upcoming events, recent broadcasts
- ✅ Events: список с фильтрами (status, city, direction, format, price, mainEvent), pagination, search
- ✅ Events: вкладка NEEDS_ATTENTION с badge-счётчиком
- ✅ Events: создание/редактирование формы с полным набором полей
- ✅ Events: публикация, архивирование, ручные статусы, версионирование
- ✅ Broadcasts: список, создание/редактирование, тест-отправка, schedule, pause/resume/cancel
- ✅ Broadcasts: вкладки Получатели и Логи с пагинацией и обработкой ошибок
- ✅ Legal docs: просмотр/редактирование по типу, publish, история версий
- ✅ Quotes: список, создание/редактирование, toggle, sort, delete
- ✅ Settings: SiteConfig key-value управление по группам
- ✅ Cities: полный CRUD + search + sort + pagination + toggle + soft-delete
- ✅ Directions: полный CRUD + search + sort + slug validation + toggle + soft-delete
- ✅ Sidebar: все разделы, включая "Справочники" с подменю

### Backend API
- ✅ Auth: login, profile, changePassword
- ✅ Events CRUD: создание, редактирование, публикация, архивирование, версионирование
- ✅ Events: public endpoint для сайта с фильтрацией
- ✅ Events: cron auto-status (PLANNED→LIVE→COMPLETED)
- ✅ Events: NEEDS_ATTENTION очередь
- ✅ Cities CRUD: `/admin/cities` с полной валидацией
- ✅ Directions CRUD: `/admin/directions` с slug-валидацией
- ✅ Broadcasts: CRUD, scheduling, test-send, pause/resume/cancel, recipients, logs
- ✅ BullMQ queue: broadcast processor с retry, cooldown, статистикой
- ✅ Bots: upsert, legal acceptance, phone save, reminders
- ✅ Reminders: создание, список, отмена, cron-рассылка за 30/15/5 мин
- ✅ Legal: CRUD по 5 типам документов, версионирование, публикация
- ✅ Quotes: public и admin endpoints
- ✅ Filters: public endpoint городов и направлений для фильтра
- ✅ SiteConfig: admin CRUD для конфигурации сайта
- ✅ Analytics: EventView, SiteVisit трекинг
- ✅ MAX Import: cron + ручной запуск, hashtag mapping
- ✅ Health endpoint: `/api/health`
- ✅ Swagger UI: `/api/docs` (только dev)
- ✅ Rate limiting: ThrottlerGuard (100 rps)
- ✅ Helmet: security headers
- ✅ JWT guard на всех admin endpoints

### Боты
- ✅ Telegram Bot: /start, /help, /unsubscribe, напоминания, legal consent, phone verification
- ✅ MAX Bot: /start, /unsubscribe, HTTP polling, напоминания, legal consent, phone verification
- ✅ Internal token authentication для bot→backend вызовов
- ✅ Error handler (`bot.catch`) для grammY

### Аналитика
- ✅ Яндекс.Метрика: SPA pageview hit при навигации
- ✅ Custom goals: event_view, event_register, ticket_buy, reminder_telegram, reminder_max, ics_download

### Инфраструктура
- ✅ docker-compose.yml: postgres, redis, backend, frontend, bots, nginx
- ✅ docker-compose.prod.yml: prod-конфиг с volume mounts
- ✅ Nginx reverse proxy: frontend (:3000), backend (:3001)
- ✅ PostgreSQL healthcheck
- ✅ Redis healthcheck
- ✅ Backend healthcheck
- ✅ env.example для root, frontend, backend, bots
- ✅ Prisma schema: 25 моделей с миграциями

---

## 2. Что требует доработки (не блокирует релиз, но нужно до RC)

### Безопасность (HIGH)
- **S-1** `JWT_SECRET` — устранено в этом аудите: убран fallback 'dev-secret-change-in-prod', добавлен throw при отсутствии переменной. ✅ ИСПРАВЛЕНО
- **S-2** Dev Redis (`docker-compose.yml`) не требует пароль и открыт на host:6379. На production используется docker-compose.prod.yml с паролем — OK, но dev-конфиг рискован на облачных ВМ.
- **S-3** Real Yandex Metrika ID (`110270689`) и MAX bot URL в `.env.example`. Не секрет, но публично идентифицирует продукт. При публикации репозитория рекомендуется заменить на placeholder.
- **S-4** `NEXT_PUBLIC_MAX_BOT_URL` отсутствует в `apps/frontend/.env.example` — кнопка "Напомнить в MAX" не будет работать без ручного добавления при деплое.

### Валидация и обработка ошибок (MEDIUM)
- **V-1** `UpsertBotUserDto`, `AcceptLegalDto`, `SavePhoneDto` — нет `class-validator` декораторов; глобальный ValidationPipe не проверяет их поля.
- **V-2** `changePassword` — поля `currentPassword`/`newPassword` без ограничений длины.
- **V-3** `apiAcceptLegal()` и `apiSavePhone()` в Telegram/MAX ботах — return value игнорируется; ошибка сохранения не блокирует прогресс state machine.
- **V-4** `max-import.service.ts::runManual()` — нет try/catch вокруг `fetchPosts()`.

### Производительность (MEDIUM)
- **P-1** Broadcast processor: N+1 — `isCooldownActive()` вызывается per-recipient в цикле (50 DB-запросов на батч). Для крупных рассылок критично.
- **P-2** Отсутствующие индексы в Prisma (требуют миграцию): `Reminder.botUserId`, `EventDirection.directionId`, `HashtagMapping.directionId`, `ApiSourceLog.sourceId`.

### Admin UX (LOW)
- **U-1** Admin секция не имеет своего `error.tsx` — при ошибке показывается публичный error UI вместо admin-styled.
- **U-2** `admin/settings/page.tsx` — нет отдельного error state для загрузки (renderает null при fail).

### Качество кода (LOW)
- **Q-1** `assertBotToken()` дублируется в 3 контроллерах — нужен общий guard.
- **Q-2** `buildMessageText()` в broadcasts.service.ts — deprecated wrapper, нет вызовов, нужно удалить.
- **Q-3** ~45 `as any` cast в backend (mainly Prisma enum workarounds) — fixable импортом Prisma enum types.
- **Q-4** `backend tsconfig.json` — неполный strict mode (strictFunctionTypes, strictPropertyInitialization выключены).
- **Q-5** `forceConsistentCasingInFileNames: false` в backend tsconfig.
- **Q-6** Dead dependencies в bots: `@prisma/client`, `ioredis`, `node-fetch` не используются.

### Инфраструктура (LOW)
- **I-1** `SESSION_SECRET` отсутствует в docker-compose (dev и prod) — переменная определена в env.example но не передаётся сервисам.
- **I-2** bots/Dockerfile, backend/Dockerfile — контейнеры запускаются от root; нет `USER` инструкции.
- **I-3** frontend, nginx, bots сервисы без `healthcheck` в docker-compose.
- **I-4** Нет тестов (unit/integration) ни в одном пакете. `@nestjs/testing` установлен в devDeps но не используется.
- **I-5** `REDIS_PASSWORD` отсутствует в `apps/backend/.env.example`.
- **I-6** `NEXT_PUBLIC_API_URL` отсутствует в production docker-compose.prod.yml для frontend сервиса.

---

## 3. Что можно перенести в v1.1

- **1.1-1** Тесты: unit tests для services, e2e для критических API endpoints
- **1.1-2** Broadcast processor N+1 оптимизация (batch cooldown check)
- **1.1-3** Prisma missing indexes — требует миграцию, не критично для первого деплоя при текущих объёмах
- **1.1-4** Извлечение `assertBotToken` в общий guard
- **1.1-5** Admin `error.tsx` страница
- **1.1-6** `SiteConfigVersion.key` — добавить FK к `SiteConfig`; `Reminder` — добавить `@@unique([botUserId, eventId])`
- **1.1-7** Dockerfile security hardening (non-root USER, HEALTHCHECK)
- **1.1-8** Выделение повторяющихся констант (MAX_CHANNEL, PARTNER_URL) в `lib/constants.ts`
- **1.1-9** Исправление `any` типов в backend через импорт Prisma enums
- **1.1-10** `/help` команда в MAX Bot
- **1.1-11** `/cancel` команда в обоих ботах для сброса state machine
- **1.1-12** ApiSource/ApiSourceLog, Builder, Images, Analytics — заглушки без реализации
- **1.1-13** Images upload для мероприятий (TASK-4.1 из RELEASE_BACKLOG)
- **1.1-14** HTML sanitization для fullDescription (TASK-8.1)
- **1.1-15** CookieBanner настраивается из SiteConfig (TASK-3.1)

---

## 4. Что блокирует релиз

### BLOCKER-1: NEXT_PUBLIC_MAX_BOT_URL отсутствует в frontend .env
**Файл**: `apps/frontend/.env.example`  
**Проблема**: Переменная `NEXT_PUBLIC_MAX_BOT_URL` определена в root `.env.example` и используется в `EventDetailActions.tsx`, но отсутствует в `apps/frontend/.env.example`. Оператор деплоя, следующий только по frontend-конфигу, не поставит её — кнопка "Напомнить в MAX" будет использовать хардкод-URL или не отображаться.  
**Действие**: добавить переменную в `apps/frontend/.env.example`.

### BLOCKER-2: SESSION_SECRET не передаётся в docker-compose
**Файл**: `docker-compose.yml`, `docker-compose.prod.yml`  
**Проблема**: `SESSION_SECRET` определён в `.env.example` и `apps/backend/.env.example`, но ни dev, ни prod docker-compose не передают его в backend сервис через `environment:`. Если passport sessions используют этот секрет — они не работают в Docker-деплое.  
**Действие**: проверить, используется ли SESSION_SECRET в backend коде, и если да — добавить в docker-compose.

### BLOCKER-3: REDIS_PASSWORD не в apps/backend/.env.example и prod docker-compose
**Файл**: `apps/backend/.env.example`  
**Проблема**: Production docker-compose.prod.yml передаёт `REDIS_PASSWORD` в backend, но `apps/backend/.env.example` не документирует эту переменную. При локальном запуске без docker-compose backend не сможет подключиться к Redis с паролем.  
**Действие**: добавить `REDIS_PASSWORD=` в `apps/backend/.env.example`.

### BLOCKER-4: Нет автоматических тестов + нет CI pipeline
**Проблема**: `pnpm test` завершится с ошибкой во всех пакетах — скрипт `test` отсутствует. При настройке CI/CD любой pipeline, вызывающий `pnpm test`, немедленно упадёт. Отсутствие тестов означает невозможность автоматической проверки регрессий.  
**Минимальное действие для RC**: добавить `"test": "echo 'no tests yet'"` в каждый package.json чтобы pipeline не падал; добавить хотя бы 2-3 smoke-теста для auth и health endpoint.

---

## 5. Общий процент готовности

| Компонент | Готовность | Комментарий |
|-----------|-----------|-------------|
| Публичный сайт | 90% | Нет image upload, некоторые CSS-детали |
| Admin панель | 88% | Нет admin error.tsx, image upload |
| Backend API | 85% | Заглушки (analytics, builder, images), N+1 в broadcast |
| Telegram Bot | 80% | Нет /cancel, state machine хранится в памяти |
| MAX Bot | 75% | Нет /help, /cancel; any typing; sendMaxMessage не проверяет HTTP status |
| Инфраструктура | 70% | Нет тестов, неполные healthchecks, docker-compose пробелы |
| Документация | 85% | env.example есть, API docs через Swagger |
| **Итого** | **82%** | |

---

## 6. Рекомендация

### ⚠️ НЕ ГОТОВ К РЕЛИЗУ

**Причины:**

1. **4 блокера** требуют исправления перед деплоем:
   - Недостающие env переменные в конфигурационных файлах
   - Отсутствие тестовых скриптов (CI будет падать)

2. **Критические безопасные проблемы** — частично устранены в этом аудите:
   - ~~JWT fallback secret~~ → **ИСПРАВЛЕНО** (throw при отсутствии JWT_SECRET)
   - Dev Redis без пароля остаётся риском на облачных серверах

3. **Функциональные пробелы** для v1.0:
   - Кнопка "Напомнить в MAX" может не работать на production без ручной настройки env
   - Боты теряют состояние при перезапуске (in-memory Map) — пользователи в середине flow зависнут

**Что нужно сделать перед релизом (оценка: 1–2 дня):**

- [ ] BLOCKER-1: добавить `NEXT_PUBLIC_MAX_BOT_URL` в `apps/frontend/.env.example`
- [ ] BLOCKER-2: проверить/добавить `SESSION_SECRET` в docker-compose
- [ ] BLOCKER-3: добавить `REDIS_PASSWORD` в `apps/backend/.env.example`
- [ ] BLOCKER-4: добавить `"test": "echo 'no tests yet'"` в package.json всех пакетов
- [ ] Провести ручное smoke-тестирование полного flow: регистрация → напоминание → рассылка → публикация мероприятия

**После устранения блокеров** проект будет готов к деплою в staging для финальной приёмки.

---

## Приложение: Полный список найденных проблем

### Автоматически исправлено в этом аудите

| # | Файл | Исправление |
|---|------|-------------|
| A-1 | `.env.example` | Добавлены `NEXT_PUBLIC_YANDEX_METRIKA_ID`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL` |
| A-2 | `apps/backend/src/main.ts` | `console.log` заменён на `Logger.log` |
| A-3 | `apps/backend/src/modules/auth/auth.module.ts` | JWT_SECRET: убран fallback, добавлен throw при отсутствии |
| A-4 | `apps/backend/src/modules/auth/strategies/jwt.strategy.ts` | То же — throw при отсутствии JWT_SECRET |
| A-5 | `apps/frontend/src/components/events/EventsSection.tsx` | Удалены мёртвый код: unused `isFirstMount` callback + пустой `useEffect` |
| A-6 | `apps/frontend/src/app/admin/broadcasts/[id]/page.tsx` | Silent catch → полноценная обработка с отображением ошибки для вкладок Получатели/Логи |

### Занесено в RELEASE_BACKLOG для v1.1

| # | Severity | Описание |
|---|----------|---------|
| B-1 | HIGH | Broadcast N+1: `isCooldownActive` per-recipient |
| B-2 | HIGH | Prisma missing indexes: Reminder.botUserId, EventDirection.directionId, HashtagMapping.directionId, ApiSourceLog.sourceId |
| B-3 | MEDIUM | Bot class-validator: UpsertBotUserDto, AcceptLegalDto, SavePhoneDto без декораторов |
| B-4 | MEDIUM | `apiAcceptLegal`/`apiSavePhone` return value ignored в Telegram/MAX bot |
| B-5 | MEDIUM | `runManual()` max-import без try/catch |
| B-6 | MEDIUM | Admin `error.tsx` — нет admin-styled error boundary |
| B-7 | LOW | `assertBotToken` — дублируется в 3 контроллерах |
| B-8 | LOW | `buildMessageText()` deprecated без вызовов — удалить |
| B-9 | LOW | ~45 `as any` в backend broadcasts/events (Prisma enum workaround) |
| B-10 | LOW | bots/Dockerfile: no USER, no HEALTHCHECK |
| B-11 | LOW | backend/Dockerfile: no USER |
| B-12 | LOW | Dev Redis: no password, exposed 6379 on host |
| B-13 | LOW | `SiteConfigVersion` нет FK к `SiteConfig` |
| B-14 | LOW | `Reminder` нет `@@unique([botUserId, eventId])` |
| B-15 | LOW | Dead bots dependencies: @prisma/client, ioredis, node-fetch |
| B-16 | LOW | MAX Bot: нет `/help`, `/cancel`; sendMaxMessage не проверяет HTTP status |
| B-17 | LOW | Telegram Bot: нет `/cancel`; in-memory state machine |
| B-18 | LOW | Backend tsconfig: strictFunctionTypes, strictPropertyInitialization выключены |
| B-19 | LOW | Image upload для мероприятий (TASK-4.1) |
| B-20 | LOW | HTML sanitization fullDescription (TASK-8.1) |
| B-21 | LOW | Константы MAX_CHANNEL, PARTNER_URL дублируются в 4 файлах |
| B-22 | LOW | Нет тестов ни в одном пакете |
