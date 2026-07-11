# STAGE 44 REGRESSION AUDIT (44E.4 → 44E.5)

**Дата:** 2026-07-11  
**Ветка:** `claude/ab-afisha-architecture-plan-805f5o`  
**Статус:** ✅ АУДИТ УТВЕРЖДЁН — исправления Stage 44E.5 применены

---

## ИЗМЕНЕНИЯ В 44E.5

| # | Исправление | Статус |
|---|-------------|--------|
| 1 | Удалены `sticky top-0 z-40` из `SiteHeader.tsx` | ✅ ПРИМЕНЕНО |
| 2 | Carousel order — подтверждён как соответствующий Figma | ✅ ЗАФИКСИРОВАНО |
| 3 | staging-from-main — отмечена как гипотеза | ✅ УТОЧНЕНО |
| 4 | Logo diagnosis — файл подтверждён на feature-ветке | ✅ УТОЧНЕНО |

---

## 1. VIOLATED PROJECT RULES

| # | Правило | Нарушение | Файл | Статус |
|---|--------|------------|------|--------|
| R-1 | не добавлять sticky/fixed без макета | `sticky top-0 z-40` в `SiteHeader` | `SiteHeader.tsx` | ✅ ИСПРАВЛЕНО в 44E.5 |
| R-2 | макет — единственный источник истины | Header-поведение не соответствует Figma | `SiteHeader.tsx` | ✅ ИСПРАВЛЕНО в 44E.5 |
| R-3 | не менять UX без подтверждения | Sticky Header меняет scroll UX | `SiteHeader.tsx` | ✅ ИСПРАВЛЕНО в 44E.5 |
| R-4 | Hero LOCKED | Hero перекрывался Header при скролле | `PublicShell.tsx` | ✅ ИСПРАВЛЕНО — побочный эффект устранён |
| R-5 | не пушить ассеты без проверки Docker-образа | Logo 404 на staging | `public/` | ⚠️ BLOCKER — требует Docker rebuild |

---

## 2. HEADER SCROLL BEHAVIOR

### Найденная ошибка (устранена в 44E.5)

**Файл:** `apps/frontend/src/components/layout/SiteHeader.tsx`  
**Было:** `<header className="bg-white sticky top-0 z-40">`  
**Стало:** `<header className="bg-white">`

| CSS-класс | Tailwind значение | Действие | Статус |
|-----------|-------------------|----------|--------|
| `sticky` | `position: sticky` | Header прилипает к top-оффсету при скролле | ✅ УДАЛЁН |
| `top-0` | `top: 0` | Оффсет = 0px от верха viewport | ✅ УДАЛЁН |
| `z-40` | `z-index: 40` | Header поднимается над Hero и Calendar | ✅ УДАЛЁН |

### Результат исправления

- Header является статичным (`position: static`) в document flow
- Header прокручивается вместе со страницей
- Hero не перекрывается Header
- Calendar не перекрывается Header при прокрутке
- Не добавлен `padding-top` на `<main>` (не требовался)
- Scroll behavior соответствует Figma

---

## 3. LAYOUT REGRESSIONS

### Header (SiteHeader.tsx)

| Параметр | Текущий код | Figma | Статус |
|----------|-------------|-------|--------|
| position | `static` (нет sticky) | `static` | ✅ ИСПРАВЛЕНО |
| height | `h-20` (80px) | TEMP-UNRESOLVED | ⚠️ TEMP |
| max-width inner | `max-w-[1496px]` | 1496px по Figma | ✅ |
| padding sides | `px-4 tablet:px-8` | соответствует | ✅ |
| background | `bg-white` | #FFFFFF | ✅ |
| logo src | `/ab-logo-mark.png` | PNG-ассет | ⚠️ 404 на staging (см. §Logo) |
| logo dimensions | `width=40 height=40` | TEMP-UNRESOLVED | ⚠️ TEMP |
| nav buttons height | `h-[38px]` | 38px по {C0944B54} | ✅ |
| nav buttons gap | `gap-2` (8px) | 8px по {C0944B54} | ✅ |
| border/shadow | `border border-black/[0.12] shadow-[0_4px_4px_0_...]` | TEMP-UNRESOLVED | ⚠️ TEMP |
| scroll behavior | прокручивается со страницей | прокручивается со страницей | ✅ ИСПРАВЛЕНО |

### Hero (HeroSection.tsx)

| Параметр | Текущий код | Статус |
|----------|-------------|--------|
| CSS-классы | `.pub-hero`, `.pub-hero-panel` | НЕ МЕНЯЛСЯ в 44E |
| Gradient | не изменялся | ✅ LOCKED |
| Ширина | max-width: 1496px | ✅ |
| Перекрытие Header | устранено — Header больше не sticky | ✅ ИСПРАВЛЕНО |
| hero-composition.png | файл есть на feature-ветке (324,374B) | ⚠️ 404 на staging (см. §Logo) |

