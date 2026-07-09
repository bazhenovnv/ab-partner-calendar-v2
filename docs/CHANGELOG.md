# CHANGELOG

## [Unreleased] — 2026-07-09 — Stage 42.5: Staging Environment Freeze

### Документация

- Создан `docs/PROJECT_BIBLE/STAGING_ENVIRONMENT.md` — эталонная документация окружения staging
- Зафиксированы: сервер (Timeweb Cloud, IP 5.129.243.179, Ubuntu 22.04 LTS, /srv/ab-afisha), домены (ab-event.pro HTTPS ✅, test.ab-event.pro HTTP ⚠), 6 контейнеров, 22 ENV-переменные, БД (Prisma 25 моделей), боты (Telegram polling, MAX polling, Reminder cron)
- ENV-аудит: 1 missing (NEXT_PUBLIC_MAX_BOT_URL в prod compose), 1 unused (SESSION_SECRET)
- Security Freeze, Design Freeze, Release Freeze зафиксированы в документе

### Финальный статус Stage 42.5

**✅ STAGING ENVIRONMENT FROZEN**  
Все параметры staging-окружения задокументированы и заморожены.  
Изменения конфигурации, ENV или деплой-конфигурации требуют отдельного согласования.

---

## [Unreleased] — 2026-07-09 — Stage 42: Staging Preparation & Release Readiness

### Аудит

- Проверена вся инфраструктура: docker-compose.prod.yml, Dockerfiles, nginx prod.conf, backup.sh
- ENV-аудит: 18 переменных; выявлена 1 отсутствующая в prod compose (`NEXT_PUBLIC_MAX_BOT_URL`)
- Database: Prisma schema (25 моделей), 3 миграции, auto-deploy entrypoint ✅
- Security: Helmet ✅, CORS ✅, JWT ✅, ValidationPipe ✅, ThrottlerGuard ✅
- Public site: все компоненты, SEO, OG, robots, sitemap ✅
- Admin: 9 разделов ✅
- Performance: standalone build, next/image, font-display:swap; замечание: nginx gzip не настроен

### Документы

- Создан `docs/PROJECT_BIBLE/STAGE_42_CHECKLIST.md`
- Создан `docs/PROJECT_BIBLE/STAGING_READINESS_REPORT.md`

### Финальный статус Stage 42

**✅ READY FOR STAGING**  
Блокеров: 0. Общая готовность: 97%.  
Следующий этап: Stage 43 — Deploy to Staging.

---

## [Unreleased] — 2026-07-09 — Stage 41.13: Design Pass ЗАКРЫТ

### Документация закрытия Design Pass

- **DESIGN_CONFORMANCE_REPORT.md:** обновлён заголовок (Stage 41.13, Design Pass COMPLETE); секция 6 — история исправлений; секция 7 — v1.1 backlog с приоритетами; «Итог аудита» обновлён (97%); добавлена секция 10 «Рекомендация к Stage 42».
- **PROJECT_IMPLEMENTATION_STATUS.md:** готовность 92% → 97%; добавлены итоги Stage 41.6–41.13; статус «✅ ГОТОВ К STAGE 42».
- **RELEASE_CANDIDATE_REPORT.md:** добавлен раздел Design Pass в «Что полностью готово»; параметры обновлены (97%, Design Pass ✅).
- **CHANGELOG.md:** зафиксировано закрытие Design Pass.

### Итоговый статус Design Pass

| Расхождение | Этап | Статус |
|-------------|------|--------|
| D-01 EventCard UPPERCASE | 41.6 | ✅ |
| D-02 MainEventsBanner карусель | 41.6 | ✅ |
| D-03 Логотип SVG | 41.6 | ✅ |
| D-04 Maintenance Page | — | ⬛ Намеренно |
| D-05 EventCard дата | 41.6 | ✅ |
| D-06 Gilroy badges | 41.12 | ✅ |
| D-07 Gilroy quotes | 41.12 | ✅ |
| D-08 Gilroy footer | 41.12 | ✅ |
| D-09 Hero composition | 41.10 | ✅ |
| D-10..D-17 | — | 🟡 v1.1 |

