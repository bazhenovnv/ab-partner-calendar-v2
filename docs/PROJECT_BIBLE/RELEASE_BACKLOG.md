# RELEASE BACKLOG
## АБ Афиша Бухгалтера — Полный аудит готовности к релизу

**Дата аудита:** 2026-07-08  
**Ветка:** `claude/ab-afisha-architecture-plan-805f5o`  
**Метод:** полный обход кода всех маршрутов публичного сайта, admin-панели и ботов

---

## ЛЕГЕНДА

| Приоритет | Значение |
|-----------|----------|
| 🔴 CRITICAL | Блокирует релиз / нарушает законодательство |
| 🟠 HIGH | Существенный UX или бизнес-функционал отсутствует |
| 🟡 MEDIUM | Отклонение от ТЗ, не блокирует |
| 🟢 LOW | Minor UX / tech debt |

| Статус | Значение |
|--------|----------|
| ❌ NOT STARTED | Не реализовано |
| 🔄 IN PROGRESS | Частично реализовано / заглушка |
| ✅ DONE | Реализовано полностью |

---

## EPIC-1: Admin Panel — Справочники и пользователи

Административный интерфейс для управления справочными данными (города, направления) и просмотра подписчиков ботов.

---

### TASK-1.1 — Admin UI: города

| Поле | Значение |
|------|----------|
| **ID** | TASK-1.1 |
| **Статус** | ❌ NOT STARTED |
| **Приоритет** | 🟡 MEDIUM |
| **Описание** | Нет страницы `/admin/cities`. Города сейчас добавляются только через прямой SQL или max-import. Нет возможности добавить офлайн-город вручную. |
| **Файлы (frontend)** | `apps/frontend/src/app/admin/cities/page.tsx` (создать) |
| **Файлы (backend)** | `apps/backend/src/modules/cities/cities.controller.ts`, `cities.service.ts` — сейчас только health stub |
| **Как исправить** | 1. Добавить в `CitiesController`: `GET /cities` (admin, пагинация), `POST /cities`, `PUT /cities/:id`, `DELETE /cities/:id`. 2. Реализовать методы в `CitiesService` через Prisma. 3. Создать страницу `/admin/cities` (таблица + inline create/edit/delete). 4. Добавить «Города» в sidebar. |
| **Зависимости** | Нет |

---

### TASK-1.2 — Admin UI: направления

| Поле | Значение |
|------|----------|
| **ID** | TASK-1.2 |
| **Статус** | ❌ NOT STARTED |
| **Приоритет** | 🟡 MEDIUM |
| **Описание** | Нет страницы `/admin/directions`. `GET /filters/directions` — read-only публичный. Нет admin CRUD. Направления нельзя добавить/переименовать/удалить из UI. |
| **Файлы (frontend)** | `apps/frontend/src/app/admin/directions/page.tsx` (создать) |
| **Файлы (backend)** | `apps/backend/src/modules/filters/filters.controller.ts` (расширить) или новый `directions.controller.ts` |
| **Как исправить** | 1. Добавить admin-authenticated endpoints: `POST /directions`, `PUT /directions/:id`, `DELETE /directions/:id`. 2. Создать страницу `/admin/directions`. 3. Добавить «Направления» в sidebar. |
| **Зависимости** | Нет |

---

### TASK-1.3 — Admin UI: подписчики ботов

| Поле | Значение |
|------|----------|
| **ID** | TASK-1.3 |
| **Статус** | ❌ NOT STARTED |
| **Приоритет** | 🟡 MEDIUM |
| **Описание** | Нет страницы `/admin/users`. Нет возможности просматривать подписчиков, фильтровать по каналу, видеть статус согласий. На дашборде показывается счётчик «Подписчики ботов» — но сама таблица недоступна. |
| **Файлы (frontend)** | `apps/frontend/src/app/admin/users/page.tsx` (создать) |
| **Файлы (backend)** | `apps/backend/src/modules/bots/bots.controller.ts` — добавить admin endpoint |
| **Как исправить** | 1. Добавить `GET /bots/users` (JWT + ADMIN) с пагинацией и фильтром по каналу. 2. Создать страницу `/admin/users` (таблица: канал, username, externalId, дата регистрации, согласия, активные напоминания). 3. Добавить «Пользователи» в sidebar. |
| **Зависимости** | Нет |

---

## EPIC-2: Admin Panel — Логи и импорт

---

### TASK-2.1 — Admin UI: логи MAX-импорта

