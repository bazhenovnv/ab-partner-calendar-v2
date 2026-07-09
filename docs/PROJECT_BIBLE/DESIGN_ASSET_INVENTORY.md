# DESIGN ASSET INVENTORY — АБ Афиша

**Дата:** 2026-07-09  
**Этап:** Stage 41.8  
**Метод:** Полная инвентаризация `project-assets/`, `apps/frontend/public/`, кода фронтенда

**Статусы:**
- ✅ AVAILABLE — оригинал присутствует и пригоден для production
- ⚠ PARTIAL — частично: есть скриншот или программная реализация, но нет оригинального ассета
- ❌ MISSING — ассет отсутствует полностью

---

## 1. Брендинг и идентика

| Asset | Статус | Исходник | Используется | Путь | Комментарий |
|-------|--------|----------|--------------|------|-------------|
| Logo SVG (вектор) | ⚠ PARTIAL | `Frame 60.png` — PNG-референс; SVG-файла нет | ✅ Да — inline SVG-аппроксимация в коде | `project-assets/03_logo_frames/Frame 60.png` (694×575px PNG) | SVG построена вручную по PNG-референсу в `SiteHeader.tsx`. Оригинальный SVG / Figma export отсутствует. Запросить у дизайнера для точной доработки в v1.1. |
| Logo PNG | ✅ AVAILABLE | `Frame 60.png` — 694×575 PNG, ч/б | ✅ Как референс | `project-assets/03_logo_frames/Frame 60.png` | Достаточно как визуальный референс для кода. Не подходит для прямого использования в интерфейсе (ч/б без адаптации цвета). |
| Logo PNG variant | ✅ AVAILABLE | `Frame 60(1).png` | ✅ Как референс | `project-assets/03_logo_frames/Frame 60(1).png` | Вариант монограммы. |
| Favicon | ⚠ PARTIAL | Нет дизайн-макета; генерируется программно | ✅ Да | `apps/frontend/src/app/icon.tsx` | Next.js ImageResponse 32×32px, navy/mint, текст «АБ». Не использует реальный вектор монограммы. |
| OG Image | 🔵 OPTIONAL | Дизайн-макет не предусматривался; генерируется программно | ✅ Да | `apps/frontend/src/app/opengraph-image.tsx` | Программный 1200×630, navy фон (#0D2344), mint акцент. Пригоден для production. Иллюстрированный вариант — v1.1+ по запросу. |
| Gilroy font files | ❌ MISSING | Нет в проекте | ❌ Нет | — | Используется в макете для бейджей, цитат, footer. Требуется лицензия + файлы. |

---

## 2. Публичный сайт — Header

| Asset | Статус | Исходник | Используется | Путь | Комментарий |
|-------|--------|----------|--------------|------|-------------|
| Header layout | ✅ AVAILABLE | Figma скриншот `{D2CF8AB4}` + PDF макет | ✅ Да | `SiteHeader.tsx` | Полностью реализован по макету. Inline SVG иконки. |
| Telegram icon (header) | ✅ AVAILABLE | Inline SVG в коде | ✅ Да | `SiteHeader.tsx` | Inline SVG path. Не требует внешнего файла. |
| MAX icon (header) | ✅ AVAILABLE | Inline SVG в коде | ✅ Да | `SiteHeader.tsx` | Inline SVG circle+arrow. |
| Partner icon (header) | ✅ AVAILABLE | Inline SVG в коде | ✅ Да | `SiteHeader.tsx` | Inline SVG person-outline. |

---

## 3. Публичный сайт — Hero

| Asset | Статус | Исходник | Используется | Путь | Комментарий |
|-------|--------|----------|--------------|------|-------------|
| Hero layout | ✅ AVAILABLE | Figma скриншот `{D2CF8AB4}` + PDF | ✅ Да (текстовая часть) | `HeroSection.tsx`, `globals.css` | Заголовок + подзаголовок + CTA реализованы. |
| Hero composition (декоративное фото) | ❌ MISSING | Виден в Figma-скриншоте `{D2CF8AB4}`, standalone файла нет | ❌ Нет | — | Настольный календарь + белая ваза + книги + ручка. Только в embedded-виде в скриншоте ~680×280px. Для production недостаточно. Запросить у дизайнера. |
| Hero calendar icon (CTA-кнопка) | ✅ AVAILABLE | Inline SVG в коде | ✅ Да | `HeroSection.tsx` | Маленький иконочный календарь в кнопке «Главные события». |

---

## 4. Публичный сайт — Calendar

| Asset | Статус | Исходник | Используется | Путь | Комментарий |
|-------|--------|----------|--------------|------|-------------|
| Calendar component | ✅ AVAILABLE | Figma `{8BF653BB}`, `{F821DD8F}` | ✅ Да | `EventCalendar.tsx`, `globals.css` | CSS/React реализация. Иконок/PNG не требует. |
| Calendar nav icons (‹ ›) | ✅ AVAILABLE | Inline SVG | ✅ Да | `CalendarHeader.tsx` | Chevron inline SVG. |
| Calendar filter icons | ✅ AVAILABLE | Inline SVG | ✅ Да | `EventFilters.tsx` | Inline SVG в коде. |

---

## 5. Публичный сайт — Event Cards

| Asset | Статус | Исходник | Используется | Путь | Комментарий |
|-------|--------|----------|--------------|------|-------------|
| EventCard layout | ✅ AVAILABLE | Figma `{B047A5A6}`, `{BD2248DD}` | ✅ Да | `EventCard.tsx` | UPPERCASE заголовок, дата-бейдж (24pt+11pt), chip-теги, кнопка «Подробнее» — реализованы. |
| Event images (thumbnail) | ⚠ PARTIAL | Из внешних URL backend API | ✅ В runtime | `EventCard.tsx` (next/image) | Реальные фото приходят из backend. Fallback — серый фон. Статических файлов нет. |
| Status badge icons | ✅ AVAILABLE | CSS + текст | ✅ Да | `globals.css` | Текстовые бейджи, цветовые классы. |
| Empty state (нет событий) | ✅ AVAILABLE | Inline SVG | ✅ Да | `EventsSection.tsx:201` | Иконка-календарь + галочка inline SVG. |

---

## 6. Публичный сайт — Main Events Banner

| Asset | Статус | Исходник | Используется | Путь | Комментарий |
|-------|--------|----------|--------------|------|-------------|
| MainEventsBanner layout | ✅ AVAILABLE | Figma `{FBB54E41}` | ✅ Да | `MainEventsBanner.tsx` | Горизонтальная карусель, navy фон, 2/4 карточки — реализована Stage 41.6. |
| Banner thumbnails (event images) | ⚠ PARTIAL | Из backend API | ✅ В runtime | `MainEventsBanner.tsx` | Реальные фото из backend. Fallback — navy gradient. |
| Nav arrows (‹ ›) | ✅ AVAILABLE | CSS text | ✅ Да | `MainEventsBanner.tsx` | Символы «‹» и «›». |
| Nav dots | ✅ AVAILABLE | CSS circles | ✅ Да | `MainEventsBanner.tsx` | CSS-реализация. |

---

## 7. Публичный сайт — Footer

| Asset | Статус | Исходник | Используется | Путь | Комментарий |
|-------|--------|----------|--------------|------|-------------|
| Footer layout | ✅ AVAILABLE | PDF макет | ✅ Да (2 колонки) | `SiteFooter.tsx` | Реализованы 2 из 4 колонок. «Категории» и «О проекте» — v1.1 (D-13). |
| Footer legal text | ✅ AVAILABLE | Текст в коде | ✅ Да | `SiteFooter.tsx` | «ООО АБ ГРУПП · ОГРН · ИНН» присутствует. |

---

## 8. Публичный сайт — Cookie Banner

| Asset | Статус | Исходник | Используется | Путь | Комментарий |
|-------|--------|----------|--------------|------|-------------|
| Cookie banner | ✅ AVAILABLE | Продуктовое решение | ✅ Да | `CookieBanner.tsx` | CSS/текст реализация. Иконок не требует. |

---

## 9. Публичный сайт — Maintenance Page

| Asset | Статус | Исходник | Используется | Путь | Комментарий |
|-------|--------|----------|--------------|------|-------------|
| Maintenance illustration | ✅ AVAILABLE | `public/maintenance.png` (1536×1024px RGBA) | ✅ Да | `apps/frontend/public/maintenance.png` | Файл присутствует, используется как fallback когда backend не задал imageUrl. |
| Maintenance page layout | ⚠ PARTIAL | Генерируемый макет `{05AEF39C}` — dark theme; production-страница другая | ✅ Да (минималистичная) | `apps/frontend/src/app/maintenance/page.tsx` | D-04 намеренно не исправляется. Standalone карточка без Header/Footer — продуктовое решение. |

---

## 10. Публичный сайт — 404 Page

| Asset | Статус | Исходник | Используется | Путь | Комментарий |
|-------|--------|----------|--------------|------|-------------|
| 404 page | ✅ AVAILABLE | Продуктовое решение (ACC-FIX-3) | ✅ Да | `apps/frontend/src/app/not-found.tsx` | Брендированная 404 с PublicShell, SVG-иконка, CTA «На главную». |

---

## 11. Публичный сайт — RotatingQuotes / Цитаты

| Asset | Статус | Исходник | Используется | Путь | Комментарий |
|-------|--------|----------|--------------|------|-------------|
| Quotes layout | ⚠ PARTIAL | Figma `{E539CD30}` — виден блок цитат | ✅ Да | `RotatingQuotesBlock.tsx` | Реализован. Шрифт Gilroy для цитат отсутствует (D-07). |
| Quotes decorative marks («») | ✅ AVAILABLE | CSS pseudo-elements / символы | ✅ Да | `globals.css` | Mint двойные кавычки. |

---

## 12. Публичный сайт — Reminders Block

| Asset | Статус | Исходник | Используется | Путь | Комментарий |
|-------|--------|----------|--------------|------|-------------|
| Reminders block | ✅ AVAILABLE | Продуктовое решение | ✅ Да | `RemindersBlock.tsx` | CSS-макет уведомления, inline SVG колокольчик. |
| Telegram icon (reminders) | ✅ AVAILABLE | Inline SVG | ✅ Да | `RemindersBlock.tsx` | Inline SVG path. |
| MAX icon (reminders) | ✅ AVAILABLE | Inline SVG | ✅ Да | `RemindersBlock.tsx` | Inline SVG. |

---

## 13. Публичный сайт — HowItWorks Block

| Asset | Статус | Исходник | Используется | Путь | Комментарий |
|-------|--------|----------|--------------|------|-------------|
| HowItWorks icons (3 шт.) | ✅ AVAILABLE | Inline SVG | ✅ Да | `HowItWorksBlock.tsx` | Три inline SVG иконки (поиск, кнопка, уведомление). |

---

## 14. Event Detail Page

| Asset | Статус | Исходник | Используется | Путь | Комментарий |
|-------|--------|----------|--------------|------|-------------|
| Event detail layout | ✅ AVAILABLE | Figma `{C43AB1A6}`, `{1308F3F4}` | ✅ Да | `apps/frontend/src/app/events/[id]/page.tsx` | |
| Event detail image | ⚠ PARTIAL | Из backend API | ✅ В runtime | `apps/frontend/src/app/events/[id]/page.tsx` | Реальное фото из backend. Статического файла нет. |
| Telegram icon (detail actions) | ✅ AVAILABLE | Inline SVG | ✅ Да | `EventDetailActions.tsx` | |
| MAX icon (detail actions) | ✅ AVAILABLE | Inline SVG | ✅ Да | `EventDetailActions.tsx` | |
| ICS icon (detail actions) | ✅ AVAILABLE | Inline SVG | ✅ Да | `EventDetailActions.tsx` | |

---

## 15. Legal Pages

| Asset | Статус | Исходник | Используется | Путь | Комментарий |
|-------|--------|----------|--------------|------|-------------|
| Privacy policy | ✅ AVAILABLE | Текстовый контент в коде | ✅ Да | `apps/frontend/src/app/legal/privacy/page.tsx` | Текст без иллюстраций. |
| Cookies policy | ✅ AVAILABLE | Текстовый контент в коде | ✅ Да | `apps/frontend/src/app/legal/cookies/page.tsx` | Текст без иллюстраций. |

---

## 16. Admin Panel

| Asset | Статус | Исходник | Используется | Путь | Комментарий |
|-------|--------|----------|--------------|------|-------------|
| Admin дизайн-макеты | — N/A | Отдельные дизайн-макеты не предусматривались | ✅ Да | — | Админка проектируется на основе общей дизайн-системы проекта (`adm-*` CSS). Figma-макеты для admin не планировались и не требуются. |
| Admin icons (sidebar/actions) | ✅ AVAILABLE | Inline SVG | ✅ Да | `AdminLayoutClient.tsx`, страницы admin | Все иконки inline SVG. |
| Broadcast illustrations | ✅ AVAILABLE | Inline SVG / CSS | ✅ Да | Admin broadcast pages | CSS-карточки. |

---

## Итоговая сводка

| Статус | Кол-во | Позиции |
|--------|--------|---------|
| ✅ AVAILABLE | 30 | Logo PNG, maintenance.png, все inline SVG, все CSS-компоненты, Cookie Banner, 404, HowItWorks, Reminders, Legal, Admin icons |
| ⚠ PARTIAL | 8 | Logo SVG (нет оригинала), Favicon, OG Image, Event images (runtime), Banner thumbnails (runtime), Maintenance layout, Quotes (нет Gilroy), Event detail image (runtime) |
| ❌ MISSING | 2 | **Hero composition** (фото), **Gilroy font** |
| 🔵 OPTIONAL | 1 | **OG Image** (программный вариант пригоден для production; иллюстрированный — по запросу) |
| — N/A | 1 | **Admin дизайн-макеты** (не предусматривались; реализовано на общей дизайн-системе) |

---

## Что требует запроса у дизайнера

| Приоритет | Asset | Описание |
|-----------|-------|----------|
| 🔴 HIGH | **Hero composition** | PNG с прозрачным фоном ≥800×400px: календарь + ваза + книги + ручка |
| 🟡 MEDIUM | **Logo SVG** | Векторный файл монограммы «аб» (SVG / AI / Figma export) |
| 🟡 MEDIUM | **Gilroy font** | Файлы шрифта + лицензия (Regular, Medium) |
| 🟢 LOW | **OG Image макет** | Если требуется branded OG, не программный |
| 🟢 LOW | **Favicon с монограммой** | После получения SVG логотипа |
| 🟢 LOW | **Logo SVG** | После получения SVG: обновить favicon и проверить точность аппроксимации в `SiteHeader.tsx` |

---

*Инвентаризация проведена: Stage 41.8, 2026-07-09.*  
*Следующее обновление: при получении ассетов от дизайнера.*
