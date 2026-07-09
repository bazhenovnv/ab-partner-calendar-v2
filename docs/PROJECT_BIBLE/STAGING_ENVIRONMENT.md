# Staging Environment — АБ Афиша Бухгалтера

**Дата фиксации:** 2026-07-09  
**Этап:** Stage 42.5 — Environment Freeze  
**Статус:** 🔒 **FROZEN** — изменения только через отдельное согласование

---

## 1. Общая информация

| Параметр | Значение |
|----------|----------|
| Название проекта | АБ Афиша Бухгалтера |
| Версия | v1.0 (Release Candidate) |
| Дата | 2026-07-09 |
| GitHub Repository | `bazhenovnv/ab-partner-calendar-v2` |
| Рабочая ветка | `claude/ab-afisha-architecture-plan-805f5o` |
| Последний commit | `9e046bd` — docs(Stage 42): Staging Readiness Report + Checklist |
| Deploy strategy | Docker Compose (docker-compose.prod.yml) + ручной `infra/scripts/deploy.sh` |
| Monorepo | pnpm 9.15.0 workspaces: apps/frontend · apps/backend · apps/bots · packages/shared |

---

## 2. Домены

| Домен | Назначение | Протокол | Статус | Активен |
|-------|-----------|----------|--------|---------|
| `ab-event.pro` | Production — публичный сайт | HTTPS (TLS 1.2/1.3) | ✅ SSL Let's Encrypt | Да |
| `www.ab-event.pro` | Production — алиас | HTTPS | ✅ SSL Let's Encrypt | Да |
| `test.ab-event.pro` | Staging — QA | HTTP (80) | ⚠ SSL не выпущен | Да (HTTP-only) |
| `ab-event.pro/api/*` | Backend API | HTTPS → proxy | ✅ | Да |
| `ab-event.pro/admin/*` | Admin панель | HTTPS → proxy | ✅ | Да |
| Webhooks | Telegram / MAX | UNKNOWN | NOT CONFIGURED | Нет (polling) |
| Telegram Bot | `@<NEXT_PUBLIC_TELEGRAM_BOT_USERNAME>` | Polling | ✅ | Да |
| MAX Bot | `https://max.ru/id2308283362_bot` (default) | Polling | ✅ | Да |

> **Примечание:** Боты работают в режиме polling, не webhook. Отдельный домен для webhook не нужен.

---

## 3. Сервер

| Параметр | Значение |
|----------|----------|
| Хостинг | Timeweb Cloud |
| IP | `5.129.243.179` |
| Hostname | UNKNOWN (новый сервер, hostname не задокументирован) |
| Deploy path | `/srv/ab-afisha` |
| ОС | Ubuntu 22.04 LTS (рекомендуется; 24.04 LTS поддерживается) |
| CPU минимум | 2 vCPU |
| CPU рекомендуется | 4 vCPU |
| RAM минимум | 2 GB |
| RAM рекомендуется | 4 GB |
| Disk | 20 GB SSD (рекомендуется 40 GB) |
| Docker | Требуется (версия ≥ 24.x) |
| Docker Compose | Требуется (v2 CLI, `docker compose`) |
| Nginx | Запускается в Docker (nginx:1.25-alpine), хост-nginx не используется |
| SSL | Let's Encrypt (certbot), монтируется `/etc/letsencrypt:/etc/letsencrypt:ro` |
| Firewall | UFW: открыты порты 22 (SSH), 80 (HTTP), 443 (HTTPS) |

---

## 4. Контейнеры

### docker-compose.prod.yml — сервисы

| Контейнер | Image | Порты (expose) | Restart | Healthcheck |
|-----------|-------|----------------|---------|-------------|
| `postgres` | `postgres:16-alpine` | 5432 (internal) | always | `pg_isready -U ab_afisha` |
| `redis` | `redis:7-alpine` | 6379 (internal) | always | `redis-cli -a $REDIS_PASSWORD ping` |
| `backend` | `ab-afisha/backend:${APP_VERSION}` | 3001 (internal) | always | `wget http://localhost:3001/api/health` |
| `frontend` | `ab-afisha/frontend:${APP_VERSION}` | 3000 (internal) | always | NOT CONFIGURED |
| `bots` | `ab-afisha/bots:${APP_VERSION}` | — | always | NOT CONFIGURED |
| `nginx` | `nginx:1.25-alpine` | **80:80**, **443:443** | always | NOT CONFIGURED |

