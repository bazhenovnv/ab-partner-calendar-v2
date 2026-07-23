# FULL PAGE PIXEL PERFECT AUDIT — Stage 45

**Дата:** 2026-07-11  
**Ветка:** `claude/ab-afisha-architecture-plan-805f5o`  
**Figma source:** node `5913:4745` — Desktop / 1920 / АБ Афиша main  
**Файл Figma:** `t7Vg797xBk263TgvZRrO12`  
**Статус:** АУДИТ ЗАВЕРШЁН — ожидается утверждение блоков для исправления

---

## 1. FIGMA FRAME GEOMETRY (5913:4745)

Весь макет: `bg-[#f1f1f1]`, ширина 1920px, полная высота ~3418px.

| Блок | Figma node | X | Y | W | H |
|------|------------|---|---|---|---|
| Logo group | 5913:4745→Group1296 | 197 | 26 | 415 | 64 |
| Telegram btn | 5913:5026→Variant3 | 1274 | 49 | 118 | 38 |
| MAX btn | — | 1400 | 49 | 118 | 38 |
| Partner btn | 5913:5026 | 1526 | 49 | 181.67 | 38.34 |
| Hero panel | 5913:4980 | 211 | 132 | ~1496 | 323 |
| Outer Events Panel | 5913:4752 | 211 | 480 | 1497 | 1428 |
| Filter card | 5913:4888 | 265 | 520 | 588 | 632 |
| Calendar card | 5913:4757 | 894.36 | 520.09 | 760.866 | 631.824 |
| Events date heading | 5913:4976 | 264 | 1177 | 363 | 32 |
| Event Cards (row1) | 5913:4825→ | 265 | 1234 | 428 | 300 |
| Event Cards (row2) | 5913:4865→ | 265 | 1563 | 428 | 300 |
| Carousel+Quotes panel | 5913:4884 | 212 | 1933 | 1496 | 945 |
| "Главные события" H2 | 5913:4885 | 263 | 1958 | 245 | 35 |
| Carousel gallery | 5913→Component | 266 | 2018 | 1388 | 428 |
| Quote block | 5913→Component1 | 591 | 2561 | 744 | 214 |
| Footer logo area | 5913:4998 | 193 | 3003 | 101 | 69 |
| Footer divider | 5913:4979 | 215 | 3308 | 1493 | 0 |
| Footer copyright | 5913→Component2 | 212 | 3346 | 1496 | 72 |

---

## 2. CURRENT IMPLEMENTATION MAP

| Компонент | Файл | CSS-класс |
|-----------|------|-----------|
| Wrapper | `PublicShell.tsx` | `min-h-screen flex flex-col bg-[#f5f5f5]` |
| Header | `SiteHeader.tsx` | `bg-white` (h-20 = 80px) |
| Hero | `HeroSection.tsx` | `.pub-hero`, `.pub-hero-panel` |
| Events section | `EventsSection.tsx` | `.pub-events-section`, `.pub-events-outer` |
| Filter card | `EventFilters.tsx` | `.pub-events-filters-col` |
| Calendar card | `EventCalendar.tsx` | `.pub-events-calendar-col` |
| Event cards | `EventCard.tsx` | `grid grid-cols-3` |
| Carousel | `MainEventsBanner.tsx` | `.pub-main-events-section` |
| Quotes | `RotatingQuotesBlock.tsx` | `.quotes-section` |
| Footer | `SiteFooter.tsx` | `.pub-footer` |

---

## 3. BLOCK ORDER

| Позиция | Figma | Текущий `page.tsx` | Совпадение |
|---------|-------|--------------------|------------|
| 1 | Header | `<SiteHeader>` в PublicShell | ✅ |
| 2 | Hero | `<HeroSection>` | ✅ |
| 3 | Outer Events Panel (Filters + Calendar + Cards) | `<EventsSection>` | ✅ |
| 4 | Carousel + Quotes (ОДИН БЛОК) | `<MainEventsBanner>` | ⚠️ АРХИТЕКТУРА |
| 5 | — (входит в блок 4) | `<RotatingQuotesBlock>` | ⚠️ АРХИТЕКТУРА |
| 6 | Footer | `<SiteFooter>` | ✅ |

**Критическое расхождение архитектуры:** В Figma Carousel и Quotes находятся внутри ОДНОГО белого панельного контейнера (`h-[945px] w-[1496px] rounded-[20px] shadow-[0px_0px_10px_rgba(0,0,0,0.3)]`). В текущем коде они — отдельные секции с разными фонами и стилями.

---

## 4. HEADER DISCREPANCIES

### Figma Header (нет отдельной белой полосы)

