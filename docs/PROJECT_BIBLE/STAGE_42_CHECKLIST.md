# Stage 42 — Staging Checklist

**Дата:** 2026-07-09  
**Ветка:** `claude/ab-afisha-architecture-plan-805f5o`  
**Аудитор:** Claude Code  

Статусы: ✅ Проверено / ⚠ Замечание / ❌ Блокер / ➖ Не применимо

---

## Build

✅ Frontend build  
✅ Backend build  
✅ Typecheck (frontend, 0 ошибок)  
➖ Lint (не настроен как отдельный CI-шаг; typecheck покрывает типовые ошибки)  
✅ Smoke tests (26/26 frontend · 45/45 backend · 3 bots)  

---

## Public

✅ Header  
✅ Hero  
✅ Footer  
✅ Calendar  
✅ Event Cards  
✅ Main Events Banner  
✅ Quotes  
✅ Cookie Banner  
✅ Maintenance  
✅ 404  
✅ OpenGraph (1200×630, navy/mint, Next.js ImageResponse)  
✅ Robots (`/admin`, `/api`, `/_next` заблокированы)  
✅ Sitemap (legal + динамические события, revalidate: 3600)  
⚠ Manifest (web app manifest не реализован; не блокирует staging)  
✅ Canonical (Next.js metadata)  
✅ SEO Metadata (title, description, og:title, og:description, per-event)  

---

## Admin

✅ Login (JWT, redirect при отсутствии токена)  
✅ Dashboard (stats, needs-attention, upcoming, recent broadcasts)  
✅ Events (список, фильтры, поиск, пагинация, NEEDS_ATTENTION)  
✅ Quotes (CRUD, sortOrder, toggle)  
✅ Cities (CRUD, search, pagination, toggle, soft-delete)  
✅ Directions (CRUD, slug-валидация, search, pagination)  
✅ Broadcast (список, создание/редактирование, test-send, schedule, stats)  
✅ Settings (SiteConfig по 5 группам)  
✅ Legal (5 типов, версионирование, publish, preview)  

---

## Bots

✅ Telegram (/start, legal, phone, /help, /unsubscribe)  
✅ MAX (/start, legal, phone, /unsubscribe, HTTP polling)  
✅ Reminder (cron 30/15/5 мин, deep-link)  
✅ Broadcast (BullMQ queue, test-send, schedule, pause/resume/cancel)  

---

## Infrastructure

✅ Docker (multi-stage builds; frontend non-root; backend/bots root — v1.1)  
✅ Docker Compose prod (restart: always, depends_on: service_healthy)  
✅ Nginx (HTTPS, proxy_pass, caching)  
⚠ SSL (ab-event.pro: ✅ Let's Encrypt; test.ab-event.pro: HTTP only, нет TLS — известно)  
✅ ENV (все обязательные присутствуют; замечание по NEXT_PUBLIC_MAX_BOT_URL)  
✅ Healthcheck (postgres, redis, backend с start_period)  
✅ Logs (stdout/stderr в контейнерах)  
✅ Backup (backup.sh: pg_dump + uploads, ротация 14 дней)  

---

## Database

✅ Prisma schema (25 моделей, relations, enums)  
✅ Migration (3 файла; entrypoint автодеплой `prisma migrate deploy`)  
✅ Seed (admin user, quotes)  
⚠ Indexes (Reminder.botUserId, HashtagMapping.directionId, ApiSourceLog.sourceId без @@index — v1.1)  
✅ Relations (cascade/restrict корректно)  
✅ Redis (prod: --requirepass; dev: без пароля — ожидаемо)  
➖ Connection Pool (Prisma default; достаточно при текущей нагрузке)  

---

## Performance

➖ Lighthouse Desktop (требует живого сервера; не применимо в статическом аудите)  
➖ Lighthouse Mobile (аналогично)  
➖ Core Web Vitals (аналогично)  
✅ Bundle (output: standalone; Next.js оптимизированная сборка)  
✅ Images (next/image, webp+avif, remotePatterns)  
✅ Fonts (Gilroy woff2 + woff, font-display: swap)  
✅ Next Image (оптимизация на лету)  
⚠ Compression (nginx: gzip не настроен — замечание, не блокер)  
✅ Caching (/_next/static: 1y immutable; /uploads: 30d)  

---

## Responsive

✅ Desktop (1440px — проверено визуально)  
✅ Laptop (~1280px — Tailwind tablet: breakpoint)  
⚠ Tablet (1024px — частичная адаптация; RC-B: ~80%)  
⚠ Mobile (390px — Hero visual скрыт; фильтры частично)  

---

## Final

✅ **Ready for Staging**

---

*Checklist составлен: Stage 42, 2026-07-09*