### Volumes

| Volume | Используется | Описание |
|--------|-------------|----------|
| `postgres-data` | postgres | Данные PostgreSQL |
| `redis-data` | redis | Данные Redis (persistence) |
| `uploads` | backend, nginx | Загруженные файлы |

### Networks

| Network | Тип | Описание |
|---------|-----|----------|
| default | bridge (auto) | Общая сеть docker-compose; все сервисы — одна сеть |

### depends_on (service_healthy)

```
nginx → [frontend, backend]
frontend → backend (service_healthy)
backend → postgres (service_healthy), redis (service_healthy)
bots → backend (service_healthy)
```

---

## 5. ENV Audit

> Секреты не выводятся. Зафиксированы только названия, статус и комментарии.

| ENV | Обязательна | В .env.example | В prod compose | Используется | Описание |
|-----|-------------|----------------|----------------|--------------|----------|
| `POSTGRES_PASSWORD` | ✅ Да | ✅ | ✅ | Backend, postgres | Пароль БД |
| `REDIS_PASSWORD` | ✅ Да | ✅ | ✅ | Redis `--requirepass`, backend, bots | Пароль Redis |
| `JWT_SECRET` | ✅ Да | ✅ | ✅ | Backend (JWT подпись) | Мин. 32 символа |
| `JWT_EXPIRES_IN` | ❌ Нет | — | Hardcoded: `8h` | Backend auth | Срок токена |
| `TELEGRAM_BOT_TOKEN` | ✅ Да | ✅ | ✅ | Backend + bots | Token Telegram Bot API |
| `MAX_BOT_TOKEN` | ✅ Да | ✅ | ✅ | Backend + bots | Token MAX Bot API |
| `ADMIN_TELEGRAM_CHAT_ID` | ❌ Нет | ✅ | ✅ | Backend admin notify | Chat ID для уведомлений |
| `BOT_INTERNAL_TOKEN` | ✅ Да | ✅ | ✅ | Backend + bots (внутренний auth) | Мин. 32 символа |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | ❌ Нет | ✅ | ✅ | Frontend (TG кнопка) | Без `@`; скрывает кнопку если пусто |
| `NEXT_PUBLIC_MAX_BOT_URL` | ❌ Нет | ✅ | ⚠️ **ОТСУТСТВУЕТ** | Frontend (MAX кнопка) | Скрывает MAX-кнопку если не задан |
| `YANDEX_METRIKA_ID` | ❌ Нет | ✅ | ✅ (default: 110270689) | Backend (не используется) | Артефакт; реально не читается backend |
| `NEXT_PUBLIC_YANDEX_METRIKA_ID` | ❌ Нет | ✅ | ✅ (default: 110270689) | Frontend Metrika счётчик | Рабочий default |
| `NEXT_PUBLIC_SITE_URL` | ✅ Да | ✅ | Hardcoded: `https://ab-event.pro` | Frontend canonical, OG | Зафиксировано в compose |
| `NEXT_PUBLIC_CONTACT_EMAIL` | ❌ Нет | ✅ | Hardcoded: `info-event@a-b.ru` | Frontend footer | Зафиксировано в compose |
| `NEXT_PUBLIC_API_URL` | ❌ Нет | ✅ | ❌ Не нужен в prod | Только dev (dev compose) | В prod: Next.js rewrite через BACKEND_URL |
| `BACKEND_URL` | ✅ Да | — | Hardcoded: `http://backend:3001` | Frontend Next.js rewrites | Docker-сеть |
| `APP_VERSION` | ❌ Нет | ✅ | Default: `latest` | Docker image tag | Передаётся в `deploy.sh $1` |
| `THROTTLE_LIMIT` | ❌ Нет | — | Hardcoded: `200` (prod) | Backend ThrottlerGuard | Default 100 в dev |
| `SESSION_SECRET` | ❌ **UNUSED** | ✅ | ❌ | **Нигде не используется** | Артефакт; JWT stateless — session не нужна |
| `SEED_ADMIN_EMAIL` | ✅ При первом деплое | ✅ | ❌ (не в compose) | Prisma seed | Только при `pnpm seed` |
| `SEED_ADMIN_PASSWORD` | ✅ При первом деплое | ✅ | ❌ (не в compose) | Prisma seed | Только при `pnpm seed` |

