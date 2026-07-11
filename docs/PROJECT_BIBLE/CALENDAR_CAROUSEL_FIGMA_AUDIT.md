# CALENDAR + CAROUSEL — FIGMA AUDIT (Stage 44E.2)

**Дата аудита:** 2026-07-11  
**Аудитор:** Claude — точные значения из Figma node `5913:4745`, file key `t7Vg797xBk263TgvZRrO12`  
**Ветка:** `claude/ab-afisha-architecture-plan-805f5o`  
**Статус:** ✅ РЕАЛИЗОВАНО — Stage 44E.2

---

## Источники измерений

| Источник | Что зафиксировано |
|----------|-------------------|
| Figma node `5913:4752` | Outer events panel: W=1497, H=1428, radius=35.604, shadow, padding |
| Figma node `5913:4888` | Filter card: W=588, H=632, radius=40.23, shadow, padding |
| Figma node `5913:4757` | Calendar card: W=760.866, H=631.824, radius=40.228, shadow, padding |
| Figma node `5913:4745` | Desktop / 1920 / АБ Афиша main — полный фрейм |
| Stage 44D скриншоты | Event cards, Carousel (не изменены в 44E.2) |

---

## ЧАСТЬ 1 — OUTER EVENTS PANEL

Фигма node `5913:4752` — Stage 44E.2 (финальные значения):

| # | Параметр | Figma | Применено | Selector |
|---|----------|-------|-----------|----------|
| P-1 | max-width | **1497px** | `max-width: 1497px` | `.pub-events-outer` |
| P-2 | min-height | **1428px** | `min-height: 1428px` | `.pub-events-outer` |
| P-3 | border-radius | **35.604px** | `border-radius: 35.604px` | `.pub-events-outer` |
| P-4 | border | **отсутствует** | удалён | `.pub-events-outer` |
| P-5 | box-shadow | `0 0 9.129px rgba(0,0,0,0.3)` | `box-shadow: 0 0 9.129px rgba(0,0,0,0.3)` | `.pub-events-outer` |
| P-6 | background | **#FFFFFF** | `background: #ffffff` | `.pub-events-outer` |
| P-7 | padding | **40px top, 54px sides** | `padding: 40px 54px` | `.pub-events-outer` |
| P-8 | gap filter→calendar | **41.36px** | `gap: 41.36px` | `.pub-events-controls` |

> Важно: 1428px — высота всей панели, включая Filter+Calendar row, заголовок событий и Event Cards. `min-height` применено к `.pub-events-outer`, не к row.

---

## ЧАСТЬ 2 — FILTER CARD

Фигма node `5913:4888` — Stage 44E.2 (финальные значения):

| # | Параметр | Figma | Применено | Selector |
|---|----------|-------|-----------|----------|
| F-1 | width | **588px** | `width: 588px` | `.pub-events-filters-col` |
| F-2 | height | **632px** | `height: 632px` | `.pub-events-filters-col` |
| F-3 | border-radius | **40.23px** | `border-radius: 40.23px` | `.pub-events-filters-col` |
| F-4 | box-shadow | `0 0 9.549px rgba(0,0,0,0.3)` | `box-shadow: 0 0 9.549px rgba(0,0,0,0.3)` | `.pub-events-filters-col` |
| F-5 | background | **#FFFFFF** | `background: #ffffff` | `.pub-events-filters-col` |
| F-6 | padding | **39px 24.86px 24px** | `padding: 39px 24.86px 24px` | `.pub-events-filters-col` |
| F-7 | X в outer panel | 54px (от padding outer) | наследуется от outer | — |
| F-8 | Y в outer panel | 40px (от padding outer) | наследуется от outer | — |

### Filter internal typography (Stage 44E.2):