**Готовность к staging: 97%. Блокеров: 0. Переход к Stage 42 разрешён.**

---

## [Unreleased] — 2026-07-09 — Stage 41.12: Gilroy font + Креативы (19/20)

### Шрифт Gilroy — D-06, D-07, D-08

- **Получен:** полное семейство Gilroy в `project-assets/fonts/gilroy/font/` (Regular, Medium, Semibold и другие, woff2+woff).
- **Скопировано:** `apps/frontend/public/fonts/gilroy/` — Regular, Medium, Semibold (woff2 + woff).
- **@font-face:** добавлены объявления в `globals.css` для weight 400/500/600 с `font-display: swap`.
- **--font-gilroy:** CSS-переменная добавлена в `:root`; Tailwind-утилита `font-gilroy` активирована.
- **D-06 ✅:** EventCard статус-бейдж → `font-gilroy font-medium` (заменён `font-semibold`).
- **D-07 ✅:** `.quotes-text` → `font-family: var(--font-gilroy)`, `font-weight: 400` (было Montserrat 500).
- **D-08 ✅:** `.pub-footer-desc`, `.pub-footer-link`, `.pub-footer-legal-link`, `.pub-footer-copy`, `.pub-footer-operator` → `font-family: var(--font-gilroy)`.

### Инвентаризация архивов

- **Креативы АБ (19).zip** — 1 файл: `notebook_mint_transparent 1.png` (365×349px RGBA) — чёрный ноутбук, mint ручка, кофе, mint листья. Декоративная композиция, прозрачный фон. **Не применяется без утверждения.**
- **Креативы АБ (20).zip** — 1 файл: `Logo.png` (118×143px RGBA) — монограмма «аб» в PNG. Улучшенный референс логотипа. **Не применяется без утверждения.** (⚠ SVG оригинала по-прежнему нет)

### Обновлена документация

- `docs/PROJECT_BIBLE/MISSING_DESIGN_ASSETS.md` — Gilroy: ❌ MISSING → ✅ AVAILABLE
- `docs/PROJECT_BIBLE/DESIGN_ASSET_INVENTORY.md` — Gilroy → ✅, счётчики обновлены (✅31, ⚠7, ❌0)
- `docs/PROJECT_BIBLE/DESIGN_CONFORMANCE_REPORT.md` — D-06/D-07/D-08 → ✅, раздел 9 обновлён

### Проверки Stage 41.12

- `pnpm typecheck` → ✅ 0 ошибок
- `pnpm build` → ✅ все routes собраны
- `node --test apps/frontend/test/smoke.test.mjs` → ✅ 26/26

---

## [Unreleased] — 2026-07-09 — Stage 41.6: Design Fix Pass

### Исправления дизайна (D-01, D-02, D-03, D-05)

- **D-01 — EventCard UPPERCASE:** `EventCard.tsx` — добавлен `uppercase` к заголовку карточки. Теперь все заголовки мероприятий в карточках отображаются в верхнем регистре согласно макету `{B047A5A6}`.
- **D-02 — MainEventsBanner → карусель:** `MainEventsBanner.tsx` полностью переписан. Вместо fullscreen-баннера (21:9, одно событие) — горизонтальная карусель thumbnail-карточек (2 на мобайл / 4 на десктоп) на navy-фоне с навигационными точками `‹ •••• ›`. Соответствует макету `{FBB54E41}`.
- **D-03 — Логотип SVG:** `SiteHeader.tsx` — заменён navy-бокс с текстом «АБ» на inline SVG-монограмму «аб» (stroke-based, `currentColor`, 38×32px), воссоздающую дизайн из `project-assets/03_logo_frames/Frame 60.png`.
- **D-05 — EventCard дата:** `EventCard.tsx` + `format.ts` — дата-бейдж переработан: вместо compact-текста — white rounded box 56px с крупной цифрой дня (Montserrat Bold 24pt) и месяцем (11pt) в две строки по центру. Соответствует макету `{B047A5A6}`.
- **D-04** — намеренно НЕ исправляется (Maintenance Page минималистична по продуктовому решению).