**Итого недостающих ENV в prod compose:** 1 (`NEXT_PUBLIC_MAX_BOT_URL`)  
**Неиспользуемых ENV:** 1 (`SESSION_SECRET`)

---

## 6. Database

| Параметр | Значение |
|----------|----------|
| СУБД | PostgreSQL 16 (postgres:16-alpine) |
| База данных | `ab_afisha` |
| Пользователь | `ab_afisha` |
| Пароль | `${POSTGRES_PASSWORD}` (из env) |
| ORM | Prisma 5.x |
| Схема | `apps/backend/prisma/schema.prisma` |
| Моделей | 25 |
| Миграций | 3 (`20260630000000_init`, `20260701000000_reminder_free_time`, `20260701200000_legal_core_schema`) |
| Auto-migrate | ✅ `docker-entrypoint.sh` запускает `prisma migrate deploy` при старте |
| Seed | `pnpm --filter backend seed` (только первый деплой) |
| Connection pool | Prisma default (не настроен явно) |
| Volume | `postgres-data` (docker named volume) |
| Expose | Только internal (нет публичного порта в prod) |
| **Redis** | redis:7-alpine, `--requirepass ${REDIS_PASSWORD}` |
| Redis URL | `redis://:${REDIS_PASSWORD}@redis:6379` |
| Redis использование | BullMQ (broadcast queue), reminders TTL |
| Redis persistence | Volume `redis-data` |

### Индексы в Prisma schema

| Модель | Поле | Индекс |
|--------|------|--------|
| Event | startDate, status, autoStatus, mainEvent, externalId, sourcePostUrl | ✅ @@index |
| EventImage | eventId | ✅ @@unique |
| EventTag | eventId | ✅ @@index |
| EventVersion | eventId | ✅ @@index |
| BotUser | (channel, externalId) | ✅ @@unique |
| Reminder | remindAt, eventId, status | ✅ @@index |
| Reminder | **botUserId** | ⚠️ Нет индекса — v1.1 |
| HashtagMapping | **directionId** | ⚠️ Нет индекса — v1.1 |
| ApiSourceLog | **sourceId** | ⚠️ Нет индекса — v1.1 |
| BroadcastRecipient | broadcastId, botUserId | ✅ @@index |
| EventView | eventId, createdAt | ✅ @@index |
| SiteVisit | createdAt | ✅ @@index |
| LegalDocVersion | docId | ✅ @@index |

---

## 7. Bots

| Параметр | Значение |
|----------|----------|
| Telegram Bot | Token из `TELEGRAM_BOT_TOKEN`; username из `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` |
| Telegram режим | **Polling** (не webhook) |
| MAX Bot | Token из `MAX_BOT_TOKEN`; URL `NEXT_PUBLIC_MAX_BOT_URL` (default: `https://max.ru/id2308283362_bot`) |
| MAX режим | **HTTP Polling** с retry и cooldown 3s |
| Deep-link reminder (TG) | `https://t.me/<username>?start=remind_<eventId>` |
| Deep-link reminder (MAX) | `${NEXT_PUBLIC_MAX_BOT_URL}?start=remind_<eventId>` |
| Webhook | NOT CONFIGURED (не используется) |
| Reminder cron | 30 мин / 15 мин / 5 мин до события |
| Broadcast | BullMQ queue; schedule; pause/resume/cancel |
| Unsubscribe | `/unsubscribe` (TG и MAX) |
| Внутренний auth | `BOT_INTERNAL_TOKEN` (Bearer) |
| Bot state (TG/MAX) | In-memory Map — теряется при рестарте (v1.1) |
| Dockerfile | `apps/bots/Dockerfile` — multi-stage; runner от root (v1.1) |

