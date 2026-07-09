# CHANGELOG

## [Unreleased] — 2026-07-09 — Stage 39: Smoke Tests → ГОТОВ К STAGING

### Тестирование

- **BLOCKER-1 СНЯТ** — добавлен smoke-test suite на `node:test` (zero deps):
  - `apps/backend/test/smoke.test.mjs` — 45 тестов: модули, JWT-security (нет fallback), admin route guards, public endpoints, Logger, frontend routes, .env.example
  - `apps/frontend/test/smoke.test.mjs` — 26 тестов: public routes, admin routes, key components, auth guard redirect
  - `apps/bots/test/smoke.test.mjs` — структурные тесты bot files
  - `scripts/smoke-integration.sh` — curl HTTP smoke для живого окружения
- **`pnpm --recursive test` → 71/71 ✅** (45 backend + 26 frontend)
- Все `package.json` test-скрипты заменены с echo-placeholder на реальные тесты

### Документация

- **BLOCKER-2 СНЯТ** — `/admin/users` перенесён в v1.1 HIGH (RC-B20) по явному решению
- `RELEASE_CANDIDATE_REPORT.md` — статус изменён с «НЕ ГОТОВ» на **ГОТОВ К STAGING**, готовность 88%
- `PROJECT_IMPLEMENTATION_STATUS.md` — добавлена секция Stage 39
- `RELEASE_BACKLOG.md` — добавлен RC-B20 (/admin/users HIGH v1.1), Stage 39 summary

### Итог Stage 39

- Блокеров к релизу: **0**
- Тестов: **71** (структурные smoke)
- Статус: **✅ ГОТОВ К STAGING**

---

## [Unreleased] — 2026-07-09 — Stage 38: Release Candidate Audit

### Безопасность

- **SECURITY** — `auth.module.ts`, `jwt.strategy.ts`: убран fallback `'dev-secret-change-in-prod'` для `JWT_SECRET`; добавлен throw при отсутствии переменной. Приложение теперь не запустится без явного JWT_SECRET в env.

### Исправлено

- **main.ts**: `console.log` заменён на `Logger.log` (NestJS structured logging)
- **EventsSection.tsx**: удалён мёртвый код — `isFirstMount` callback и пустой `useEffect` с eslint-disable комментарием
- **broadcasts/[id]/page.tsx**: silent catch в вкладках Получатели/Логи заменён на полноценную обработку с отображением ошибки в UI (`recipError`, `logsError` state)
- **package.json** (все пакеты): добавлен скрипт `"test"` — CI pipeline больше не упадёт с ошибкой `script not found`

### Конфигурация