| Поле | Значение |
|------|----------|
| **ID** | TASK-2.1 |
| **Статус** | 🔄 IN PROGRESS |
| **Приоритет** | 🟡 MEDIUM |
| **Описание** | `GET /max-import/logs` возвращает заглушку `{ message: 'Logs endpoint - implement with PrismaService' }`. Нет UI для просмотра логов и ручного запуска импорта. `POST /max-import/run` реализован в backend, но не вызывается из UI. |
| **Файлы (frontend)** | `apps/frontend/src/app/admin/max-import/page.tsx` (создать) |
| **Файлы (backend)** | `apps/backend/src/modules/max-import/max-import.controller.ts` — `GET /max-import/logs` (строка ~20) |
| **Как исправить** | 1. Дореализовать `GET /max-import/logs` через Prisma (модель `ImportLog` или аналогичная). 2. Создать страницу `/admin/max-import`: кнопка «Запустить импорт», таблица логов с временными метками и результатами. |
| **Зависимости** | Наличие модели логов в Prisma-схеме |

---

### TASK-2.2 — Admin UI: история версий события

| Поле | Значение |
|------|----------|
| **ID** | TASK-2.2 |
| **Статус** | 🔄 IN PROGRESS |
| **Приоритет** | 🟢 LOW |
| **Описание** | Backend: `GET /events/admin/:id/versions` и `POST /events/admin/:id/restore/:versionId` реализованы. Frontend `/admin/events/[id]` не содержит вкладки или секции истории версий. |
| **Файлы (frontend)** | `apps/frontend/src/app/admin/events/[id]/page.tsx` |
| **Как исправить** | Добавить вкладку «История» на страницу редактирования события с таблицей версий и кнопкой «Восстановить». |
| **Зависимости** | TASK-2.1 не зависит |

---

## EPIC-3: Cookie Banner — интеграция с настройками

---

### TASK-3.1 — CookieBanner читает настройки из backend

| Поле | Значение |
|------|----------|
| **ID** | TASK-3.1 |
| **Статус** | ❌ NOT STARTED |
| **Приоритет** | 🟠 HIGH |
| **Описание** | В `/admin/settings` есть три настройки: `cookie.noticeEnabled`, `cookie.noticeText`, `cookie.buttonText`. Однако `CookieBanner.tsx` полностью хардкодит текст и не проверяет `noticeEnabled`. Если администратор отключит баннер через настройки — он продолжит показываться. Если изменит текст — изменения не применятся. |
| **Файлы (frontend)** | `apps/frontend/src/components/CookieBanner.tsx`, `apps/frontend/src/components/CookieBannerGate.tsx` |
| **Как исправить** | Получать настройки cookie из `GET /api/admin/site-config` (или создать публичный endpoint `GET /api/config/cookie`) и условно показывать баннер на основе `noticeEnabled`, а также использовать `noticeText` и `buttonText`. Рекомендуется server-side пропсы через `CookieBannerGate`. |
| **Зависимости** | Backend должен иметь публичный endpoint для cookie-настроек (проверить наличие) |

---

## EPIC-4: Загрузка изображений

---

### TASK-4.1 — Admin UI: загрузка изображений для события

| Поле | Значение |
|------|----------|
| **ID** | TASK-4.1 |
| **Статус** | ❌ NOT STARTED |
| **Приоритет** | 🟠 HIGH |
| **Описание** | У событий есть поле `images` в Prisma-схеме и в API-ответах (`eventCardUrl`, `thumbnailUrl`, `originalUrl`). Однако в форме создания и редактирования события в admin нет ни одного поля для загрузки изображения. Изображения попадают только через MAX-импорт. Ручные события создаются без изображения. |
| **Файлы (frontend)** | `apps/frontend/src/app/admin/events/new/page.tsx`, `apps/frontend/src/app/admin/events/[id]/page.tsx` |
| **Файлы (backend)** | Нет upload endpoint — нужно создать `POST /events/admin/:id/images` |
| **Как исправить** | 1. Создать backend endpoint для загрузки файла (multipart/form-data) с сохранением в файловое хранилище и записью URL в `EventImage`. 2. Добавить компонент загрузки изображения в форму события. |
| **Зависимости** | Решение по хранилищу (local disk / S3 / Timeweb Object Storage) |

---

## EPIC-5: Аналитика

---

### TASK-5.1 — Backend: реализовать AnalyticsModule