В Figma Header — это НЕ полноширинная полоса с фоном. Это плавающие элементы на фоне страницы `#f1f1f1`:
- Лого-группа: absolute, left=197, top=26, h=64px
- Telegram: absolute, top=49, h=38px, w=118px
- MAX: absolute, top=49, h=38px, w=118px  
- Стать партнёром: absolute, top=49, h=38.34px, w=181.67px

### Discrepancy Matrix — Header

| Element | Figma value | Current value | Diff | Severity | File | Action |
|---------|-------------|---------------|------|----------|------|--------|
| Header background | нет (страница #f1f1f1) | `bg-white` | Белый фон vs прозрачный | HIGH | `SiteHeader.tsx` | Уточнить у клиента — в Figma нет белой полосы, но белый фон UX-логичен |
| Header height | ~90px (logo 64+top 26) | `h-20` = 80px | +10px | MEDIUM | `SiteHeader.tsx` | Уточнить |
| Logo image | PNG asset «аб» монограмма | `/ab-logo-mark.png` — broken | CRITICAL | `SiteHeader.tsx` | Rebuild Docker |
| Logo size in header | w=61.597 h=66.66 | w=40 h=40 | -21px/-26px | HIGH | `SiteHeader.tsx` | Уточнить — Figma logo: 61.6×66.7px |
| Logo text font | Montserrat SemiBold 18.69px | `font-gilroy font-semibold text-xl` | Шрифт! | HIGH | `SiteHeader.tsx` | Montserrat, не Gilroy |
| Logo text «Афиша Бухгалтера» | «Афиша Бухгалтера» | «Афиша Бухгалтера» | ✅ | — | — | — |
| Telegram btn h | 38px | `h-[38px]` | ✅ | — | — | — |
| Telegram btn w | 118px | авто | MEDIUM | `SiteHeader.tsx` | Добавить `w-[118px]` |
| Telegram shadow | `drop-shadow 0 0 3.092px rgba(0,0,0,0.3)` | `shadow-[0_4px_4px_0_rgba(0,0,0,0.25)]` | разные | MEDIUM | `SiteHeader.tsx` | Исправить |
| Telegram border-radius | 8.04px | `rounded-lg` = 8px | ~✅ | LOW | — | — |
| MAX btn w | 118px | авто | MEDIUM | `SiteHeader.tsx` | Добавить `w-[118px]` |
| Partner btn w | 181.67px | авто | MEDIUM | `SiteHeader.tsx` | Добавить `w-[181.67px]` |
| Partner btn font | Gilroy Bold 14.052px | `text-sm font-medium` | MEDIUM | `SiteHeader.tsx` | Gilroy Bold 14px |
| Nav gap | 1274→1400→1526 = 8px/8px | `gap-2` = 8px | ✅ | — | — | — |

---

## 5. LOGO DIAGNOSTICS

| Проверка | Результат |
|----------|----------|
| Файл в репозитории на feature-ветке | ✅ `apps/frontend/public/ab-logo-mark.png`, 15,272B, SHA `80f6e135` |
| Путь в SiteHeader.tsx | ✅ `src="/ab-logo-mark.png"` |
| Case-sensitive | ✅ совпадает с именем файла |
| Next.js Image optimization | ✅ не используется (`<img>`, не `<Image>`) |
| Dockerfile копирует public/ в runner | ✅ `COPY --from=build ... /app/apps/frontend/public` |
| next.config.mjs basePath | ✅ отсутствует |
| next.config.mjs rewrite `/ab-logo-mark.png` | ✅ отсутствует |
| nginx: блокировка `/ab-logo-mark.png` | ✅ нет deny, проксируется на frontend |
| middleware.ts: блокировка | ✅ с `MAINTENANCE_BYPASS=true` + staging host → `NextResponse.next()` |
| HTTP-ответ с staging | ⚠️ 403 — WebFetch proxy IP заблокирован сервером; проверить изнутри |

**Подтверждённая причина 404/broken image:** Docker-образ собран без feature-ветки → `public/` содержит только `.gitkeep`.

**Действие:** `docker compose -f docker-compose.prod.yml -f docker-compose.staging.yml build --no-cache frontend && ... up -d --no-deps frontend`

**Размер в Figma:** logo 61.597×66.66px (внутри контейнера 101×69px). Текущий код: `width=40 height=40`. Размер ОТЛИЧАЕТСЯ — после доставки asset уточнить у клиента.

---

## 6. HERO DISCREPANCIES

### Figma Hero (node 5913:4980)

- Position: left=211, top=132
- Width: ~1496px (до правого края)
- Height: 323px ✅
- Border-radius: 28.301px ✅ (current: 28.3px)
- Shadow: `drop-shadow(0 0 5px rgba(0,0,0,0.3))` — Figma: spread=5px radial
- Padding: `py-[41px] px-[54px]` ✅ 
- Left column width: 786px (hero-content flex: 0 0 913px в коде — РАСХОЖДЕНИЕ)
- Gradient: белый→прозрачный слева на изображении ✅

| Element | Figma | Current | Diff | Severity | Action |
|---------|-------|---------|------|----------|--------|
| Panel shadow | `0 0 5px rgba(0,0,0,0.3)` | `box-shadow: 0 4px 4px 0 rgba(0,0,0,0.25)` | offset+spread | HIGH | Исправить |
| H1 font | Montserrat Bold 43px | Montserrat Bold 43px | ✅ | — | LOCKED |
| H1 color | #0D2344 | #0D2344 | ✅ | — | LOCKED |
| H1 line-height | 1.12 | 1.3 | -0.18 | MEDIUM | Исправить |
| Subtitle | Montserrat Regular 16px, rgba текст | 16px Regular | ✅ | — | LOCKED |
| CTA button text | «Важные события» | «Важные события →» | стрелка | LOW | Уточнить |
| CTA button height | 47px | 42px | -5px | MEDIUM | Исправить |
| CTA button radius | 5.98px | 10px | +4px | MEDIUM | Исправить |
| CTA button bg | #7CD8B3 | #7CD8B3 | ✅ | — | LOCKED |
| CTA button shadow | `drop-shadow 0 0 4.271px rgba(0,0,0,0.3)` | `shadow 0 4px 4px rgba(0,0,0,0.25)` | разные | MEDIUM | Исправить |
| Hero image | hero-composition.png | hero-composition.png | ✅ имя | — | Docker rebuild |
| Hero bg outside panel | #f1f1f1 (страница) | `background: #f5f5f5` | -4 | MEDIUM | Исправить |
| Hero border | нет явного (возможно stroke internal) | `border: 1px solid rgba(0,0,0,0.15)` | ? | LOW | Уточнить по staging |

**Вывод:** Hero визуально близок, но имеет расхождения по shadow, button geometry и line-height. **Не LOCKED**, пока расхождения не исправлены.

---

## 7. EVENTS OUTER PANEL DISCREPANCIES

### Figma (5913:4752)
```
position: absolute; left: 211px; top: 480px;
width: 1497px; height: 1428px; border-radius: 35.604px;
box-shadow: 0 0 9.129px 0 rgba(0,0,0,0.3);
background: white;
```

| Element | Figma | Current | Diff | Severity | Action |
|---------|-------|---------|------|----------|--------|
| max-width | 1497px | `max-width: 1497px` | ✅ | — | APPROVED |
| min-height | 1428px | `min-height: 1428px` | ✅ | — | APPROVED |
| border-radius | 35.604px | `35.604px` | ✅ | — | APPROVED |
| shadow | `0 0 9.129px rgba(0,0,0,0.3)` | `0 0 9.129px rgba(0,0,0,0.3)` | ✅ | — | APPROVED |
| padding | top=40px, L/R=54px | `padding: 40px 54px` | ✅ | — | APPROVED |
| controls gap | 41.36px | `gap: 41.36px` | ✅ | — | APPROVED |
| controls total width | 588+41.36+760.866=1390.226px > inner 1389px | 1390.226px | +1.226px overflow | MINOR | Подстроить padding |
| margin from Hero | top 480 - (132+323) = 25px | padding: 0 16px 16px | ~16px | MEDIUM | Уточнить gap Hero→Panel |

---

## 8. FILTER DISCREPANCIES

### Figma Filter Card (5913:4888)
```
position: left=265 top=520;
width: 588px; height: 632px; border-radius: 40.23px;
box-shadow: 0 0 9.549px rgba(0,0,0,0.3);
overflow: clip; padding-left: 24.86px;
```

**Внутренний layout фильтра (из Figma positions):**

| Элемент | top (внутри карты) | visible в 632px? |
|---------|--------------------|------------------|
| «Фильтр мероприятий» | 39px | ✅ |
| «Регион / Город» label | 108.86px | ✅ |
| «Все регионы» dropdown | 149.92px (h≈49px) | ✅ |
| «Направление» label | 227.27px | ✅ |
| «Все направления» dropdown | 268.6px (h≈49px) | ✅ |
| Horizontal divider | ~320px | ✅ |
| «Формат» label (left) | 360.96px | ✅ |
| «Онлайн» checkbox | 402.8px | ✅ |
| «Офлайн» checkbox | 448.63px | ✅ |
| «Применить» button | 515.08px (h≈29px) | ✅ |
| «↻ Сбросить фильтр» | 578.49px | ✅ |
| «Статус» label (right) | 108.86px | ✅ |
| «Запланировано» | 150px | ✅ |
| «Идет сейчас» | 199.25px | ✅ |
| «Завершено» | 246.99px | ✅ |
| «Стоимость» label (right) | 360.96px | ✅ |
| «Бесплатно» | 403.75px | ✅ |
| «Платно» | 448.63px | ✅ |
| Дубли элементов за пределами 632px | 805-976px | ❌ клипованы |

**Вертикальный разделитель:** imgLine157 — вертикальная линия разделяет левый и правый столбцы.
**Горизонтальный разделитель:** imgLine158 — отделяет секцию «Регион+Направление / Статус» от «Формат / Стоимость».

| Element | Figma | Current | Diff | Severity |
|---------|-------|---------|------|----------|
| Card W | 588px | `width: 588px` | ✅ | APPROVED |
| Card H | 632px | `height: 632px` | ✅ | APPROVED |
| Card radius | 40.23px | `40.23px` | ✅ | APPROVED |
| Card shadow | `0 0 9.549px rgba(0,0,0,0.3)` | `0 0 9.549px rgba(0,0,0,0.3)` | ✅ | APPROVED |
| Left col width | 236px | `grid-template-columns: 236px 1fr` | ✅ | APPROVED |
| Column gap | ~96px (357-236-24.86=~96px) | `column-gap: 96px` | ✅ | APPROVED |
| Title font | Montserrat Bold 21px | `font-size: 21px; font-weight: 700` | ✅ | — |
| Label font | Montserrat SemiBold 17px | `font-size: 17px; font-weight: 600` | ✅ | — |
| Checkbox size | 23.083px | `width: 16px` (CSS) | -7px | HIGH | Исправить |
| Checkbox radius | 4.617px | `border-radius: 4px` | ~✅ | LOW | — |
| Checkbox border | 1.385px solid #e8e3dc | `1.5px solid rgba(0,0,0,0.3)` | цвет! | MEDIUM | Исправить цвет |
| Dropdown W (left) | 236.821px | `w-[236.821px]` | ✅ | — | — |
| Dropdown border | 1.154px #e8e3dc | ~`border: 1px solid #e8e3dc` | ✅ | — | — |
| Dropdown radius | 9.233px | `border-radius: 9.233px` | ✅ | — | — |
| Apply button W | ~234px центр | `width: 231px; margin: auto` | ~✅ | — | — |
| Apply button H | ~49.7px | `height: 48px` | ~✅ | LOW | — |
| Apply button shadow | `0 0 9.549px rgba(0,0,0,0.3)` | текущая реализация | проверить | MEDIUM | — |
| Status dots (цвета) | Запланировано #7cd8b3, Идет #ffdb99, Завершено #a3a3a3 | переменные CSS | ✅ | — | — |
| Vertical divider line | да | нет в текущем CSS | MISSING | MEDIUM | Добавить |
| Horizontal divider line | да | нет в текущем CSS | MISSING | MEDIUM | Добавить |

---

## 9. CALENDAR DISCREPANCIES

### Figma Calendar (5913:4757)
```
width: 760.866px; height: 631.824px; border-radius: 40.228px;
background: rgba(255,255,255,0.21); 
box-shadow: 0 0 9.355px 0 rgba(0,0,0,0.3);
padding: 28.066px 26.764px 28.066px 41.102px;
gap between header and grid: 29.002px;
```

**Figma calendar grid (5913:4763):**
- `gap-[9.355px]` between rows
- 7 columns, cell size = `31.808×31.808px`
- Weekday text: Montserrat SemiBold 19px, `size-[31.808px]` cell
- Day numbers: Montserrat SemiBold 23px
- Active day (06): `drop-shadow-[0px_0px_4.779px_rgba(0,0,0,0.3)]`, rounded `93.554px`, `h-[43.014px] w-[43.97px]` — mint highlight
- Prev-month days: `text-[#777]`
- Weekend (Сб/Вс): `text-black` same weight — no color difference in Figma
- Calendar grid image overlay: `absolute h-[450.211px] left-[907.74px] top-[670.46px] w-[736.013px]` — grid lines are an IMAGE asset (imgLine3)
- Calendar month header: `gap-[18.711px]` between month and year spans

**Calendar decorative elements (на слое страницы, не внутри карты):**
- Зелёная подсветка: `absolute bg-[rgba(124,216,179,0.23)] h-[425px] left-[1442px] top-[695px] w-[202px]` — правый декоративный акцент
- Верхний градиент: `bg-gradient-to-b from-[rgba(255,255,255,0)] to-[rgba(152,224,195,0.48)]`
- Навигационные стрелки: Component12 `h-[11.47px] w-[42.343px]` — ДВОЙНАЯ стрелка (‹ и ›)
- Подсветка выбранного дня: Component13 — `bg-[#7cd8b3] border border-[#367d67]` cell highlight

| Element | Figma | Current | Diff | Severity |
|---------|-------|---------|------|----------|
| W | 760.866px | `760.866px` | ✅ | APPROVED |
| H | 631.824px | `631.824px` | ✅ | APPROVED |
| radius | 40.228px | `40.228px` | ✅ | APPROVED |
| shadow | `0 0 9.355px rgba(0,0,0,0.3)` | `0 0 9.355px rgba(0,0,0,0.3)` | ✅ | APPROVED |
| bg | rgba(255,255,255,0.21) | `rgba(255,255,255,0.21)` | ✅ | APPROVED |
| padding | 28.066 26.764 28.066 41.102 | ✅ | APPROVED | — |
| header gap | 29.002px | `gap: 29.002px` | ✅ | APPROVED |
| row gap | 9.355px | `gap-[9.355px]` | ✅ | APPROVED |
| cell size | 31.808×31.808px | `size-[31.808px]` | ✅ | APPROVED |
| weekday font | Montserrat SemiBold 19px | `font-size: 19px; font-weight: 600` | ✅ | APPROVED |
| day number font | Montserrat SemiBold 23px | `font-size: 23px; font-weight: 600` | ✅ | APPROVED |
| month font | Montserrat SemiBold 30px | `font-size: 30px; font-weight: 600` | ✅ | APPROVED |
| year font | Montserrat Regular 30px | `font-size: 30px; font-weight: 400` | ✅ | APPROVED |
| month+year gap | 18.711px | проверить | MEDIUM | Проверить |
| Active day style | drop-shadow + rounded oval (43×44px) | проверить в EventCalendar | MEDIUM | Проверить |
| Nav arrows | Component12: double-arrow image, w=42.343px | кастомные SVG-стрелки | MEDIUM | Сравнить визуально |
| Grid lines overlay | IMAGE asset (imgLine3 from Figma) | CSS border-bottom в ячейках? | MEDIUM | Проверить |
| Right green accent | rgba(124,216,179,0.23) 202×425px | отсутствует в коде | HIGH | Добавить |
| Right gradient | rgba(152,224,195,0.48) | отсутствует в коде | HIGH | Добавить |

---

## 10. EVENT CARDS DATA BLOCKER

| Параметр | Статус |
|----------|--------|
| PUBLISHED events в staging DB | ❌ ОТСУТСТВУЮТ |
| API `/api/events/public` | работает (возвращает пустой массив или isFallback) |
| CSS Event Card | НЕ МОЖЕТ быть проверен без данных |

**Figma значения карточки события (5913:4826):**

| Element | Figma |
|---------|-------|
| Card W | 428px |
| Card H | 300px |
| Card radius | 18.814px / 20px |
| Card shadow | `0 0 9.129px rgba(0,0,0,0.3)` |
| Image area H | 183px |
| Image radius | rounded-tl+tr 18.814px |
| Status badge H | 27px, radius 8.362px |
| Status badge shadow | `0 0 9.129px rgba(0,0,0,0.3)` |
| Status badge left | 19px, top 16-16.73px |
| Status badge W | Завершено=94px, Запланировано=120px, Идет=102px |
| Date block W | 78px, H 97px, radius 3.652px |
| Date block shadow | `drop-shadow 0 0 4.565px rgba(0,0,0,0.3)` |
| Date day font | Montserrat Bold 29px |
| Date month font | Montserrat Bold 18px |
| Title font | Montserrat SemiBold 14px, uppercase, line-height 1.3 |
| «Подробнее» | W≈99px H≈26px, radius 1.503px, `drop-shadow 0 0 3.757px rgba(0,0,0,0.3)` |
| «Подробнее» font | Montserrat SemiBold 12px |
| Grid: 3 columns | gap≈48px H, ≈329px V | Confirm on staging |

**Действие:** Создать staging seed (6+ PUBLISHED events). После появления данных — провести CSS-аудит карточек.

---

## 11. MAIN EVENTS CAROUSEL DATA BLOCKER

| Параметр | Статус |
|----------|--------|
| `mainEvent=true AND status=PUBLISHED` в staging DB | ❌ ОТСУТСТВУЮТ |
| Компонент `MainEventsBanner.tsx` | ✅ существует |
| Условие рендера `main.length > 0` | ✅ корректно |
| API `/api/events/public/main` | работает, возвращает `[]` |

**⚠️ АРХИТЕКТУРНОЕ РАСХОЖДЕНИЕ:**

В Figma Carousel и Quotes находятся в ОДНОМ контейнере:
```
absolute bg-white h-[945px] left-[212px] rounded-[20px]
shadow-[0px_0px_10px_0px_rgba(0,0,0,0.3)] top-[1933px] w-[1496px]
```

- «Главные события» H2: top=1958-1933=25px от верха панели, Montserrat Bold **26px** (текущий код: 24px)
- Carousel gallery: top=2018-1933=85px, w=1388px, h=428px
- Quote text: top=2561-1933=628px от верха панели
- Side illustrations: top~583-590px от верха панели

| Element | Figma | Current | Diff | Severity |
|---------|-------|---------|------|----------|
| Carousel+Quotes container | единый белый блок | два отдельных компонента | АРХИТЕКТУРА | HIGH |
| Carousel panel H | входит в 945px | `.pub-carousel-gallery { height: 428px }` | в порядке | — |
| Carousel panel shadow | `0 0 10px rgba(0,0,0,0.3)` | `box-shadow: 0 4px 4px 0 rgba(0,0,0,0.25)` | разные | MEDIUM |
| H2 «Главные события» font | Montserrat Bold **26px** | `font-size: 24px` | -2px | MEDIUM |
| H2 color | #0D2344 | #0D2344 | ✅ | — |
| Gallery W | 1388px | `width: 1388px` (max-w-[1496px] - 2×54px) | ✅ | — |
| Gallery H | 428px | `.pub-carousel-gallery { height: 428px }` | ✅ | — |
| Card dimensions (center) | 427×428px (main card) | `width: 268px height: 395px` | LARGE DIFF | HIGH |
| Card fan offsets | ±310/±545px, scale 0.82/0.68 | `translateX(±310) scale(0.82)` | ✅ логика | — |
| Card border-radius | 18.259px | `border-radius: 16px` | -2px | LOW |
| Dots position | top=2480, left=921 = center | flex justify-center | ✅ | — |
| Quote block | входит в этот же белый блок | отдельная секция (bg #f8f9fc) | НЕВЕРНО | HIGH |

---

## 12. QUOTES DISCREPANCIES

**Figma Quotes (Component1, 5913→):**
- Dimensions: h=214px, w=744px, center-positioned
- Side illustrations:
  - Left: 302×362px image (top≈583px внутри панели, left=212 → edge)
  - Right: 287×359px image (top≈586px внутри панели, right edge)
- Quote text: Gilroy Regular 20px, `line-height: 24px`, color rgba(0,0,0,0.62)
- Background: `bg-[#f5f5f5]` под текстом (или прозрачный внутри белой панели)
- Декоративная рамка вокруг цитаты: из img asset

| Element | Figma | Current | Diff | Severity |
|---------|-------|---------|------|----------|
| Фон секции | внутри белого блока (bg-white) | `.quotes-section { background: #f8f9fc }` | НЕВЕРНО | HIGH |
| Расположение | внутри Carousel+Quotes панели | отдельная секция под Carousel | АРХИТЕКТУРА | HIGH |
| Quote font | Gilroy Regular 20px, lh=24px | `font-size: clamp(1.05rem...1.35rem)` + Gilroy | SIZE | MEDIUM |
| Quote color | rgba(0,0,0,0.62) | `color: var(--color-primary)` = #0D2344 | ЦВЕТ | MEDIUM |
| Side illustrations | 2 декоративных изображения | ОТСУТСТВУЮТ | CRITICAL | HIGH |
| Decorative frame/border | имеется | `quotes-mark { font-size: 3.5rem }` (кавычки) | MEDIUM | — |
| Quotes condition | qs.length > 0 | qs.length > 0 | ✅ | — |
| Staging data | ❌ нет quotes в DB | — | BLOCKER | — |

---

## 13. FOOTER DISCREPANCIES

**⚠️ КРИТИЧЕСКОЕ АРХИТЕКТУРНОЕ РАСХОЖДЕНИЕ**

В Figma Footer — на СВЕТЛОМ фоне страницы (`#f1f1f1`). Текст — ТЁМНЫЙ (#1e1e1e, #323232, rgba(0,0,0,0.5)).

В текущем коде Footer — `background: var(--color-primary)` = тёмно-синий `#0D2344`. Весь цветовой инвертированный.

**Figma Footer layout:**
- Logo section: left=193, top=3003 → Logo image (52.981×57.336px) + «Афиша Бухгалтера» текст 13.83px Montserrat SemiBold
- «Мероприятия для бухгалтеров по всей России» (подпись): Gilroy Regular 21px, color black
- «Наши проекты» column (left=667): Gilroy Bold 16px заголовок + Regular 16px ссылки (АБ Партнер, АБ Онлайн-касса, АБ Ресторан, АБ Сервис, АБ Креатив)
- Contacts (left=905): телефон Gilroy SemiBold 16px, часы Regular 16px, email Regular 16px, адрес Regular 16px с иконкой
- Vertical dividers (left=609, 844): линии между колонками
- Decorative notebook image: right side, top=2910, rotated 4.07deg
- Divider line: top=3308, h=0 (горизонтальный)
- Copyright bar: top=3346, h=72, Montserrat SemiBold 15px, rgba(0,0,0,0.5)

| Element | Figma | Current | Diff | Severity |
|---------|-------|---------|------|----------|
| Background | страница #f1f1f1 (светлый) | `background: #0D2344` (тёмный) | ИНВЕРТ | CRITICAL |
| Text color | тёмный (#1e1e1e, #323232) | светлый (rgba(255,255,255,...)) | ИНВЕРТ | CRITICAL |
| Logo | PNG asset + text | текстовый заменитель «АБ» | MEDIUM | HIGH |
| Footer width | 1496px | `max-width: 1496px` | ✅ | — |
| «Наши проекты» items | АБ Партнер, АБ Онлайн-касса, АБ Ресторан, АБ Сервис, АБ Креатив | АБ Партнёр, Telegram-канал, MAX-канал | КОНТЕНТ | HIGH |
| Contacts: телефон | +7(929) 838 64 82 | `process.env.NEXT_PUBLIC_CONTACT_EMAIL` | ДРУГОЙ | HIGH |
| Contacts: email | info@afisha-buhgaltera.ru | env var | ДРУГОЙ | HIGH |
| Contacts: адрес | Россия, г. Краснодар | ОТСУТСТВУЕТ | MISSING | MEDIUM |
| Decorative notebook | rotated mint notebook image | ОТСУТСТВУЕТ | MISSING | MEDIUM |
| Vertical dividers | 2 линии между колонками | ОТСУТСТВУЮТ | MISSING | LOW |
| Copyright font | Montserrat SemiBold 15px | Gilroy 0.75rem | FONT | MEDIUM |
| Copyright text | полный юридический текст 1 абзац | краткий «© год АБ Афиша Бухгалтера» | КОНТЕНТ | HIGH |
| Legal links | ОТСУТСТВУЮТ в Figma footer | есть в коде | EXTRA | LOW |

**Figma copyright text (verbatim):**
> «© 2022-2026. Официальный сайт интернет-площадка АБ Афиша Бухгалтера в России. Текущий сайт является объектом авторского права, исключительные права, на использование которого принадлежат компании ООО «Автоматизация Бизнеса». Копирование, размножение, распространение, перепечатка (целиком или частично), или иное использование материала без письменного разрешения компании не допускается. Любое нарушение прав автора будет преследоваться на основе российского и международного законодательства.»

---

## 14. GLOBAL GRID AND BACKGROUND

| Element | Figma | Current | Diff | Severity |
|---------|-------|---------|------|----------|
| Page background | `#f1f1f1` | `#f5f5f5` | -4 lightness | MEDIUM |
| Content max-width | 1496-1497px (consistent) | разные max-width по блокам | ~✅ | LOW |
| Left margin | 211-265px от левого края | centered, `padding: 0 16px` | разные | MEDIUM |
| Vertical rhythm Hero→Panel | 480-(132+323)=25px | зависит от padding | проверить | MEDIUM |
| No scale/transform on page | ✅ | ✅ | ✅ | — |
| Responsive breakpoints | только desktop 1920 в Figma | mobile/tablet breakpoints | ✅ нормально | — |

**Выравнивание контентных блоков по Figma:**
- Header logo: left=197, right nav: right≈1708
- Hero: left=211, right=211+1496=1707
- Outer Events Panel: left=211, right=211+1497=1708
- Carousel+Quotes panel: left=212, right=212+1496=1708
- Footer content: left=193, right~1708

→ Все блоки выровнены по осям left≈211-212px и right≈1708px. Текущий `max-width` + `mx-auto` с `padding: 0 16px` при 1920px viewport даёт margin = (1920-1497)/2 = 211.5px — **совпадает** с Figma.

---

## 15. EXACT FILES TO CHANGE

| Приоритет | Файл | Что изменить |
|-----------|------|--------------|
| 1 | Docker → сервер | Rebuild + push из feature-ветки |
| 2 | `SiteHeader.tsx` | Logo size 61.6×66.7, font Montserrat, btn widths, shadow, header bg |
| 3 | `globals.css` | page bg #f1f1f1, hero shadow, hero btn height/radius/shadow, hero H1 lh |
| 4 | `globals.css` | Calendar: right green accent, right gradient |
| 5 | `globals.css` | Filter: checkbox size 23px, checkbox border color #e8e3dc, dividers |
| 6 | НОВЫЙ wrapper | Объединить Carousel + Quotes в единый белый контейнер 945px |
| 7 | `globals.css` | Carousel: panel shadow fix, H2 font 26px, card center size |
| 8 | `SiteFooter.tsx` + CSS | Полная переработка: светлый фон, правильные колонки/контакты/copyright |
| 9 | Staging seed | 6+ PUBLISHED events, 5+ mainEvent=true, quotes |

---

## 16. IMPLEMENTATION ORDER

| Этап | Блок | Условие | Статус |
|------|------|---------|--------|
| 1 | Logo delivery | Docker rebuild | ⏳ Ожидает deploy |
| 2 | Header final | После logo | ⏳ После утверждения |
| 3 | Hero final verification | Staging access | ⏳ После deploy |
| 4 | Page background #f1f1f1 | — | ⏳ После утверждения |
| 5 | Outer Events Panel | Уже APPROVED | ✅ DONE |
| 6 | Filter CSS (checkbox size, dividers) | — | ⏳ После утверждения |
| 7 | Calendar decorative accents | — | ⏳ После утверждения |
| 8 | Staging data seed | Deploy ready | ⏳ Blocker |
| 9 | Event Cards CSS audit | После seed | ⏳ Blocker |
| 10 | Carousel+Quotes architecture | После seed | ⏳ После утверждения |
| 11 | Footer redesign (light bg) | После утверждения | ⏳ CRITICAL |
| 12 | Full page visual QA | Все блоки done | ⏳ |

---

## 17. LOCKED ELEMENTS

| Элемент | Статус | Причина |
|---------|--------|---------|
| Hero H1 текст | ✅ LOCKED | Совпадает, не менять |
| Hero H1 шрифт (Montserrat Bold 43px) | ✅ LOCKED | Совпадает |
| Hero subtitle | ✅ LOCKED | Совпадает |
| Hero CTA цвет (#7CD8B3) | ✅ LOCKED | Совпадает |
| Hero gradient (image→white) | ✅ LOCKED | Совпадает |
| Outer Events Panel geometry | ✅ APPROVED | Stage 44E.2 |
| Filter card W/H/radius/shadow | ✅ APPROVED | Stage 44E.2 |
| Calendar card W/H/radius/shadow/bg | ✅ APPROVED | Stage 44E.2 |
| Calendar typography | ✅ APPROVED | Stage 44E.2 |
| Block order | ✅ CONFIRMED | Stage 44E.5 |
| Header sticky removed | ✅ DONE | Stage 44E.5 |

---

## 18. DATA-ONLY BLOCKERS

| Компонент | Blocker | Действие |
|-----------|---------|----------|
| Event Cards | нет PUBLISHED events в staging | staging seed |
| Main Events Carousel | нет mainEvent=true PUBLISHED | staging seed |
| Quotes | нет quotes в staging DB | staging seed |
| Logo/Hero image | Docker из main ветки | Docker rebuild |

---

## СВОДНАЯ ТАБЛИЦА SEVERITY

| # | Элемент | Severity | Файл |
|---|---------|----------|------|
| 1 | Logo broken (Docker) | **CRITICAL** | Сервер |
| 2 | Footer: тёмный вместо светлого фона | **CRITICAL** | `SiteFooter.tsx` |
| 3 | Footer: неправильные контент-колонки | **CRITICAL** | `SiteFooter.tsx` |
| 4 | Carousel+Quotes: разные контейнеры вместо одного | **HIGH** | архитектура |
| 5 | Header: logo text шрифт Gilroy вместо Montserrat | **HIGH** | `SiteHeader.tsx` |
| 6 | Header: logo size 40×40 вместо 61.6×66.7 | **HIGH** | `SiteHeader.tsx` |
| 7 | Calendar: отсутствует правый зелёный акцент | **HIGH** | `globals.css` |
| 8 | Quotes: side illustrations отсутствуют | **HIGH** | `RotatingQuotesBlock.tsx` |
| 9 | Quotes: фон #f8f9fc вместо white | **HIGH** | `globals.css` |
| 10 | Filter: checkbox 16px вместо 23px | **HIGH** | `globals.css` |
| 11 | Hero: shadow расходится | **HIGH** | `globals.css` |
| 12 | Hero: H1 line-height 1.3 вместо 1.12 | **MEDIUM** | `globals.css` |
| 13 | Hero: CTA height 42px вместо 47px | **MEDIUM** | `globals.css` |
| 14 | Hero: CTA radius 10px вместо 5.98px | **MEDIUM** | `globals.css` |
| 15 | Page background #f5f5f5 вместо #f1f1f1 | **MEDIUM** | `globals.css` |
| 16 | Carousel H2: 24px вместо 26px | **MEDIUM** | `globals.css` |
| 17 | Carousel panel shadow | **MEDIUM** | `globals.css` |
| 18 | Filter: checkbox border color | **MEDIUM** | `globals.css` |
| 19 | Filter: divider lines отсутствуют | **MEDIUM** | `globals.css` |
| 20 | Controls overflow +1.226px | **MINOR** | `globals.css` |
