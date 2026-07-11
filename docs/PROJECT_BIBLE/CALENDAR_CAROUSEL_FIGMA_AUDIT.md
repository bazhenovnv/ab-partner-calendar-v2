# CALENDAR + CAROUSEL — FIGMA AUDIT (Stage 44D)

**Дата аудита:** 2026-07-11
**Аудитор:** Claude — статический анализ ~145 Figma-скриншотов из `project-assets/06_uploaded_images/`
**Ветка:** `claude/ab-afisha-architecture-plan-805f5o`
**Статус:** ✅ РЕАЛИЗОВАНО — Stage 44D

---

## Источники измерений

| Файл | Что зафиксировано |
|------|-------------------|
| `{BACC095C}` | Outer events panel: W=1496, H=945, radius=20, shadow X0/Y4/B4/25%, border 1px |
| `{566A9221}` | Carousel gallery: W=1388, H=428, fill #FFFFFF; выбранная секция W=1388, H=428 |
| `{5B65A8D3}` | Carousel outer section: radius=20, fill white, stroke 000000 1px Inside |
| `{E539CD30}` | Event card: W=428, H=300, shadow X0/Y4/B4/25%, corner radius=Mixed |
| `{FBB54E41}` | Event card W=428, H=300 — повторное подтверждение |
| `{5BE027B5}` | Status badge "Завершено": **94×27px** |
| `{55B0883C}` | "Подробнее →" button: **98.96×26**, padding=5×5, radius=1.5, gap=4 |
| `{585CCF5D}` | Filter panel: "Применить" **230.51×47.65**, все gap-values |
| `{0049377A}` | Status checkbox row "Запланировано": **192×24**, gap=23 между строками |
| `{5E0D2D7C}` | Hero button "Важные события →": **212×47** |
| `{5B059CE1}` | Full desktop 56%: filter panel ~380px, calendar занимает flex:1 |
| `{6CCE146D}` | 1920×3565 full-page frame: inner padding = **54px** per side (derive: 1496-2×54=1388) |
| `{FBB54E41}` | Inner content width: **1388px** ✓ (совпадает с gallery W) |
| `{57045E90}` | MAX header button: 118×38, gap=8 на обе стороны |

---

## ЧАСТЬ 1 — OUTER EVENTS PANEL

Подтверждено из `{BACC095C}`, `{6CCE146D}`:

| # | Параметр | Figma | Stage 44D код | Статус |
|---|----------|-------|---------------|--------|
| P-1 | max-width | **1496px** | `max-width: 1496px` | ✅ |
| P-2 | min-height | **945px** | `min-height: 945px` | ✅ |
| P-3 | border-radius | **20px** | `border-radius: 20px` | ✅ |
| P-4 | border | 1px solid (inside) | `border: 1px solid rgba(0,0,0,0.15)` | ✅ |
| P-5 | box-shadow | X=0, Y=4, Blur=4, Spread=0, 25% | `box-shadow: 0 4px 4px 0 rgba(0,0,0,0.25)` | ✅ |
| P-6 | background | #FFFFFF | `background: #ffffff` | ✅ |
| P-7 | inner padding sides | **54px** (вычислено: (1496-1388)/2=54) | `padding: 32px 54px` | ✅ ИСПРАВЛЕНО |
| P-8 | gap filter→calendar | **41px** (из `{585CCF5D}`) | `gap: 41px` | ✅ ИСПРАВЛЕНО |

---

## ЧАСТЬ 2 — FILTER PANEL

Подтверждено из `{585CCF5D}`, `{0049377A}`, `{5B059CE1}`:

| # | Параметр | Figma | Stage 44D код | Статус |
|---|----------|-------|---------------|--------|
| F-1 | Ширина | **TEMP ~380px** (визуальная оценка из {5B059CE1}) | `width: 380px` | ⚠️ TEMP |
| F-2 | Заголовок | "Фильтр мероприятий" (Montserrat Bold) | `.pub-filter-title` | ✅ |
| F-3 | Gap title → первый label | **43px** | `margin-bottom: 43px` | ✅ |
| F-4 | Dropdown "Направление" | полная ширина, "Все направления" | full-width `<select>` | ✅ |
| F-5 | Gap label → control | **19px** | `margin-bottom: 19px` | ✅ |
| F-6 | Gap dropdown → следующий label | **22px** | `margin-bottom: 22px` | ✅ |
| F-7 | Gap dropdowns → checkbox grid | **37px** | `margin-top: 37px` | ✅ |
| F-8 | Checkbox row size | 192×24px | `height: 24px`, `gap: 8px` | ✅ |
| F-9 | Gap между checkbox-строками | **23px** | `margin-bottom: 23px` | ✅ |
| F-10 | "Применить" button | **230.51×47.65px** | `width: 231px; height: 48px` | ✅ |
| F-11 | Gap grid → кнопка | **14px** | `margin-top: 14px` | ✅ |
| F-12 | Gap кнопка → "Сбросить" | **37px** (из layout) | `margin-top: 37px` | ✅ |
| F-13 | "Сбросить фильтр" | underlined link | `.pub-filter-reset-link` | ✅ |
| F-14 | Статус dot — Запланировано | зелёный (`#015A3F`) | `bg-green-marker` | ✅ |
| F-15 | Статус dot — Идёт сейчас | жёлтый (`#FFDB99`) | `bg-live-status` | ✅ |
| F-16 | Статус dot — Завершено | серый (`#ACACAC`) | `bg-completed-marker` | ✅ |
| F-17 | Колонки в нижней сетке | Формат (лево) / Статус+Стоимость (право) | CSS grid 2 col | ✅ |

