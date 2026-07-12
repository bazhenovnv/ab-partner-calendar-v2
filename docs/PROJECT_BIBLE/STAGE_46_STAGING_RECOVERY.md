# Stage 46.2 — Staging Recovery Checklist

**Date:** 2026-07-12  
**Branch:** `claude/ab-afisha-architecture-plan-805f5o`  
**GitHub HEAD:** `8b439361` (this commit adds seeds + this doc; no UI changes)

---

## IMPORTANT: What This Document Is

This document is the **manual operations checklist** for recovering staging to a
fully-populated, pixel-comparable state. All code changes are already in GitHub.
The remaining actions **must be executed on the staging server** by a person
with Docker/SSH access.

Claude Code (this agent) **does not have access** to the staging server, Docker
socket, or staging database. It cannot run `curl`, `docker`, or `psql` against
staging. All "verify" steps below must be performed manually.

---

## Étape 1 — Deploy Verification (MANUAL)

Run on the staging host:

```bash
# 1. What commit is the running frontend container built from?
docker exec ab-frontend cat /app/.next/BUILD_ID
# Expected: a build ID that corresponds to commit 8b439361 or later

# 2. Is the logo asset served?
curl -sI https://<STAGING_DOMAIN>/ab-logo-mark-cropped.png | head -5
# Expected: HTTP/2 200, content-type: image/png

# 3. Is the hero image served?
curl -sI https://<STAGING_DOMAIN>/hero-composition.png | head -5
# Expected: HTTP/2 200, content-type: image/png

# 4. What image is running?
docker inspect ab-frontend --format '{{.Image}} {{.Created}}'
```

### If container is stale (built before 2026-07-12):

```bash
git pull origin claude/ab-afisha-architecture-plan-805f5o
docker compose build frontend
docker compose up -d frontend
```

**After rebuild, re-verify steps 1–3 above.**

---

## Étape 2 — Events Seed (MANUAL)

```bash
cd apps/backend
STAGING_DESIGN_SEED=1 npx ts-node --project tsconfig.json prisma/seed-staging-design.ts

# Verify:
curl -s https://<STAGING_DOMAIN>/api/events/public?limit=10 | python3 -c "
import sys,json; d=json.load(sys.stdin)
print('total:', d.get('total'), 'events:', len(d.get('events',[])))"
# Expected: total: 6, events: 6

curl -s https://<STAGING_DOMAIN>/api/events/public/main | python3 -c "
import sys,json; d=json.load(sys.stdin)
print('mainEvents:', len(d) if isinstance(d,list) else d.get('total','?'))"
# Expected: 5
```

**Seed is idempotent — safe to re-run.**

---

## Étape 3 — Quotes Seed (MANUAL)

```bash
cd apps/backend
STAGING_DESIGN_SEED=1 npx ts-node --project tsconfig.json prisma/seed-staging-quotes.ts

# Verify (via psql or admin panel):
# SELECT id, text FROM "Quote" WHERE "isActive" = true ORDER BY "sortOrder";
# Expected: 5 rows with IDs staging-quote-0..4
```

**Seed is idempotent — safe to re-run.**

---

## Block Status Checklist

> **Legend:**
> - `READY` — code correct, no action needed beyond rebuild
> - `BLOCKED` — blocked by missing rebuild or missing seed
> - `BROKEN` — code defect; requires code fix before it can work
> - `APPROVED` — visually confirmed against Figma

### Header

| Item | Status | Notes |
|------|--------|-------|
| Logo image renders | `BLOCKED` | Asset in repo; container not rebuilt |
| Logo dimensions 62×67px | `READY` | Code correct: `w-[62px] h-[67px]` |
| Logo text "Афиша Бухгалтера" | `READY` | Montserrat SemiBold 18.69px `#1e1e1e` |
| Header height 80px | `READY` | `h-20` |
| Nav buttons (Telegram, MAX, Партнёр) | `READY` | Code correct |
| Nav button border-radius | `BLOCKED` | Figma value unconfirmed; currently `rounded-lg` (8px estimate) |

**Overall Header: `BLOCKED` — rebuild required for logo; M-01 pending Figma confirm**

---

### Hero

| Item | Status | Notes |
|------|--------|-------|
| Background `#f1f1f1` | `READY` | CSS correct |
| Panel white 1495×323px radius=28.3 | `READY` | CSS correct |
| Panel shadow `0 4px 4px rgba(0,0,0,0.25)` | `READY` | CSS correct |
| H1 Montserrat Bold 43px `#0D2344` | `READY` | CSS correct |
| CTA button `bg-[#7cd8b3]` h-47px | `READY` | CSS correct |
| Right image `hero-composition.png` | `BLOCKED` | Asset in repo; container not rebuilt |

**Overall Hero: `BLOCKED` — rebuild required for hero image**

---

### Filters

| Item | Status | Notes |
|------|--------|-------|
| Filter panel 588×632px radius=40.23 | `READY` | CSS correct |
| Filter panel shadow | `READY` | CSS correct |
| Направление / Формат / Статус / Стоимость | `READY` | Code correct |
| Кнопка «Применить» | `READY` | Code correct |