| # | Элемент | Figma | Применено | Selector |
|---|---------|-------|-----------|----------|
| FT-1 | Заголовок «Фильтр мероприятий» | Montserrat Bold 21px | `font-size: 21px; font-weight: 700` | `.pub-filter-title` |
| FT-2 | Section labels | Montserrat SemiBold 17px | `font-size: 17px; font-weight: 600` | `.pub-filter-label` |
| FT-3 | Checkbox text | Montserrat Regular 16px | `font-size: 16px; font-weight: 400` | `.pub-filter-check-text` |
| FT-4 | Select / dropdown | Montserrat 14px | `font-size: 14px` | `.pub-filter-select` |
| FT-5 | Select border | `#e8e3dc` | `border: 1px solid #e8e3dc` | `.pub-filter-select` |
| FT-6 | Select border-radius | 9.233px | `border-radius: 9.233px` | `.pub-filter-select` |
| FT-7 | Select padding | 17px 36px 17px 18px | `padding: 17px 36px 17px 18px` | `.pub-filter-select` |

### Filter two-column layout (Stage 44E.2):

| # | Параметр | Figma | Применено | Selector |
|---|----------|-------|-----------|----------|
| FC-1 | LEFT col width | **236px** | `grid-template-columns: 236px 1fr` | `.pub-filter-two-col` |
| FC-2 | column-gap | **96px** | `column-gap: 96px` | `.pub-filter-two-col` |
| FC-3 | LEFT содержимое | Регион/Город + Направление + Формат | реализовано | `EventFilters.tsx` |
| FC-4 | RIGHT содержимое | Статус + Стоимость | реализовано | `EventFilters.tsx` |
| FC-5 | Кнопки «Применить»/«Сбросить» | внизу карточки | `mt-auto` | `EventFilters.tsx` |

### Структура фильтра (Stage 44E.2):
- «Фильтр мероприятий»
- Регион / Город (disabled select — в API отсутствует)
- Направление (functional select)
- Формат (checkboxes)
- Статус (checkboxes с цветными dots)
- Стоимость (checkboxes)
- «Применить» + «Сбросить фильтр»

---

## ЧАСТЬ 3 — CALENDAR CARD

Фигма node `5913:4757` — Stage 44E.2 (финальные значения):

| # | Параметр | Figma | Применено | Selector/Component |
|---|----------|-------|-----------|--------------------|
| C-1 | width | **760.866px** | `width: 760.866px` | `.pub-events-calendar-col` |
| C-2 | height | **631.824px** | `height: 631.824px` | `.pub-events-calendar-col` |
| C-3 | border-radius | **40.228px** | `border-radius: 40.228px` | `.pub-events-calendar-col` |
| C-4 | box-shadow | `0 0 9.355px rgba(0,0,0,0.3)` | `box-shadow: 0 0 9.355px rgba(0,0,0,0.3)` | `.pub-events-calendar-col` |
| C-5 | background | `rgba(255,255,255,0.21)` | `background: rgba(255,255,255,0.21)` | `.pub-events-calendar-col` |
| C-6 | padding-left | **41.102px** | `padding-left: 41.102px` | `.pub-events-calendar-col` |
| C-7 | padding-right | **26.764px** | `padding-right: 26.764px` | `.pub-events-calendar-col` |
| C-8 | padding-top/bottom | **28.066px** | `padding: 28.066px 26.764px 28.066px 41.102px` | `.pub-events-calendar-col` |
| C-9 | internal section gap | **29.002px** | `gap: '29.002px'` (inline style) | `EventCalendar.tsx` root div |

---

## ЧАСТЬ 4 — CALENDAR GRID & TYPOGRAPHY

Stage 44E.2 (финальные значения):