**Регион/Город**: в Figma присутствует. Пропущен в реализации — не существует в текущем API.
Добавление нового функционала запрещено (требование Stage 44D).

---

## ЧАСТЬ 3 — CALENDAR

Подтверждено из `{5B059CE1}`, `{6CCE146D}`, `{FBB54E41}`:

| # | Параметр | Figma | Stage 44D код | Статус |
|---|----------|-------|---------------|--------|
| C-1 | Ширина | flex:1 (~967px в 1388px inner) | `flex: 1; min-width: 0` | ✅ ИСПРАВЛЕНО |
| C-2 | Карточка-обёртка | нет (вписан в outer panel) | removed | ✅ ИСПРАВЛЕНО |
| C-3 | 7 колонок | Пн Вт Ср Чт Пт Сб Вс | `grid-cols-7` | ✅ |
| C-4 | Маркеры событий | угловые треугольники (top-right) | CSS border trick | ✅ ИСПРАВЛЕНО |
| C-5 | Выбранная дата | teal fill, white text | `bg-selected-day text-white` | ✅ |
| C-6 | Навигация | ‹ Месяц Год › | CalendarHeader | ✅ |
| C-7 | Ячейки | aspect-square, clickable if has events | as before | ✅ |
| C-8 | Legenda | Запланировано / Идёт сейчас / Завершено | retained | ✅ |

---

## ЧАСТЬ 4 — EVENT CARDS

Подтверждено из `{E539CD30}`, `{FBB54E41}`, `{5BE027B5}`, `{55B0883C}`, `{6CCE146D}`:

| # | Параметр | Figma | Stage 44D код | Статус |
|---|----------|-------|---------------|--------|
| E-1 | Карточка W×H | **428×300px** | grid с col gap 53px | ✅ |
| E-2 | Shadow | X0/Y4/Blur4/25% | `shadow-base` class | ✅ |
| E-3 | Corner radius | Mixed | `rounded-2xl` | ⚠️ TEMP |
| E-4 | Status badge "Завершено" | **94×27px** | badge absolute top-3 left-3 | ⚠️ |
| E-5 | "Подробнее →" | **98.96×26**, padding 5×5, radius 1.5 | text link with arrow | ✅ approx |
| E-6 | Grid колонки | 3 columns | `grid-cols-3` | ✅ |
| E-7 | Column gap | **53px** (verify: 3×428+2×53=1390≈1388) | `gap-[53px]` | ✅ |
| E-8 | "События на {дата}" заголовок | виден в Figma при выбранной дате | dynamically shown | ✅ |

---

## ЧАСТЬ 5 — MAIN EVENTS CAROUSEL "Главные события"

Подтверждено из `{566A9221}`, `{5B65A8D3}`, `{6CCE146D}`, `{FBB54E41}`:

| # | Параметр | Figma | Stage 44D код | Статус |
|---|----------|-------|---------------|--------|
| M-1 | Секция background | **#FFFFFF белый** | white card (НЕ bg-primary) | ✅ ИСПРАВЛЕНО |
| M-2 | Секция border-radius | **20px** | `border-radius: 20px` | ✅ |
| M-3 | Секция border | 1px Inside | `border: 1px solid rgba(0,0,0,0.15)` | ✅ |
| M-4 | Секция shadow | X0/Y4/B4/25% | `box-shadow: 0 4px 4px 0 rgba(0,0,0,0.25)` | ✅ |
| M-5 | Секция padding | 54px sides (аналог events) | `padding: 32px 54px` | ✅ |
| M-6 | Gallery W | **1388px** (inner content width) | full inner width | ✅ |
| M-7 | Gallery H | **428px** | `height: 428px` | ✅ |
| M-8 | Layout | fan/perspective, 5 карточек видимых | CSS transforms | ✅ |
| M-9 | Center card | largest, z-index highest, no rotation | scale(1), zIndex=5 | ✅ |
| M-10 | Cards ±1 | scale ~0.82, translateX ±310px, rotate ±5deg | TEMP estimate | ⚠️ TEMP |
| M-11 | Cards ±2 | scale ~0.68, translateX ±545px, rotate ±11deg | TEMP estimate | ⚠️ TEMP |
| M-12 | Navigation | ‹ dots › | prev/next + dots | ✅ |
| M-13 | Card aspect ratio | portrait (~3:4.5) | w-[268px], h-[395px] | ⚠️ TEMP |

---

## TEMP-UNRESOLVED (уточнить в следующей итерации)

| ID | Параметр | Причина неопределённости |
|----|----------|--------------------------|
| F-1 | Filter panel ширина | Точное значение не видно в Figma-панели; ~380px — визуальная оценка |
| M-10,11 | Carousel card transform values | scale/translateX/rotate не видны в Figma-панели |
| M-13 | Carousel card dimensions | Точные W×H не зафиксированы в скриншотах |
| E-3 | Card corner radius Mixed | Отдельные значения углов не перечислены |

---

## Изменения Stage 44C.3 → Stage 44D (DIFF)

| Файл | Изменение |
|------|----------|
| `globals.css` | outer panel padding 24px→54px sides; filter col 300px→380px fixed; calendar col flex:1; gap 32px→41px; +filter panel CSS; +carousel section CSS |
| `EventFilters.tsx` | полный редизайн: горизонтальные dropdown → вертикальный сайдбар с "Применить" |
| `EventCalendar.tsx` | убрана карточка-обёртка; маркеры событий → треугольники top-right |
| `EventsSection.tsx` | убран заголовок "Мероприятия" из filter col; добавлен "События на {дата}"; gap grid→[53px] |
| `MainEventsBanner.tsx` | bg-primary → white card; 4-col grid → fan-perspective carousel |