### Outer Events Panel (EventsSection + globals.css)

| Параметр | Текущий код | Статус |
|----------|-------------|--------|
| max-width | 1497px | ✅ |
| border-radius | 35.604px | ✅ |
| shadow | `0 0 9.129px rgba(0,0,0,0.3)` | ✅ |
| padding | 40px 54px | ✅ |
| min-height | 1428px | ✅ |
| border | отсутствует | ✅ |
| controls inner overflow | +1.226px | ⚠️ MINOR |

### Filters (EventFilters.tsx + globals.css)

| Параметр | Текущий код | Статус |
|----------|-------------|--------|
| width | 588px | ✅ |
| height | 632px | ✅ |
| border-radius | 40.23px | ✅ |
| 2-колоночный layout | 236px + 96px gap | ✅ |
| Структура | Регион + Направление + Формат | Статус + Стоимость | ✅ |
| Применить / Сбросить | mt-auto — внизу | ✅ |

### Calendar (EventCalendar.tsx + CalendarHeader.tsx)

| Параметр | Текущий код | Статус |
|----------|-------------|--------|
| width | 760.866px | ✅ |
| height | 631.824px | ✅ |
| border-radius | 40.228px | ✅ |
| section gap | 29.002px | ✅ |
| row-gap | 9.355px | ✅ |
| cell size | 31.808 × 31.808px | ✅ |
| weekday font | 19px Montserrat SemiBold | ✅ |
| day number font | 23px Montserrat SemiBold | ✅ |
| month SemiBold / year Regular | да, раздельные `<span>` | ✅ |

### Event Cards

| Параметр | Статус |
|----------|--------|
| Данные | ❌ BLOCKED — нет PUBLISHED событий в staging DB |
| CSS-аудит | Отложен до появления данных |

### Main Events Carousel (MainEventsBanner.tsx)

| Параметр | Статус |
|----------|--------|
| Данные | ❌ BLOCKED — нет событий с mainEvent=true + PUBLISHED |
| Порядок на странице | ✅ ПОДТВЕРЖДЁН — рендерится ПОСЛЕ `EventsSection`, соответствует Figma |

**Порядок блоков по Figma (утверждён):**
```
1. Header
2. Hero
3. Filters + Calendar + Event Cards  ← EventsSection
4. Main Events Carousel               ← MainEventsBanner (ПОСЛЕ EventsSection)
5. Quotes                             ← RotatingQuotesBlock
6. Footer
```

> Вывод аудита 44E.4 о том, что `MainEventsBanner` «может не соответствовать Figma» — **НЕВЕРЕН**.  
> Текущий порядок в `page.tsx` (после EventsSection) соответствует утверждённому макету. `page.tsx` изменять не нужно.

### Quotes (RotatingQuotesBlock)

| Параметр | Статус |
|----------|--------|
| Данные | ❌ BLOCKED — `qs.length > 0` — нет quotes в staging DB |

### Footer (SiteFooter.tsx)

| Параметр | Текущий код | Статус |
|----------|-------------|--------|
| CSS-классы | `.pub-footer`, `.pub-footer-inner` | НЕ МЕНЯЛСЯ в 44E |
| max-width | 1496px | ✅ |
| Дизайн | не утверждён | ⚠️ NOT APPROVED |

---

## 4. LOGO ASSET DELIVERY — ДИАГНОЗ

### Статус файлов на ветке

| Файл | Ветка | Размер | SHA Git | Статус |
|------|-------|--------|---------|--------|
| `apps/frontend/public/ab-logo-mark.png` | `claude/ab-afisha-architecture-plan-805f5o` | 15,272B | `80f6e135` | ✅ ПРИСУТСТВУЕТ |
| `apps/frontend/public/hero-composition.png` | `claude/ab-afisha-architecture-plan-805f5o` | 324,374B | `531a93be` | ✅ ПРИСУТСТВУЕТ |
| `apps/frontend/public/ab-logo-mark.png` | `main` | — | — | ❌ ОТСУТСТВУЕТ |
| `apps/frontend/public/hero-composition.png` | `main` | — | — | ❌ ОТСУТСТВУЕТ |

### Dockerfile — анализ

Dockerfile (`apps/frontend/Dockerfile`) корректен:
```dockerfile
# build stage: копирует весь apps/frontend включая public/
COPY apps/frontend ./apps/frontend

# runner stage: копирует public/ в финальный образ
COPY --from=build --chown=nextjs:nodejs /app/apps/frontend/public ./apps/frontend/public
```