| # | Параметр | Figma | Применено | Selector/Component |
|---|----------|-------|-----------|--------------------|
| G-1 | Weekday header font | Montserrat SemiBold 19px | `fontSize: '19px'` + `font-semibold` | `EventCalendar.tsx` |
| G-2 | Day number font | Montserrat SemiBold 23px | `fontSize: '23px'` + `font-semibold` | `EventCalendar.tsx` |
| G-3 | Month header — название | Montserrat SemiBold 30px | `<span className="font-semibold">` | `CalendarHeader.tsx` |
| G-4 | Month header — год | Montserrat Regular 30px | `<span className="font-normal">` | `CalendarHeader.tsx` |
| G-5 | Day cell size | **31.808 × 31.808px** | `width: '31.808px'; height: '31.808px'` | `EventCalendar.tsx` |
| G-6 | Grid row-gap | **9.355px** | `rowGap: '9.355px'` (inline style) | `EventCalendar.tsx` |
| G-7 | Grid columns | 7 | `grid-cols-7` | `EventCalendar.tsx` |
| G-8 | aspect-square | **отсутствует** | удалён | `EventCalendar.tsx` |
| G-9 | День без событий | text-primary/30, cursor-default | `text-primary/30 cursor-default` | `EventCalendar.tsx` |
| G-10 | День с событиями | hover:bg-date-hover | `hover:bg-date-hover` | `EventCalendar.tsx` |
| G-11 | Выбранная дата | bg-selected-day text-white | `bg-selected-day text-white` | `EventCalendar.tsx` |
| G-12 | Сегодня | bg-primary/10 text-primary | `bg-primary/10 text-primary` | `EventCalendar.tsx` |
| G-13 | Event marker | треугольник top-right, цвет по статусу | CSS border trick | `EventCalendar.tsx` |

---

## ЧАСТЬ 5 — EVENT CARDS (Stage 44D, не изменены в 44E.2)

| # | Параметр | Figma | Stage 44D код | Статус |
|---|----------|-------|---------------|--------|
| E-1 | Карточка W×H | **428×300px** | grid с col gap 53px | ✅ |
| E-2 | Shadow | X0/Y4/Blur4/25% | `shadow-base` | ✅ |
| E-3 | Corner radius | Mixed | `rounded-2xl` | ⚠️ TEMP |
| E-4 | Status badge «Завершено» | **94×27px** | badge absolute top-3 left-3 | ⚠️ TEMP |
| E-5 | «Подробнее →» | **98.96×26**, padding 5×5, radius 1.5 | text link | ✅ approx |
| E-6 | Grid колонки | 3 columns | `grid-cols-3` | ✅ |
| E-7 | Column gap | **53px** | `gap-[53px]` | ✅ |

---

## ЧАСТЬ 6 — MAIN EVENTS CAROUSEL (Stage 44D, не изменён в 44E.2)

| # | Параметр | Figma | Stage 44D код | Статус |
|---|----------|-------|---------------|--------|
| M-1 | Background | **#FFFFFF** | white card | ✅ |
| M-2 | border-radius | **20px** | `border-radius: 20px` | ✅ |
| M-3 | border | 1px Inside | `border: 1px solid rgba(0,0,0,0.15)` | ✅ |
| M-4 | Shadow | X0/Y4/B4/25% | `box-shadow: 0 4px 4px 0 rgba(0,0,0,0.25)` | ✅ |
| M-5 | Gallery H | **428px** | `height: 428px` | ✅ |
| M-6 | Layout | fan/perspective, 5 карточек | CSS transforms | ✅ |
| M-10 | Cards ±1 | scale/translateX/rotate | TEMP estimate | ⚠️ TEMP |
| M-11 | Cards ±2 | scale/translateX/rotate | TEMP estimate | ⚠️ TEMP |
| M-13 | Card aspect ratio | portrait | TEMP | ⚠️ TEMP |

---

## TEMP-UNRESOLVED

| ID | Параметр | Причина |
|----|----------|---------|
| M-10,11 | Carousel card transform values | scale/translateX/rotate не в Figma-панели |
| M-13 | Carousel card dimensions | точные W×H не зафиксированы |
| E-3 | Card corner radius Mixed | отдельные углы не перечислены |

> Event Cards и Carousel CSS: BLOCKED до появления данных на staging.

---

## Changelog

| Stage | Изменение |
|-------|-----------|
| 44C.3 | Начальная реализация |
| 44D | Outer panel padding/gap; filter сайдбар; carousel white card; маркеры событий |
| 44E.1 | Figma аудит node 5913:4745 — точные значения задокументированы |
| 44E.2 | Outer panel (1497/1428/35.604px/no border/9.129px shadow); Filter card (588/632/40.23px); Calendar card (760.866/631.824/40.228px/rgba bg); Calendar grid typography (19px/23px/31.808px cells/9.355px row-gap/29.002px section gap); Filter 2-col layout (236px + 96px gap); CalendarHeader SemiBold month + Regular year |