| Поле | Значение |
|------|----------|
| **ID** | TASK-5.1 |
| **Статус** | 🔄 IN PROGRESS (заглушка) |
| **Приоритет** | 🟡 MEDIUM |
| **Описание** | `AnalyticsController` содержит только health endpoint. `AnalyticsService` полностью пуст. Prisma-схема имеет модели `EventView` и `SiteVisit`, но записи в них не создаются нигде в коде. |
| **Файлы (backend)** | `apps/backend/src/modules/analytics/analytics.controller.ts`, `analytics.service.ts` |
| **Как исправить** | 1. Добавить `POST /analytics/view` (или internal endpoint) принимающий `{ eventId }`. 2. Реализовать запись в `EventView`. 3. Опционально: добавить `GET /analytics/events/:id` для admin. |
| **Зависимости** | TASK-5.2 |

---

### TASK-5.2 — Frontend: отправка аналитики просмотра события

| Поле | Значение |
|------|----------|
| **ID** | TASK-5.2 |
| **Статус** | ❌ NOT STARTED |
| **Приоритет** | 🟡 MEDIUM |
| **Описание** | Страница `/events/[id]` не отправляет никаких аналитических событий. Яндекс.Метрика подключена глобально (счётчик 110270689), но кастомные цели (просмотр события, клик «Зарегистрироваться», клик «Напомнить») не реализованы. |
| **Файлы (frontend)** | `apps/frontend/src/app/events/[id]/page.tsx`, `apps/frontend/src/components/events/EventDetailActions.tsx` |
| **Как исправить** | 1. После реализации TASK-5.1 добавить вызов `/analytics/view` при загрузке страницы события. 2. Добавить `ym(ID, 'reachGoal', 'event_view')` и `ym(ID, 'reachGoal', 'reminder_click')` в Яндекс.Метрику. |
| **Зависимости** | TASK-5.1 |

---

## EPIC-6: Боты — надёжность

---

### TASK-6.1 — Telegram Bot: команда /cancel

| Поле | Значение |
|------|----------|
| **ID** | TASK-6.1 |
| **Статус** | ❌ NOT STARTED |
| **Приоритет** | 🟡 MEDIUM |
| **Описание** | В Telegram-боте нет обработчика команды `/cancel`. Пользователь, начавший создание напоминания, не может отменить процесс — он застрянет в ожидании ввода даты. |
| **Файлы** | `apps/bots/src/telegram/bot.ts` |
| **Как исправить** | Добавить хендлер `/cancel` который сбрасывает состояние пользователя из in-process Map и отправляет подтверждение отмены. |
| **Зависимости** | Нет |

---

### TASK-6.2 — MAX Bot: команда /cancel и /help

| Поле | Значение |
|------|----------|
| **ID** | TASK-6.2 |
| **Статус** | ❌ NOT STARTED |
| **Приоритет** | 🟡 MEDIUM |
| **Описание** | MAX-бот не обрабатывает `/cancel` и `/help`. Аналогично TASK-6.1. Также принятие оферты реализовано через текст «Принимаю» вместо inline-кнопки (MAX поддерживает кнопки). |
| **Файлы** | `apps/bots/src/max/bot.ts` |
| **Как исправить** | Добавить хендлеры `/cancel`, `/help`. Рассмотреть замену текстового «Принимаю» на inline-кнопку аналогично Telegram. |
| **Зависимости** | Нет |

---

### TASK-6.3 — Персистентность состояния ботов

| Поле | Значение |
|------|----------|
| **ID** | TASK-6.3 |
| **Статус** | ❌ NOT STARTED |
| **Приоритет** | 🟡 MEDIUM |
| **Описание** | Состояние пользователей в обоих ботах хранится в in-process `Map`. При перезапуске сервера (деплой, crash) все активные диалоги теряются. Пользователь, ожидавший ввода даты напоминания, должен начинать заново без объяснения причины. |
| **Файлы** | `apps/bots/src/telegram/bot.ts`, `apps/bots/src/max/bot.ts` |
| **Как исправить** | Перенести хранение состояния в Redis (уже используется для Bull). Ключ: `bot_state:<channel>:<externalId>`, TTL: 1 час. |
| **Зависимости** | Redis уже подключён в проекте |

---

## EPIC-7: Производительность и инфраструктура

---

### TASK-7.1 — Middleware: кэширование проверки maintenance