- **`.env.example`** (root): добавлены `NEXT_PUBLIC_YANDEX_METRIKA_ID`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`
- **`apps/frontend/.env.example`**: добавлен `NEXT_PUBLIC_MAX_BOT_URL` — документирует переменную для кнопки «Напомнить в MAX»
- **`apps/backend/.env.example`**: добавлен `REDIS_PASSWORD` — документирует переменную для Redis auth

### Документация

- Создан (перезаписан) `docs/PROJECT_BIBLE/RELEASE_CANDIDATE_REPORT.md` — полный RC-отчёт по структуре: 8 разделов, 16 компонентов с % готовности, 2 блокера, v1.1 backlog
- Обновлён `docs/PROJECT_BIBLE/PROJECT_IMPLEMENTATION_STATUS.md` — добавлен раздел Stage 38 с авто-исправлениями и оставшимися блокерами
- Обновлён `docs/PROJECT_BIBLE/RELEASE_BACKLOG.md` — добавлены RC-A* (исправлено) и RC-B* (backlog v1.1)

### Итог аудита Stage 38

- Найдено проблем: 30+ (frontend, backend, bots, infra)
- Авто-исправлено: 8 проблем
- Добавлено в backlog v1.1: 19 задач (RC-B1..RC-B19)
- Общая готовность: 82%
- Статус: **НЕ ГОТОВ** (2 блокера: тесты + /admin/users)

---

## [Unreleased] — 2026-07-08

### Исправлено (CRITICAL / HIGH issues)

- **HIGH-1** — `EventDetailActions`: добавлена отдельная кнопка «Напомнить в MAX» с deep-link `NEXT_PUBLIC_MAX_BOT_URL?start=remind_<id>`. Кнопка скрыта, если переменная не задана.
- **HIGH-2** — `.env.example`: задокументированы `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` и `NEXT_PUBLIC_MAX_BOT_URL` с поясняющими комментариями.
- **HIGH-4** — `SiteFooter`: добавлена строка «ООО «АБ ГРУПП» · ОГРН 1212300074766 · ИНН 2308283450» ниже копирайта. Добавлен CSS-класс `.pub-footer-operator` в `globals.css`.

### Верифицировано как уже реализованное

- **CRIT-1** — `QuotesModule` backend: `GET /quotes/public` реализован, seed содержит цитаты.
- **CRIT-2** — Admin Events UI: `/admin/events` (список + фильтры) и `/admin/events/[id]` (edit form) присутствуют.
- **CRIT-3** — Admin Quotes UI: `/admin/quotes` (список + CRUD) присутствует.
- **HIGH-3** — Admin sidebar: содержит все 6 пунктов навигации.
- **HIGH-5** — `BroadcastProcessor`: все три условия BR-031 присутствуют в WHERE-запросе.

### Документация

- Создан `docs/PROJECT_BIBLE/PROJECT_IMPLEMENTATION_STATUS.md` — технический аудит проекта.
- `PROJECT_IMPLEMENTATION_STATUS.md`: все CRITICAL/HIGH отмечены как RESOLVED.

### Затронутые файлы

- `apps/frontend/src/components/events/EventDetailActions.tsx`
- `apps/frontend/src/components/layout/SiteFooter.tsx`
- `apps/frontend/src/app/globals.css`
- `.env.example`
- `docs/PROJECT_BIBLE/PROJECT_IMPLEMENTATION_STATUS.md`

---

## [Unreleased] — MED-1, MED-2

### MED-1 — Яндекс.Метрика: SPA pageview + custom goals

- Создан `apps/frontend/src/lib/metrika.ts` — типизированная обёртка над глобальным `ym()`
- Создан `apps/frontend/src/components/MetrikaPageview.tsx` — client-компонент для SPA hit-трекинга при навигации Next.js App Router (через `usePathname` + `useSearchParams`, завёрнут в `Suspense`)
- Создан `apps/frontend/src/components/events/EventViewTracker.tsx` — client-компонент, отправляет `reachGoal('event_view')` при загрузке страницы события
- `EventDetailActions.tsx` — добавлены 4 цели: `event_register`, `ticket_buy`, `reminder_telegram`, `reminder_max`, `ics_download`
- `apps/frontend/src/app/layout.tsx` — подключён `MetrikaPageview` через Suspense

### MED-2 — Admin Events: вкладка «Требует внимания»

- `apps/frontend/src/app/admin/events/page.tsx` — добавлена tabs-строка над тулбаром с двумя вкладками: «Все мероприятия» и «Требует внимания»
- Вкладка показывает красный badge с количеством событий (запрос к `GET /events/admin/needs-attention` при монтировании)
- Клик по вкладке устанавливает `status=NEEDS_ATTENTION` и сбрасывает пагинацию
- `apps/frontend/src/app/globals.css` — добавлен `.adm-tab__badge` (красный pill-badge)

### Затронутые файлы (MED-1/MED-2)

- `apps/frontend/src/lib/metrika.ts` (создан)
- `apps/frontend/src/components/MetrikaPageview.tsx` (создан)
- `apps/frontend/src/components/events/EventViewTracker.tsx` (создан)
- `apps/frontend/src/components/events/EventDetailActions.tsx`
- `apps/frontend/src/app/events/[id]/page.tsx`
- `apps/frontend/src/app/layout.tsx`
- `apps/frontend/src/app/admin/events/page.tsx`
- `apps/frontend/src/app/globals.css`

---

## [Unreleased] — MED-3

### MED-3 — Подсистема справочников: Города и Направления

**Backend:**
- `apps/backend/src/modules/cities/cities.service.ts` — полный CRUD с поиском, пагинацией, сортировкой, проверкой уникальности, soft-delete при наличии мероприятий
- `apps/backend/src/modules/cities/cities.controller.ts` — `GET/GET:id/POST/PUT/PATCH:toggle/DELETE /admin/cities`, гард `JwtAuthGuard + RolesGuard (ADMIN|EDITOR)`
- `apps/backend/src/modules/directions/directions.service.ts` (создан) — аналогичный CRUD + валидация slug (`/^[a-z0-9-]+$/`)
- `apps/backend/src/modules/directions/directions.controller.ts` (создан) — `GET/GET:id/POST/PUT/PATCH:toggle/DELETE /admin/directions`
- `apps/backend/src/modules/directions/directions.module.ts` (создан) — регистрация модуля
- `apps/backend/src/app.module.ts` — подключён `DirectionsModule`

**Frontend:**
- `apps/frontend/src/app/admin/cities/page.tsx` (создан) — страница Города: сортируемая таблица, поиск, фильтр по статусу, модальная форма, toggle, delete
- `apps/frontend/src/app/admin/directions/page.tsx` (создан) — страница Направления: то же + slug-колонка и поле slug в форме
- `apps/frontend/src/app/admin/AdminLayoutClient.tsx` — добавлен раздел «Справочники» в сайдбаре с ссылками Города и Направления
- `apps/frontend/src/app/globals.css` — добавлены `.adm-sidebar__section-title`, `.adm-sidebar__link--sub`
- `apps/frontend/src/lib/admin-api.ts` — добавлены типы `AdminCity`, `AdminCitiesResponse`, `AdminDirection`, `AdminDirectionsResponse`
