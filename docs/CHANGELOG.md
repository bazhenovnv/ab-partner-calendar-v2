# CHANGELOG

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