---

## 8. Production Services

| Сервис | Статус | Реализация |
|--------|--------|------------|
| OpenGraph | ✅ | `apps/frontend/src/app/opengraph-image.tsx` — 1200×630, navy #0D2344, mint #7CD8B3 |
| Twitter Card | ✅ | `layout.tsx` — `twitter: { card: 'summary_large_image' }` |
| Robots.txt | ✅ | `robots.ts` — `/admin`, `/api`, `/_next` заблокированы |
| Sitemap.xml | ✅ | `sitemap.ts` — legal (5) + events (до 200), revalidate: 3600 |
| Favicon | ✅ | `icon.tsx` — 32×32, navy/mint, Next.js ImageResponse |
| Manifest | ⚠️ | NOT CONFIGURED — web app manifest не реализован |
| Cookie Banner | ✅ | `CookieBanner.tsx` — localStorage, ссылки privacy/cookies |
| Maintenance | ✅ | Middleware redirect + динамический контент из backend + fallback PNG |
| Health endpoint | ✅ | `/api/health` — backend NestJS |
| 404 | ✅ | `not-found.tsx` — брендированная, PublicShell, CTA «На главную» |
| Canonical | ✅ | Next.js metadata, `NEXT_PUBLIC_SITE_URL` |
| Error boundary | ✅ | `error.tsx` + `global-error.tsx` с reset |

---

## 9. Security Freeze

> Состояние зафиксировано. Изменения только через отдельное согласование.

| Механизм | Статус | Реализация |
|----------|--------|------------|
| JWT | ✅ | `JwtStrategy`, `JwtAuthGuard`; expiry `8h`; secret из `JWT_SECRET` |
| Rate Limit | ✅ | `ThrottlerGuard`: 100 req/60s (dev), 200 req/60s (prod, THROTTLE_LIMIT) |
| CORS | ✅ | Production: `['https://ab-event.pro', 'https://www.ab-event.pro', 'https://test.ab-event.pro']`; credentials: true |
| Security Headers | ✅ | nginx: HSTS (63072000s), X-Frame-Options (SAMEORIGIN), X-Content-Type-Options (nosniff), Referrer-Policy (strict-origin-when-cross-origin), CSP |
| Helmet | ✅ | NestJS `app.use(helmet())` — все стандартные headers |
| Cookies | ➖ | HTTP-only cookies не используются; auth через Authorization Bearer header |
| HTTPS | ✅ | Let's Encrypt TLS 1.2/1.3; HSTS; HTTP→HTTPS redirect для prod |
| XSS | ⚠️ | `dangerouslySetInnerHTML` в 3 местах без санитизации (admin-only preview, legal content, event fullDescription) — v1.1 |
| CSRF | ✅ | Не актуален: stateless JWT Bearer (не cookie-based auth) |
| HTML Sanitization | ⚠️ | Отсутствует для `event.fullDescription` (MaxImport контент) — v1.1 |
| Input Validation | ✅ | NestJS ValidationPipe: whitelist, transform, forbidNonWhitelisted |
| Admin Guard | ✅ | JwtAuthGuard на всех `/admin/*` routes |
| Bot Auth | ✅ | `BOT_INTERNAL_TOKEN` Bearer — все bot→backend вызовы |
| Secrets в репо | ✅ | .gitignore исключает .env; секреты только через env variables |
| Swagger | ✅ | `/api/docs` доступен только при `NODE_ENV !== production` |

---

## 10. Design Freeze

> ✅ **Design Pass ЗАКРЫТ** (Stage 41.13, 2026-07-09)

