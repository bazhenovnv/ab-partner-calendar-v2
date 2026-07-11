# HEADER + HERO — FIGMA AUDIT (Stage 44C)

**Дата аудита:** 2026-07-11  
**Аудитор:** Claude — статический анализ ~55 Figma-скриншотов из `project-assets/06_uploaded_images/`  
**Ветка:** `claude/ab-afisha-architecture-plan-805f5o`  
**Статус:** ОЖИДАЕТ УТВЕРЖДЕНИЯ — код не тронут

---

## Источники измерений

| Файл | Что зафиксировано |
|------|-------------------|
| `{D2CF8AB4}` | Утверждённый макет хедера + Hero: label "1495×323" |
| `{DB7079EA}` | Figma-панель Hero: W=912.64 (text area), H=323.18, radius=28.3, shadow, stroke |
| `{C0944B54}` | Telegram button: **118×38**, gap=8 |
| `{CA965F25}` | "Стать партнёром": **181.67×38.34**, gap=8 |
| `{F276C37A}` | Полная типографическая шкала (Frame 1346) |
| `{F6242A4C}` | Footer copyright: 1496×72 → ширина контента = **1496px** |
| `{DDFD1908}`, `{D6135447}` | Event modal: W=1496, H=768 |
| `{FF5DFC96}` | Hero button container: "488 Hug × 42 Hug" |
| `{AA450D76}` | Hero filter spacing: "54" left, "41" right → padding Hero |
| `{BACC095C}` | "Главные события" секция: radius=20, shadow X0/Y4/B4/25% |
| `{FBB54E41}`, `{E539CD30}` | Event card: shadow X=0/Y=4/Blur=4/25% — стандарт тени |

---

## ЧАСТЬ 1 — HEADER

### 1.1 Размеры и контейнер

| # | Параметр | Figma | Текущий код | Расхождение |
|---|----------|-------|-------------|-------------|
| H-1 | Высота хедера | не измерена прямо; визуально ~80px | `h-20` = 80px | ✅ вероятно верно |
| H-2 | Фон | white | `bg-white` | ✅ |
| H-3 | Sticky / z-index | sticky top | `sticky top-0 z-40` | ✅ |
| H-4 | Контент max-width | **1496px** (из footer/modal) | `max-w-[1440px]` | ❌ −56px |
| H-5 | Контент padding | не измерен точно | `px-4 tablet:px-8` | ⚠️ требует проверки |
| H-6 | Border-bottom | отсутствует | отсутствует | ✅ |

### 1.2 Логотип

| # | Параметр | Figma | Текущий код | Расхождение |
|---|----------|-------|-------------|-------------|
| H-7 | SVG размер | визуально ~52×40px | `width="52" height="40"` | ✅ |
| H-8 | SVG цвет | #0D2344 navy | `text-primary` (currentColor) | ✅ |
| H-9 | Текст | "Афиша Бухгалтера" | "Афиша Бухгалтера" | ✅ |
| H-10 | Шрифт текста | Gilroy SemiBold | `font-gilroy font-semibold` | ✅ |
| H-11 | Размер текста | визуально ~20px | `text-xl` = 20px | ✅ |

### 1.3 Кнопки навигации

