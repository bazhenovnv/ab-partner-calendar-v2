# MISSING DESIGN ASSETS — АБ Афиша

**Дата:** 2026-07-09  
**Этап:** Stage 41.8 — Design Assets Inventory  

Документ фиксирует дизайн-материалы, которые отсутствуют в проекте в виде пригодных к production исходников.

---

## HERO COMPOSITION

**Статус:** ✅ AVAILABLE — получен и реализован (Stage 41.10)

**Описание:**  
В утверждённом макете (`АБ Афиша main(4).pdf`, экран `{D2CF8AB4}`) присутствует декоративная фото-композиция в правой части Hero-секции:

- настольный календарь (тил/мятный, раскрытый, стоит вертикально);
- белая ребристая ваза с белыми цветами (гипсофила);
- стопка книг с подписями: «Налоговый кодекс», «Бухгалтерский учет», «Финансовая отчетность», «Правовое регулирование»;
- белая/мятная ручка.

**Официальный путь:** `project-assets/hero/hero-composition.png`  
**Размер файла:** 693×323px, PNG RGBA, 317 KB  
**Используется в:** `apps/frontend/src/components/HeroSection.tsx` (right side, `aria-hidden="true"`)  
**Публичный путь:** `/hero-composition.png` (`apps/frontend/public/hero-composition.png`)

**Реализация (Stage 41.10):**  
Файл получен из `main`, перемещён в `project-assets/hero/`, скопирован в `public/`.  
`HeroSection.tsx` обновлён: двухколоночная компоновка (`pub-hero-content` + `pub-hero-visual`).  
На мобильных (≤767px) изображение скрыто (`display: none`).  
Текст, кнопки, порядок блоков — не изменены.

**Запрещено:**  
- заменять изображение;  
- использовать другие изображения;  
- генерировать Hero через AI;  
- использовать стоковые изображения;  
- изменять композицию без согласования.

---

## GILROY FONT

**Статус:** ✅ AVAILABLE — получен и реализован (Stage 41.12)

**Описание:**  
В утверждённом макете используется шрифт **Gilroy** для:

- статусных бейджей (text5, 13px Medium) — D-06;
- цитат (text9, 20px Regular) — D-07;
- подвала сайта (footer текст 1/2/3) — D-08.

**Что получено (Stage 41.12):**  
Полный семейство Gilroy в `project-assets/fonts/gilroy/font/` — Regular, Medium, Semibold, Bold и другие начертания (woff2 + woff).  
Использованы: Regular (400), Medium (500), Semibold (600).

**Реализация:**  
- Файлы скопированы в `apps/frontend/public/fonts/gilroy/` (woff2 + woff для Regular, Medium, Semibold)  
- `@font-face` объявления добавлены в `apps/frontend/src/app/globals.css`  
- CSS-переменная `--font-gilroy` добавлена в `:root`  
- Tailwind-утилита `font-gilroy` активирована (уже была в `tailwind.config.ts`)  
- D-06: `.evt-card-badge` (EventCard.tsx) → `font-gilroy font-medium`  
- D-07: `.quotes-text` → `font-family: var(--font-gilroy)`, `font-weight: 400`  
- D-08: `.pub-footer-desc`, `.pub-footer-link`, `.pub-footer-legal-link`, `.pub-footer-copy`, `.pub-footer-operator` → `font-family: var(--font-gilroy)`

---

## LOGO — VECTOR SOURCE

**Статус:** ⚠ PARTIAL

**Описание:**  
Оригинальный логотип «аб» в векторном формате (SVG / AI / EPS / Figma export) отсутствует.

**Что найдено:**  
- `project-assets/03_logo_frames/Frame 60.png` — PNG 694×575px, чёрный логотип на белом фоне. Пригоден как визуальный референс.
- `project-assets/03_logo_frames/Frame 60(1).png` — вариант монограммы.
- В коде (`SiteHeader.tsx`) реализована SVG-аппроксимация монограммы, построенная вручную по этому PNG-референсу.

**Чего не хватает:**  
Оригинального векторного файла (SVG / AI / Figma export) с точными узлами и кривыми.  
Текущая SVG-аппроксимация функционально корректна, но может отличаться от оригинала в деталях.

**Необходимое действие:**  
Запросить у дизайнера SVG-файл или Figma export монограммы «аб» для возможной точной доработки в v1.1.

---

## OG IMAGE — DESIGN SOURCE

**Статус:** 🔵 OPTIONAL

**Описание:**  
OG-изображение (1200×630) генерируется программно через `app/opengraph-image.tsx` (Next.js ImageResponse) — navy фон, логотип «АБ», заголовок и подзаголовок.

**Текущее состояние:**  
Реализация полностью пригодна для production. Генерирует корректный `og:image` и `twitter:card` при каждом запросе. Внешний вид соответствует брендовым цветам проекта (#0D2344 navy, #7CD8B3 mint).

**Дизайнерский макет OG-изображения не предусматривался.**

**Необходимое действие:**  
Не требуется. Если в будущем понадобится иллюстрированный вариант OG-image — запросить у дизайнера отдельно. Реализация через v1.1+.

---

## FAVICON — DESIGN SOURCE

**Статус:** ⚠ PARTIAL

**Описание:**  
Favicon (32×32) генерируется программно через `app/icon.tsx` — navy box + «АБ» текст.  
Не использует реальный вектор монограммы из Frame 60.png, так как SVG-оригинала нет.

**Необходимое действие:**  
После получения SVG логотипа (см. раздел LOGO — VECTOR SOURCE) обновить favicon в v1.1.

---

*Документ обновлять при получении каждого отсутствующего ассета.*
