# STAGE 44 REGRESSION AUDIT (44E.4)

**Дата:** 2026-07-11  
**Ветка:** `claude/ab-afisha-architecture-plan-805f5o`  
**Статус:** ✅ АУДИТ ЗАВЕРШЕН — ожидает утверждения

---

## 1. VIOLATED PROJECT RULES

| # | Правило | Нарушение | Файл | Статус |
|---|--------|------------|------|--------|
| R-1 | не добавлять sticky/fixed без макета | `sticky top-0 z-40` в `SiteHeader` | `SiteHeader.tsx` | ❌ НАРУШЕНО |
| R-2 | макет — единственный источник истины | Header-поведение не соответствует Figma | `SiteHeader.tsx` | ❌ НАРУШЕНО |
| R-3 | не менять UX без подтверждения | Sticky Header меняет scroll UX | `SiteHeader.tsx` | ❌ НАРУШЕНО |
| R-4 | Hero LOCKED | Hero перекрывается Header при скролле | `PublicShell.tsx` | ❌ ПОБОЧНЫЙ ΔИЗАЙН |
| R-5 | не пушить ассеты без проверки Docker-образа | Logo 404 на staging | `public/` vs `main` | ❌ ДЕПЛОЙ |

---

## 2. HEADER SCROLL BEHAVIOR

### Найденная ошибка

**Файл:** `apps/frontend/src/components/layout/SiteHeader.tsx`  
**Команда:** `<header className="bg-white sticky top-0 z-40">`  

| CSS-класс | Tailwind значение | Действие |
|-----------|-------------------|----------|
| `sticky` | `position: sticky` | Header прилипает к top-оффсету при скролле |
| `top-0` | `top: 0` | Оффсет = 0px от верха viewport |
| `z-40` | `z-index: 40` | Header поднимается над Hero и Calendar |

### Последствия

1. **Перекрытие Hero:** `PublicShell.tsx` не добавляет `padding-top` на `<main>` — при sticky Header `h-20` (80px) становится оффсетом Header и перекрывает верх Hero при скролле.
2. **Перекрытие Calendar:** При прокрутке вниз Header остаётся на экране и перекрывает Events-блок.
3. **Неправильный scroll flow:** Header должен прокручиваться вместе со страницей согласно Figma.

### Figma-подтверждение

Из Figma Desktop / 1920 / АБ Афиша main (`5913:4745`): Header является статичным элементом в document flow. Нет индикаторов `position: sticky` в Figma-слоях. Подтверждено задачей (user: «Это не соответствует утверждённому Figma-макету»).

### Исправление

```diff
- <header className="bg-white sticky top-0 z-40">
+ <header className="bg-white">
```

**Что НЕ делать:**
- Не добавлять `padding-top` на `<main>`
- Не заменять `sticky` на `fixed`
- Не добавлять компенсационный оффсет
- Не менять дизайн Header

---

## 3. LAYOUT REGRESSIONS

### Header (SiteHeader.tsx)

| Параметр | Текущий код | Figma | Статус |
|----------|-------------|-------|--------|
| position | `sticky` | `static` (нет sticky) | ❌ БАГ |
| top | `top-0` (0px) | н/а | ❌ УДАЛИТЬ |
| z-index | `z-40` (40) | н/а | ❌ УДАЛИТЬ |
| height | `h-20` (80px) | TEMP-UNRESOLVED | ⚠️ TEMP |
| max-width inner | `max-w-[1496px]` | 1496px по Figma | ✅ |
| padding sides | `px-4 tablet:px-8` | соответствует | ✅ |
| background | `bg-white` | #FFFFFF | ✅ |
| logo src | `/ab-logo-mark.png` | PNG-ассет | ❌ 404 на staging |
| logo dimensions | `width=40 height=40` | TEMP-UNRESOLVED | ⚠️ TEMP |
| nav buttons height | `h-[38px]` | 38px по {C0944B54} | ✅ |
| nav buttons gap | `gap-2` (8px) | 8px по {C0944B54} | ✅ |
| border/shadow | `border border-black/[0.12] shadow-[0_4px_4px_0_...]` | TEMP-UNRESOLVED | ⚠️ TEMP |
| scroll behavior | stays fixed during scroll | must scroll with page | ❌ БАГ |

### Hero (HeroSection.tsx)

| Параметр | Текущий код | Статус |
|----------|-------------|--------|
| CSS-классы | `.pub-hero`, `.pub-hero-panel` | НЕ МЕНЯЛСЯ в 44E |
| Gradient | не изменялся | ✅ LOCKED |
| Ширина | max-width: 1496px | ✅ |
| Перекрытие Header | ДА — sticky Header (z-40) перекрывает Hero при скролле | ❌ ПОБОЧНЫЙ ДИЗАЙН |
| hero-composition.png | файл есть на feature-ветке, нет в main | ❌ 404 на staging |

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
| Порядок на странице | Рендерится ПОСЛЕ `EventsSection` — может не соответствовать Figma | ⚠️ ТРЕБУЕТ ПОДТВЕРЖДЕНИЯ |

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