**Overall Filters: `READY` — will render correctly after rebuild**

---

### Calendar

| Item | Status | Notes |
|------|--------|-------|
| Calendar panel 760.866×631.824px | `READY` | CSS correct |
| Outer gap 29.002px | `READY` | `style={{ gap: '29.002px' }}` |
| Inner gap 9.355px | `READY` | CSS correct |
| Selected day `bg-mint` `text-black` | `BLOCKED` | Code correct (Stage 46); container not rebuilt |
| Selected day 43.97×43.014px radius=93.554px | `READY` | Code correct |
| Date markers (corner triangle) | `BLOCKED` | Correct code; no events in DB to create markers |
| Weekday labels Montserrat SemiBold 19px | `READY` | Code correct |

**Overall Calendar: `BLOCKED` — rebuild for CSS + seed for markers**

---

### Selected Day Events

| Item | Status | Notes |
|------|--------|-------|
| Event cards appear on date click | `BLOCKED` | DB empty — events not seeded |
| EventCard date badge | `READY` | Code correct |
| EventCard status badge | `READY` | Code correct |
| EventCard direction chips | `READY` | Code correct |
| EventCard title uppercase | `BLOCKED` | M-02: needs Figma node verify |
| EventCard gap 53px | `BLOCKED` | M-03: needs Figma node verify |

**Overall Selected Day Events: `BLOCKED` — seed required; M-02/M-03 pending Figma confirm**

---

### Main Events Carousel

| Item | Status | Notes |
|------|--------|-------|
| Section visible | `BLOCKED` | `events.length === 0` → returns null; seed required |
| 5-card fan layout | `READY` | Code correct (`getCardStyle` transforms) |
| Card 268×395px radius=18.259px | `READY` | CSS correct |
| Gallery height 428px | `READY` | CSS correct |
| Title "Главные события" Bold 26px | `READY` | CSS correct |

**Overall Main Events: `BLOCKED` — seed required**

---

### Quotes

| Item | Status | Notes |
|------|--------|-------|
| Section visible | `BLOCKED` | `quotes.length === 0` → returns null; seed required |
| Auto-rotation 5s | `READY` | Code correct |
| Fade transition 350ms | `READY` | Code correct |
| Dot navigation | `READY` | Code correct |
| 5 quotes seeded | `BLOCKED` | `seed-staging-quotes.ts` created but not yet run |

**Overall Quotes: `BLOCKED` — quotes seed required**

---

### Footer

| Item | Status | Notes |
|------|--------|-------|
| Background `#ffffff` | `BLOCKED` | Code correct (Stage 46); container not rebuilt |
| Logo image `w-[46px] h-[50px]` | `BLOCKED` | Asset in repo; container not rebuilt |
| Logo text color `#1e1e1e` | `BLOCKED` | Code correct; container not rebuilt |
| Tagline color `rgba(13,35,68,0.55)` | `BLOCKED` | Code correct; container not rebuilt |
| Col titles Gilroy Bold 1rem `#323232` | `BLOCKED` | Code correct; container not rebuilt |
| Link color `#323232` | `BLOCKED` | Code correct; container not rebuilt |
| Divider `rgba(0,0,0,0.1)` | `BLOCKED` | Code correct; container not rebuilt |
| Legal links `rgba(0,0,0,0.45)` | `BLOCKED` | Code correct; container not rebuilt |
| Copyright `rgba(0,0,0,0.4)` | `BLOCKED` | Code correct; container not rebuilt |
| Operator text `rgba(0,0,0,0.3)` | `BLOCKED` | Code correct; container not rebuilt |
| Column structure (3 cols) | `READY` | Code correct |
| Legal links content | `READY` | From `LEGAL_LINKS` |
| Copyright `© 2026 АБ Афиша Бухгалтера` | `READY` | Code correct |
| Operator ООО «АБ ГРУПП» ОГРН/ИНН | `READY` | Code correct |

**Overall Footer: `BLOCKED` — rebuild required for all visual changes**

---

## Summary: What Blocks Full Figma Comparison

| Blocker | Unblocked by | Blocks |
|---------|--------------|--------|
| Container not rebuilt | `docker compose build frontend && up` | Header logo, Hero image, Footer theme, Calendar selected day CSS |
| Events not seeded | `seed-staging-design.ts` | Calendar markers, Events grid, MainEventsBanner |
| Quotes not seeded | `seed-staging-quotes.ts` | RotatingQuotesBlock |
| M-01: nav button radius | Figma node fetch | Header approval |
| M-02: EventCard title case | Figma node fetch | EventCard approval |
| M-03: EventCard gap | Figma node fetch | EventCard approval |

**After rebuild + both seeds: 7 of 8 blocks become READY for visual comparison.**  
**Remaining: 3 MAJOR items (M-01, M-02, M-03) require Figma node confirmation before code changes.**

---

## Files Created in This Stage

| File | Purpose |
|------|---------|
| `apps/backend/prisma/seed-staging-quotes.ts` | Idempotent quotes seed (5 quotes, `isActive=true`) |
| `docs/PROJECT_BIBLE/STAGE_46_STAGING_RECOVERY.md` | This document |