Цепочка доставки ассетов **не имеет ошибок в коде**.

### SiteHeader — путь

```html
<img src="/ab-logo-mark.png" width={40} height={40} style={{ objectFit: 'contain' }} />
```
Путь `/ab-logo-mark.png` корректен. Регистр совпадает.

### Гипотеза о причине 404 на staging

> ⚠️ **НЕПОДТВЕРЖДЁННАЯ ГИПОТЕЗА** (не верифицирована на сервере)

Наиболее вероятная причина: Docker-образ на staging был собран из ветки `main` (или без checkout feature-ветки), в которой `public/` содержит только `.gitkeep`.

**Не подтверждено** фактическим осмотром сервера. Возможные альтернативные причины:
- Старый Docker-образ (до добавления ассетов на feature-ветку)
- Кэш Docker layer без invalidation
- Неправильная директория монтирования volumes

### Действие для исправления

```bash
# На staging-сервере:
git pull origin claude/ab-afisha-architecture-plan-805f5o
docker compose -f docker-compose.staging.yml build --no-cache frontend
docker compose -f docker-compose.staging.yml up -d --no-deps frontend

# Проверка:
curl -I https://<staging-domain>/ab-logo-mark.png
# Ожидаем: HTTP/2 200, content-type: image/png
```

---

## 5. APPROVED LOCKED ELEMENTS

| Элемент | Последнее изменение | Статус |
|---------|------------------|--------|
| Hero gradient | Не менялся | ✅ LOCKED |
| Hero typography (43px H1, 16px sub) | Не менялся | ✅ LOCKED |
| Hero button (mint, h=42px) | Не менялся | ✅ LOCKED |
| Hero panel (1496×323px, radius 28.3px) | Не менялся | ✅ LOCKED |
| Calendar card geometry (44E.2) | Изменён в 44E.2, утверждён | ✅ APPROVED |
| Filter card geometry (44E.2) | Изменён в 44E.2, утверждён | ✅ APPROVED |
| Outer panel geometry (44E.2) | Изменён в 44E.2, утверждён | ✅ APPROVED |
| Event cards grid | Не менялся | ✅ LOCKED до данных |
| Carousel geometry | Не менялся | ✅ LOCKED до данных |
| Footer design | Не менялся | ⚠️ NOT APPROVED |

---

## 6. DATA BLOCKERS

| Компонент | Блокирующее условие | Действие |
|-----------|---------------------|----------|
| Event Cards | Нет PUBLISHED events в staging DB | Ожидаем seed-данные |
| Main Events Carousel | Нет events с `mainEvent=true AND status=PUBLISHED` | Ожидаем seed |
| Quotes | Нет quotes в staging DB | Ожидаем seed |
| Logo image | Docker-образ собран без feature-ветки (гипотеза) | Rebuild Docker из feature-ветки |
| hero-composition.png | Docker-образ собран без feature-ветки (гипотеза) | Rebuild Docker из feature-ветки |

---

## 7. REMAINING WORK

| # | Задача | Приоритет | Блокер |
|---|--------|-----------|--------|
| 1 | ~~Удалить sticky Header~~ | CRITICAL | ✅ DONE (44E.5) |
| 2 | Docker rebuild с feature-веткой | CRITICAL | Требует доступа к серверу |
| 3 | Overflow fix +1.226px в globals.css | MINOR | После подтверждения staging |
| 4 | Data seed (PUBLISHED events + mainEvent) | MEDIUM | После Docker rebuild |
| 5 | Event Cards CSS-аудит | MEDIUM | После seed |
| 6 | Carousel CSS-аудит | MEDIUM | После seed |

---

## 8. ИТОГОВАЯ ТАБЛИЦА СТАТУСОВ

| Элемент | Статус |
|---------|--------|
| **Header sticky** | ✅ **ИСПРАВЛЕНО** в 44E.5 |
| **Logo** | ⚠️ **BLOCKER** — Docker rebuild (файл есть на ветке) |
| **Hero asset** | ⚠️ **BLOCKER** — Docker rebuild (файл есть на ветке) |
| Hero design | ✅ LOCKED |
| Calendar geometry | ✅ APPROVED (44E.2) |
| Filter geometry | ✅ APPROVED (44E.2) |
| Outer panel geometry | ✅ APPROVED (44E.2) |
| Carousel order | ✅ ПОДТВЕРЖДЁН — ПОСЛЕ EventsSection, соответствует Figma |
| Controls overflow | ⚠️ MINOR +1.226px |
| Event Cards | ❌ BLOCKED BY DATA |
| Carousel render | ❌ BLOCKED BY DATA |
| Quotes | ❌ BLOCKED BY DATA |
| Footer | ⚠️ NOT APPROVED |