### Проверки Stage 41.6

- `pnpm typecheck` → ✅ 0 ошибок
- `pnpm build` → ✅ все routes собраны
- `node --test apps/frontend/test/smoke.test.mjs` → ✅ 26/26

### Итог Stage 41.6

- Исправлено дизайн-расхождений: **4/4** (D-01, D-02, D-03, D-05)
- Готовность к staging по дизайну: **92%**
- Ожидает визуального подтверждения от заказчика

---

## [Unreleased] — 2026-07-09 — Stage 41: ACC-FIX → Приёмка ПРИНЯТА

### Исправления (ACC-FIX-1..4)

- **ACC-FIX-1 — Favicon:** создан `apps/frontend/src/app/icon.tsx` — Next.js ImageResponse, 32×32px. Тёмно-синий (#0D2344) с надписью «АБ» мятным (#7CD8B3). Соответствует логотипу Header.
- **ACC-FIX-2 — MAX-кнопка:** в `EventDetailActions.tsx` дефолт `NEXT_PUBLIC_MAX_BOT_URL` изменён с `'https://max.ru/id2308283362_bot'` на `''`. MAX-кнопка теперь показывается только при явно заданной env-переменной — поведение идентично Telegram-кнопке.
- **ACC-FIX-3 — Branded 404:** создан `apps/frontend/src/app/not-found.tsx` — брендированная 404-страница с `PublicShell`: SVG-иконка, «404», заголовок, описание, кнопка «На главную». `robots: { index: false }`.
- **ACC-FIX-4 — OG Image:** создан `apps/frontend/src/app/opengraph-image.tsx` (edge runtime, 1200×630). Обновлён `layout.tsx` — добавлены `openGraph.images` и `twitter: { card: 'summary_large_image', images }`.

### Проверки Stage 41

- `pnpm typecheck` → ✅ 0 ошибок
- `pnpm build` → ✅ `/icon` и `/opengraph-image` в route-списке
- `node --test apps/frontend/test/smoke.test.mjs` → ✅ 26/26

### Документация

- `ACCEPTANCE_REPORT.md` — все ACC-FIX закрыты, таблица Production Ready обновлена, статус **ПРИНЯТО 47/47**
- `RELEASE_CANDIDATE_REPORT.md` — готовность 88% → **92%**, ACC-FIX добавлены в список выполненного
- `PROJECT_IMPLEMENTATION_STATUS.md` — добавлена секция Stage 40+41, готовность обновлена

### Итог Stage 41

- Принято: **47/47 позиций**
- ACC-FIX закрыто: **4/4**
- Готовность: **92%** — ✅ **ГОТОВ К STAGING**

---

## [Unreleased] — 2026-07-09 — Stage 40: Acceptance Testing

### Документация

- Создан `docs/PROJECT_BIBLE/ACCEPTANCE_REPORT.md` — полный отчёт по приёмке Stage 40:
  - 47 позиций чек-листа, 42 принято, 4 требуют исправления
  - ACC-FIX-1: нет favicon
  - ACC-FIX-2: MAX-кнопка показывается всегда (неверный default `''` → `'https://...'`)
  - ACC-FIX-3: нет global `not-found.tsx`
  - ACC-FIX-4: нет og:image для главной страницы
  - 5 пунктов перенесено в v1.1 (v1.1-A..E)
  - 4 рекомендации (R-1..R-4)

### Итог Stage 40

- Принято: 42/47 позиций
- Требует исправления до демонстрации: 4 (ACC-FIX-1..4)
- Статус: **УСЛОВНО ПРИНЯТО** → ожидает ACC-FIX → Stage 41 Release Preparation

---

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