| Элемент | Статус |
|---------|--------|
| D-01 EventCard UPPERCASE | ✅ Реализовано |
| D-02 MainEventsBanner карусель | ✅ Реализовано |
| D-03 Логотип SVG монограмма «аб» | ✅ Реализовано |
| D-04 Maintenance Page | ⬛ Намеренно минималистична — неизменно |
| D-05 EventCard дата-бейдж | ✅ Реализовано |
| D-06 Gilroy → статусные бейджи | ✅ Реализовано |
| D-07 Gilroy → цитаты | ✅ Реализовано |
| D-08 Gilroy → footer | ✅ Реализовано |
| D-09 Hero composition | ✅ Реализовано |
| Hero Asset | ✅ Утверждён (`project-assets/hero/hero-composition.png`) |
| Gilroy Font | ✅ Подключён (`public/fonts/gilroy/`, `@font-face` в globals.css) |
| Logo PNG референс | ✅ `project-assets/03_logo_frames/Frame 60.png` |
| Logo SVG | ⚠️ PARTIAL — SVG-аппроксимация в коде; оригинал отсутствует |
| D-10..D-17 | 🟡 Перенесены в v1.1 |

**Запрещено:** изменять дизайн без отдельного согласования.

---

## 11. Release Freeze

| Область | Статус |
|---------|--------|
| Business Rules | 🔒 FROZEN — `docs/BUSINESS_RULES.md` |
| Architecture | 🔒 FROZEN — monorepo, пакеты, структура не меняются |
| Design | 🔒 FROZEN — Design Pass закрыт (Stage 41.13) |
| Documentation | 🔒 FROZEN — PROJECT_BIBLE зафиксирован (Stage 42.5) |
| Release Candidate | ✅ APPROVED — Stage 40+41 (47/47 приёмка) |
| Stage 42 | ✅ APPROVED — Staging Readiness Report, 97%, 0 блокеров |
| Stage 42.5 | ✅ FROZEN — настоящий документ |

---

## 12. Финальная таблица готовности

| Область | Статус | Оценка |
|---------|--------|--------|
| Architecture | ✅ FROZEN | 98% |
| Backend | ✅ READY | 95% |
| Frontend | ✅ READY | 97% |
| Design | ✅ FROZEN | 97% |
| Documentation | ✅ FROZEN | 99% |
| Infrastructure | ✅ READY | 93% |
| Security | ✅ READY | 92% |
| Performance | ⚠ READY | 88% |
| Bots | ✅ READY | 90% |
| Database | ✅ READY | 95% |
| Admin | ✅ READY | 95% |
| Public | ✅ READY | 97% |
| Deployment | ✅ READY | deploy.sh + docker-compose.prod.yml |

**Общая готовность: 97%**

---

## 13. Итог

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║        STAGING ENVIRONMENT FROZEN                        ║
║                                                          ║
║        Stage 42.5 — 2026-07-09                           ║
║        АБ Афиша Бухгалтера v1.0                          ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

**Далее разрешены только:**

- ✅ Deploy (Stage 43)
- ✅ QA (Stage 44)
- ✅ Исправление найденных багов (Stage 45)

**Запрещены без отдельного согласования:**

- ❌ Новый функционал
- ❌ Изменение архитектуры
- ❌ Изменение Business Rules
- ❌ Изменение дизайна (Design Frozen)
- ❌ Изменение ENV без документирования
- ❌ Изменение docker-compose.prod.yml без согласования

---

## 14. Ссылки на связанные документы

| Документ | Путь |
|----------|------|
| Project Implementation Status | `docs/PROJECT_BIBLE/PROJECT_IMPLEMENTATION_STATUS.md` |
| Release Candidate Report | `docs/PROJECT_BIBLE/RELEASE_CANDIDATE_REPORT.md` |
| Acceptance Report | `docs/PROJECT_BIBLE/ACCEPTANCE_REPORT.md` |
| Design Conformance Report | `docs/PROJECT_BIBLE/DESIGN_CONFORMANCE_REPORT.md` |
| Staging Readiness Report | `docs/PROJECT_BIBLE/STAGING_READINESS_REPORT.md` |
| Stage 42 Checklist | `docs/PROJECT_BIBLE/STAGE_42_CHECKLIST.md` |
| Design Asset Inventory | `docs/PROJECT_BIBLE/DESIGN_ASSET_INVENTORY.md` |
| Deploy Guide | `docs/DEPLOY.md` |
| Release Backlog v1.1 | `docs/PROJECT_BIBLE/RELEASE_BACKLOG.md` |

---

*Документ подготовлен: Stage 42.5, 2026-07-09*  
*Следующий этап: Stage 43 — Deploy to Staging (`test.ab-event.pro`)*