| Поле | Значение |
|------|----------|
| **ID** | TASK-7.1 |
| **Статус** | ❌ NOT STARTED |
| **Приоритет** | 🟠 HIGH |
| **Описание** | `middleware.ts` делает HTTP-запрос к `GET /api/admin/site-status` на КАЖДЫЙ запрос к сайту (включая все CSS/JS chunk-ы Next.js). При высокой нагрузке или медленном backend это создаёт cascade-задержки. В коде есть комментарий `TODO: add caching`. |
| **Файлы** | `apps/frontend/src/middleware.ts` |
| **Как исправить** | Кэшировать результат в Edge runtime через `waitUntil` + глобальную переменную с TTL 30 секунд, или через `cookies()` с timestamp последней проверки. Альтернатива: использовать Vercel Edge Config / Next.js `unstable_cache`. |
| **Зависимости** | Нет |

---

### TASK-7.2 — Maintenance page: метаданные

| Поле | Значение |
|------|----------|
| **ID** | TASK-7.2 |
| **Статус** | ❌ NOT STARTED |
| **Приоритет** | 🟢 LOW |
| **Описание** | `apps/frontend/src/app/maintenance/page.tsx` — `force-dynamic`, но `metadata` не задана. Заголовок вкладки браузера — дефолтный Next.js. |
| **Файлы** | `apps/frontend/src/app/maintenance/page.tsx` |
| **Как исправить** | Добавить `generateMetadata` с title из `siteConfig.maintenance.title` или хардкод «Технические работы — АБ Афиша». |
| **Зависимости** | Нет |

---

## EPIC-8: Безопасность

---

### TASK-8.1 — Санитизация HTML в fullDescription

| Поле | Значение |
|------|----------|
| **ID** | TASK-8.1 |
| **Статус** | ❌ NOT STARTED |
| **Приоритет** | 🟠 HIGH |
| **Описание** | `apps/frontend/src/app/events/[id]/page.tsx` рендерит `fullDescription` через `dangerouslySetInnerHTML`. Контент пишется через admin-панель, XSS-риск низкий, но не нулевой (скомпрометированный admin-аккаунт). |
| **Файлы** | `apps/backend/src/modules/events/events.service.ts` (при сохранении), `apps/frontend/src/app/events/[id]/page.tsx` |
| **Как исправить** | Добавить server-side санитизацию при сохранении `fullDescription` в backend (библиотека `sanitize-html` или `DOMPurify` на node). Разрешить только безопасный HTML: `b`, `i`, `ul`, `ol`, `li`, `p`, `br`, `a` (без `javascript:`). |
| **Зависимости** | Нет |

---

### TASK-8.2 — Валидация длины BOT_INTERNAL_TOKEN при старте

| Поле | Значение |
|------|----------|
| **ID** | TASK-8.2 |
| **Статус** | ❌ NOT STARTED |
| **Приоритет** | 🟢 LOW |
| **Описание** | ADR-010 требует `BOT_INTERNAL_TOKEN` минимум 32 символа. Backend стартует без этой валидации — при случайной конфигурации с коротким токеном безопасность bot→backend канала нарушена. |
| **Файлы** | `apps/backend/src/main.ts` или config validation module |
| **Как исправить** | Добавить `Joi`/`zod` валидацию в NestJS `ConfigModule.forRoot({ validationSchema })`. Приложение должно падать при старте если токен < 32 символов. |
| **Зависимости** | Нет |

---

## EPIC-9: Публичный сайт — UX и Legal

---

### TASK-9.1 — HowItWorksBlock и RemindersBlock — уточнить статус

| Поле | Значение |
|------|----------|
| **ID** | TASK-9.1 |
| **Статус** | 🔄 IN PROGRESS (компоненты есть, не рендерятся) |
| **Приоритет** | 🟡 MEDIUM |
| **Описание** | `HowItWorksBlock.tsx` и `RemindersBlock.tsx` существуют в `apps/frontend/src/components/` но НЕ импортируются на главной странице `/`. Согласно PR #36 эти блоки были удалены из главной страницы. Компоненты — orphaned dead code. |
| **Файлы** | `apps/frontend/src/components/HowItWorksBlock.tsx`, `apps/frontend/src/components/RemindersBlock.tsx` |
| **Как исправить** | Требует решения: (а) удалить оба файла если блоки убраны по ТЗ; (б) вернуть на страницу если ТЗ требует их наличия. **Ожидает подтверждения от заказчика.** |
| **Зависимости** | Решение заказчика |

---

### TASK-9.2 — noscript fallback для CookieBanner