## 4. APPROVED LOCKED ELEMENTS

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

## 5. DATA BLOCKERS

| Компонент | Блокирующее условие | Действие |
|-----------|---------------------|----------|
| Event Cards | Нет PUBLISHED events в staging DB | Ожидаем seed-данные |
| Main Events Carousel | Нет events с `mainEvent=true AND status=PUBLISHED` | Ожидаем seed |
| Quotes | Нет quotes в staging DB | Ожидаем seed |
| Logo image | `main` branch не имеет `ab-logo-mark.png` | Rebuild Docker из feature-ветки |
| hero-composition.png | `main` branch не имеет файл | Rebuild Docker из feature-ветки |

---

## 6. EXACT FILES TO CHANGE

### После утверждения аудита:

| # | Файл | Изменение | Приоритет |
|---|------|-----------|----------|
| 1 | `apps/frontend/src/components/layout/SiteHeader.tsx` | Удалить `sticky top-0 z-40` из `<header>` | CRITICAL |
| 2 | Docker image rebuild | Собрать из feature-ветки (logo + hero asset) | CRITICAL |
| 3 | `apps/frontend/src/app/globals.css` | Скорректировать overflow +1.226px | MINOR |

### Файлы, которые ЗАПРЕЩЕНО менять:

- `HeroSection.tsx` — LOCKED
- `SiteFooter.tsx` — NOT APPROVED
- `EventsSection.tsx` — не менять до появления данных
- `MainEventsBanner.tsx` — BLOCKED BY DATA
- `EventCalendar.tsx` — утверждён (44E.2)
- `EventFilters.tsx` — утверждён (44E.2)
- `CalendarHeader.tsx` — утверждён (44E.2)

---

## 7. ROLLBACK CANDIDATES

| Изменение | Откатывать? | Причина |
|-----------|------------|----------|
| `sticky top-0 z-40` в Header | ДА — удалить | Не соответствует Figma |
| Calendar geometry (44E.2) | Нет | Утверждён |
| Filter geometry (44E.2) | Нет | Утверждён |
| Outer panel geometry (44E.2) | Нет | Утверждён |

---

## 8. FINAL IMPLEMENTATION PLAN

### Шаг 1 — CRITICAL: Убрать sticky Header

**Файл:** `apps/frontend/src/components/layout/SiteHeader.tsx`

```diff
- <header className="bg-white sticky top-0 z-40">
+ <header className="bg-white">
```

**Последствия исправления:**
- Header становится статичным (`position: static`)
- Hero больше не перекрывается при скролле
- Calendar больше не перекрывается Header
- Правильный document flow согласно Figma
- Не требует дополнительных изменений в других файлах

### Шаг 2 — CRITICAL: Docker rebuild с feature-веткой

```bash
git pull origin claude/ab-afisha-architecture-plan-805f5o
docker compose build --no-cache frontend
docker compose up -d --no-deps frontend
```

**Последствия:**
- `ab-logo-mark.png` (15 272 B) попадёт в Docker-образ → logo 200 OK
- `hero-composition.png` попадёт в образ → Hero изображение 200 OK
- Новый CSS (44E.2) активируется

### Шаг 3 — MINOR: Overflow fix в globals.css

После подтверждения шага 2 и оценки на staging:

Controls overflow +1.226px. Исправление: уменьшить padding или ширину колонок.

### Шаг 4 — BLOCKED: Data seed

После подтверждения staging deployment:
- Создать `seed-staging-design.ts` для 6+ PUBLISHED events + 5+ mainEvent=true
- Проверить Event Cards и Carousel

---

## 9. ДОПОЛНИТЕЛЬНО: ПОРЯДОК БЛОКОВ НА СТРАНИЦЕ

Текущий порядок в `page.tsx`:
```
1. Header
2. Hero
3. EventsSection (calendar + filters + event cards)
4. MainEventsBanner (if main.length > 0)  ← ПОСЛЕ events
5. RotatingQuotesBlock (if qs.length > 0)
6. Footer
```

**Требует подтверждения по Figma:** в Figma порядок зависит от расположения карусель (ДО или ПОСЛЕ фильтров). Не менять до утверждения.

---

## 10. ИТОГОВАЯ ТАБЛИЦА СТАТУСОВ

| Элемент | Статус |
|---------|--------|
| **Header sticky** | ❌ **CRITICAL BUG** — удалить `sticky top-0 z-40` |
| **Logo** | ❌ **BROKEN** — Docker rebuild |
| **Hero asset** | ❌ **404 на staging** — Docker rebuild |
| Hero design | ✅ LOCKED |
| Calendar geometry | ✅ APPROVED (44E.2) |
| Filter geometry | ✅ APPROVED (44E.2) |
| Outer panel geometry | ✅ APPROVED (44E.2) |
| Controls overflow | ⚠️ MINOR +1.226px |
| Event Cards | ❌ BLOCKED BY DATA |
| Carousel | ❌ BLOCKED BY DATA |
| Quotes | ❌ BLOCKED BY DATA |
| Footer | ⚠️ NOT APPROVED |
| Page block order | ⚠️ Требует Figma-подтверждения |