| # | Параметр | Figma | Текущий код | Расхождение |
|---|----------|-------|-------------|-------------|
| H-12 | Telegram размер | **118×38px** | не фиксирован (py-2 px-4) | ❌ нет точного размера |
| H-13 | "Стать партнёром" размер | **181.67×38.34px** | не фиксирован | ❌ нет точного размера |
| H-14 | Высота всех кнопок | **38px** | авто (py-2=16px → высота ~34-38px) | ⚠️ |
| H-15 | Gap между кнопками | **8px** | `gap-2` = 8px | ✅ |
| H-16 | Border-radius кнопок | умеренный (~8px визуально) | `rounded-full` ≈ 19px | ❌ СЛИШКОМ КРУГЛЫЕ |
| H-17 | Border кнопок | stroke black/gray 1px Inside | `border border-gray-200` | ⚠️ цвет отличается |
| H-18 | Shadow кнопок | X=0/Y=4/Blur=4/Spread=0/#000000 25% | `shadow-sm` (слабее) | ❌ тень слабее |
| H-19 | Цвет текста кнопок | dark (#0D2344) | `text-primary` | ✅ |
| H-20 | Telegram иконка | #2AABEE circle + white plane | `fill="#2AABEE"` + white | ✅ |
| H-21 | MAX иконка | #006BFF circle + white mark | `fill="#006BFF"` + white | ✅ |
| H-22 | "Стать партнёром" иконка | person outline | person SVG outline | ✅ |
| H-23 | Фон кнопок | white | `bg-white` | ✅ |
| H-24 | hover | hover:bg-gray-50 | `hover:bg-gray-50` | ✅ |

### 1.4 Итог Header

**Критические расхождения:**
- `rounded-full` → нужен умеренный border-radius (~8px); Figma-значение не зафиксировано в панели, определено визуально
- `shadow-sm` → нужен `box-shadow: 0 4px 4px 0 rgba(0,0,0,0.25)` (стандарт проекта)
- `max-w-[1440px]` → нужен `max-w-[1496px]`

**Точные значения для применения:**
```
border-radius: 8px   (визуальная оценка — Figma-панель для кнопок хедера не найдена)
box-shadow: 0 4px 4px 0 rgba(0,0,0,0.25)
max-width: 1496px
button height: 38px (зафиксировано)
gap: 8px (зафиксировано ✅)
```

---

## ЧАСТЬ 2 — HERO

### 2.1 Структура и контейнер

| # | Параметр | Figma | Текущий код | Расхождение |
|---|----------|-------|-------------|-------------|
| R-1 | Структура | **белая карточка/панель**, центрированная | full-width `<section>` с gradient bg | ❌ ПОЛНОСТЬЮ НЕВЕРНО |
| R-2 | Ширина панели | **1495px** (label "1495×323") | 100% ширина | ❌ |
| R-3 | Высота панели | **323px** (H=323.18) | авто | ❌ |
| R-4 | Панель max-width | **1496px** (контентная ширина) | `max-w-[1440px]` | ❌ |
| R-5 | Panel bg | **white** (#FFFFFF) + изображение справа | `linear-gradient(135deg, #f0f4fa→#e8f0f7)` | ❌ |
| R-6 | Panel border | **1px stroke black, Inside** | `border-bottom: 1px solid #E8E3DC` (только снизу) | ❌ |
| R-7 | Panel border-radius | **28.3px** | 0 | ❌ |
| R-8 | Panel shadow | X=0/Y=4/Blur=4/Spread=0/#000000 25% | нет | ❌ |
| R-9 | Padding горизонтальный | **54px** | `1.5rem` ≈ 24px | ❌ |
| R-10 | Padding вертикальный | **41px** | `3rem top / 2.75rem bottom` | ❌ |
| R-11 | Overflow | hidden (image обрезается по radius) | нет | ❌ |

### 2.2 Типографика Hero

| # | Параметр | Figma | Текущий код | Расхождение |
|---|----------|-------|-------------|-------------|
| R-12 | H1 font-family | **Montserrat Bold** | Montserrat | ✅ |
| R-13 | H1 font-size | **43px** | `clamp(1.6rem, 3.5vw, 2.75rem)` ≈ 26–44px | ⚠️ |
| R-14 | H1 font-weight | **Bold (700)** | 800 | ❌ |
| R-15 | H1 line-height | **~1.3** (2 строки ≈ 112px / 43px ≈ 2.6 — это авто-высота блока) | 1.18 | ⚠️ |
| R-16 | H1 цвет | **весь #0D2344** (единый цвет) | primary + `.pub-hero-geo` зелёный | ❌ НЕТ ЗЕЛЁНОГО |
| R-17 | H1 текст | "Главные мероприятия для бухгалтеров по всей России" | то же | ✅ |
| R-18 | Subtitle font | **Montserrat Regular, 16px, 130%** | `clamp(0.95rem, 1.8vw, 1.1rem)` | ❌ |
| R-19 | Subtitle цвет | dark / #0D2344 ~60% | `rgba(13,35,68,0.6)` | ✅ |
| R-20 | Subtitle текст | "Онлайн и офлайн события для профессионального роста, обмена опытом и актуальной практики" | то же | ✅ |

### 2.3 Кнопка Hero

| # | Параметр | Figma | Текущий код | Расхождение |
|---|----------|-------|-------------|-------------|
| R-21 | Текст кнопки | **"Важные события →"** (→ в тексте, не SVG) | "Главные события" + calendar SVG | ❌ |
| R-22 | Фон кнопки | **mint** (#7CD8B3) | `var(--color-primary)` navy | ❌ |
| R-23 | Цвет текста | **тёмный** (#0D2344 или black) | white | ❌ |
| R-24 | Иконка | **нет** (только текст + →) | calendar SVG | ❌ |
| R-25 | Размер | **~488×42px** ("488 Hug × 42 Hug") | авто | ⚠️ |
| R-26 | Border-radius | не измерен в Figma-панели; визуально умеренный | 10px | ⚠️ |
| R-27 | Shadow | стандарт проекта X0/Y4/B4/25% | нет | ❌ |
| R-28 | hover | не задан в коде | navy bg | ❌ |

### 2.4 Изображение Hero

| # | Параметр | Figma | Текущий код | Расхождение |
|---|----------|-------|-------------|-------------|
| R-29 | Позиция | правая часть панели | правая часть | ✅ |
| R-30 | Поведение | заполняет правую часть; обрезается radius панели | отдельный `<Image>` с clamp-width | ⚠️ |
| R-31 | Gradient/mask | плавный переход между текстом и изображением | нет (резкая граница) | ❌ |

### 2.5 Итог Hero

**Критические расхождения (всё нужно менять):**
- Структура: от full-width секции → к белой карточке 1495×323px, centered, `max-w-[1496px]`
- Panel: добавить `border-radius: 28.3px`, `border: 1px solid rgba(0,0,0,0.12)`, `box-shadow: 0 4px 4px 0 rgba(0,0,0,0.25)`, `overflow: hidden`
- Padding: `54px` horizontal, `41px` vertical (вместо текущих 24px / 48px)
- H1: `font-size: 43px`, `font-weight: 700`, убрать `.pub-hero-geo` зелёный цвет
- Кнопка: текст → "Важные события →", bg → mint `#7CD8B3`, text → `#0D2344`, убрать calendar-иконку
- Page background (снаружи Hero): `#f5f5f5` / gray (Hero — белая карточка на сером фоне)

**Точные значения для применения:**
```
// Hero outer container
max-width: 1496px
margin: 0 auto
height: 323px
border-radius: 28.3px
border: 1px solid rgba(0,0,0,0.12)   /* визуально тонкая тёмная рамка */
box-shadow: 0 4px 4px 0 rgba(0,0,0,0.25)
background: #ffffff
overflow: hidden

// Hero inner padding
padding: 41px 54px

// Hero heading
font-family: Montserrat, sans-serif
font-size: 43px
font-weight: 700
line-height: 1.3
color: #0D2344   /* всё одним цветом, убрать geo-green */

// Hero subtitle
font-family: Montserrat, sans-serif
font-size: 16px
font-weight: 400
line-height: 1.3
color: rgba(13,35,68,0.6)

// Hero button
text: "Важные события →"
background: #7CD8B3
color: #0D2344
no calendar icon
height: 42px
box-shadow: 0 4px 4px 0 rgba(0,0,0,0.25)

// Page background (wrapper around Hero)
background: #f5f5f5  /* светло-серый фон страницы, Hero — белая карточка поверх */
```

---

## Файлы для изменения

| Файл | Что менять |
|------|-----------|
| `apps/frontend/src/components/layout/SiteHeader.tsx` | `max-w-[1440px]` → `max-w-[1496px]`, кнопки: `rounded-[8px]` вместо `rounded-full`, `shadow-[0_4px_4px_0_rgba(0,0,0,0.25)]` вместо `shadow-sm`, `border-black/10` вместо `border-gray-200` |
| `apps/frontend/src/components/HeroSection.tsx` | Полная перестройка: структура карточки, padding, кнопка, убрать geo-green, убрать calendar-иконку |
| `apps/frontend/src/app/globals.css` (Hero-блок) | Переписать `.pub-hero*` правила согласно Figma-значениям |

---

## СТАТУС

| Компонент | Статус | Блокиратор |
|-----------|--------|-----------|
| Header — лого + текст | ✅ соответствует | — |
| Header — Telegram/MAX иконки | ✅ соответствует (Stage 44B) | — |
| Header — кнопки radius/shadow/border | ❌ не соответствует | нужно утверждение |
| Header — max-width контейнера | ❌ 1440 вместо 1496 | нужно утверждение |
| Hero — структура | ❌ полностью не соответствует | нужно утверждение |
| Hero — размеры и отступы | ❌ не соответствует | нужно утверждение |
| Hero — типографика H1 | ❌ не соответствует | нужно утверждение |
| Hero — кнопка | ❌ цвет/текст/иконка не соответствуют | нужно утверждение |

**Код не тронут. Ожидание явного утверждения.**

---

## Нераскрытые данные (требуют подтверждения)

| Параметр | Ситуация |
|----------|----------|
| Header button border-radius | Figma-панель для кнопок хедера не найдена. Визуально: ~8px. Нужно подтверждение или скриншот Figma-панели кнопки |
| Header height (точно) | Figma-фрейм хедера с H= не найден. Принято: 80px = h-20 (совпадает визуально) |
| Hero button border-radius | Figma-панель кнопки Hero не найдена. Принято 10px (текущее). Нужно подтверждение |
| Stroke color Hero panel | "stroke black 1px Inside" — точный цвет: 000000 100%? Или rgba с прозрачностью? |
| Page background color | За Hero панелью: серый #f5f5f5 или другой? |