| Поле | Значение |
|------|----------|
| **ID** | TASK-9.2 |
| **Статус** | ❌ NOT STARTED |
| **Приоритет** | 🟢 LOW |
| **Описание** | При отключённом JS пользователь не видит cookie-уведомление. Яндекс.Метрика работает через noscript-img (пиксель), но согласие на cookies не показывается. Потенциальная проблема соответствия 152-ФЗ. |
| **Файлы** | `apps/frontend/src/components/CookieBanner.tsx` или `apps/frontend/src/app/layout.tsx` |
| **Как исправить** | Добавить `<noscript>` с текстовым уведомлением об использовании cookies в `layout.tsx`. |
| **Зависимости** | Нет |

---

## СВОДНАЯ ТАБЛИЦА

| ID | Название | Приоритет | Статус | EPIC |
|----|----------|-----------|--------|------|
| TASK-1.1 | Admin: CRUD городов | 🟡 MEDIUM | ❌ | Admin Справочники |
| TASK-1.2 | Admin: CRUD направлений | 🟡 MEDIUM | ❌ | Admin Справочники |
| TASK-1.3 | Admin: подписчики ботов | 🟡 MEDIUM | ❌ | Admin Справочники |
| TASK-2.1 | Admin: логи MAX-импорта | 🟡 MEDIUM | 🔄 | Admin Логи |
| TASK-2.2 | Admin: история версий события | 🟢 LOW | 🔄 | Admin Логи |
| TASK-3.1 | CookieBanner читает настройки | 🟠 HIGH | ❌ | Cookie |
| TASK-4.1 | Admin: загрузка изображений | 🟠 HIGH | ❌ | Изображения |
| TASK-5.1 | Backend: AnalyticsModule | 🟡 MEDIUM | 🔄 | Аналитика |
| TASK-5.2 | Frontend: аналитика просмотров | 🟡 MEDIUM | ❌ | Аналитика |
| TASK-6.1 | Telegram Bot: /cancel | 🟡 MEDIUM | ❌ | Боты |
| TASK-6.2 | MAX Bot: /cancel, /help | 🟡 MEDIUM | ❌ | Боты |
| TASK-6.3 | Боты: Redis state persistence | 🟡 MEDIUM | ❌ | Боты |
| TASK-7.1 | Middleware: кэш maintenance | 🟠 HIGH | ❌ | Инфраструктура |
| TASK-7.2 | Maintenance: metadata | 🟢 LOW | ❌ | Инфраструктура |
| TASK-8.1 | HTML санитизация fullDescription | 🟠 HIGH | ❌ | Безопасность |
| TASK-8.2 | Валидация BOT_INTERNAL_TOKEN | 🟢 LOW | ❌ | Безопасность |
| TASK-9.1 | HowItWorksBlock / RemindersBlock | 🟡 MEDIUM | 🔄 | Публичный сайт |
| TASK-9.2 | noscript CookieBanner fallback | 🟢 LOW | ❌ | Публичный сайт |

---

## ПОДТВЕРЖДЕНО КАК ГОТОВО (не требует изменений)

| Экран / Feature | Статус |
|----------------|--------|
| Главная страница `/` — структура, API-вызовы, метатеги | ✅ |
| EventFilters — 4 фильтра, сброс | ✅ |
| EventCard — полная реализация | ✅ |
| EventDetailPage — все секции, CTA-кнопки | ✅ |
| Footer — 5 юридических ссылок, реквизиты юрлица | ✅ |
| Legal pages — 5 слагов, fallback | ✅ |
| Maintenance mode — middleware + страница | ✅ |
| Admin login — форма, JWT, редирект | ✅ |
| Admin dashboard — 8 метрик, таблицы | ✅ |
| Admin events — список, фильтры, форма | ✅ |
| Admin quotes — полный CRUD | ✅ |
| Admin broadcasts — список, новая, детальная + логи | ✅ |
| Admin legal — CRUD документов | ✅ |
| Admin settings — 13 настроек | ✅ |
| Admin sidebar — 6 пунктов | ✅ |
| Telegram bot — /start, deep-link, reminder flow | ✅ |
| MAX bot — /start, deep-link, reminder flow | ✅ |
| Unsubscribe — оба бота | ✅ |
| Broadcast processor — BR-031, rate-limit, очередь | ✅ |
| QuotesModule backend — GET /quotes/public | ✅ |
| BroadcastProcessor — все 3 условия BR-031 | ✅ |

---

*Документ создан автоматически по результатам аудита 2026-07-08. Обновлять при закрытии задач.*
