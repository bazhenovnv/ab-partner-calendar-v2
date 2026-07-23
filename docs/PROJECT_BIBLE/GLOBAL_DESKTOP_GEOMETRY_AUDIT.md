# GLOBAL DESKTOP GEOMETRY AUDIT (Stage 44E.3)

**Дата:** 2026-07-11  
**Ветка:** `claude/ab-afisha-architecture-plan-805f5o`  
**Статус:** ✅ ДИАГНОСТИКА ЗАВЕРШЕНА — код изменения НЕ требует

---

## 1. МЕТОД ДИАГНОСТИКИ

Прочитаны все файлы в layout-цепочке:
- `app/layout.tsx`
- `app/page.tsx`
- `components/layout/PublicShell.tsx`
- `components/layout/SiteHeader.tsx`
- `components/HeroSection.tsx`
- `components/events/EventsSection.tsx`
- `components/layout/SiteFooter.tsx`
- `app/globals.css` (полный, 46 234 байта)
- `tailwind.config.ts`
- `next.config.mjs`
- `apps/frontend/public/` — листинг файлов (обе ветки: feature + main)

---

## 2. ПОЛНАЯ LAYOUT-ЦЕПОЧКА — ИЗМЕРЕНИЕ

### Desktop viewport 1920px

| Уровень | Элемент | CSS / Класс | Вычисленная ширина | Статус |
|---------|---------|-------------|--------------------|---------|
| 1 | `<html>` | нет ограничений | 1920px | ✅ |
| 2 | `<body>` | `background: #f5f5f5`, нет width | 1920px | ✅ |
| 3 | `PublicShell` `<div>` | `min-h-screen flex flex-col bg-[#f5f5f5]` — block-level flex | 1920px | ✅ |
| 4 | `<header>` | `bg-white sticky top-0 z-40` | 1920px | ✅ |
| 4a | Header inner | `max-w-[1496px] mx-auto px-4 tablet:px-8` | **1496px, centered** | ✅ |
| 5 | `<main#main-content>` | `flex-1` в flex-column | 1920px | ✅ |
| 6 | `section.pub-hero` | `background: #f5f5f5; padding: 16px` | 1920px | ✅ |
| 6a | `.pub-hero-panel` | `max-width: 1496px; margin: 0 auto` | **1496px, centered** | ✅ |
| 6b | `.pub-hero-content` | `flex: 0 0 913px` | 913px (fixed basis, no shrink) | ✅ |
| 7 | `section#events.pub-events-section` | `padding: 0 16px 16px` | 1920px | ✅ |
| 7a | `.pub-events-outer` | `max-width: 1497px; margin: 0 auto` | **1497px, centered** | ✅ |
| 7b | `.pub-events-controls` | `display: flex; gap: 41.36px` | расчёт ниже ⚠️ | |
| 7c | `.pub-events-filters-col` | `flex-shrink: 0; width: 588px` | 588px | ✅ |
| 7d | `.pub-events-calendar-col` | `flex-shrink: 0; width: 760.866px` | 760.866px | ✅ |
| 8 | `footer.pub-footer` | нет width | 1920px | ✅ |
| 8a | `.pub-footer-inner` | `max-width: 1496px; margin: 0 auto` | **1496px, centered** | ✅ |

---

## 3. РЕЗУЛЬТАТ ДИАГНОСТИКИ — ГЛАВНЫЙ ВЫВОД

**В коде репозитория НЕТ ни одного CSS-правила, которое ограничивало бы всю страницу до 500–600px.**

- `html`, `body` — без `width`, без `max-width`, без `fit-content`
- `PublicShell` `div` — block-level flex, наследует 100% ширины viewport
- Ни один из wrapper-ов не имеет `width: fit-content`, `display: inline-block`, `transform: scale`, `zoom`, `display: table`
- `clamp()` не используется для горизонтальных размеров
- Container queries не используются
- `min-content` / `max-content` не применяются к корневым блокам
- Tailwind breakpoints: `mobile: 390px`, `tablet: 1024px`, `desktop: 1440px`, `wide: 1920px` — корректны
- `next.config.mjs` — нет `basePath`, нет нестандартных proxy-правил

---

## 4. ЕДИНСТВЕННАЯ НАЙДЕННАЯ АНОМАЛИЯ В CSS

### Overflow controls row +1.226px

| Параметр | Значение |
|----------|----------|
| `.pub-events-filters-col` width | 588px |
| `.pub-events-controls` gap | 41.36px |
| `.pub-events-calendar-col` width | 760.866px |
| **Controls row total** | **1390.226px** |
| `.pub-events-outer` padding left | 54px |
| `.pub-events-outer` padding right | 54px |
| `.pub-events-outer` max-width | 1497px |
| **Outer inner width** | **1497 − 108 = 1389px** |
| **Переполнение** | **+1.226px** |

**Эффект:** минимальный горизонтальный скролл внутри `.pub-events-outer`.  
**НЕ вызывает** сжатие всей страницы до 500–600px.

---

## 5. НАИБОЛЕЕ ВЕРОЯТНАЯ ПРИЧИНА СЖАТИЯ СТРАНИЦЫ НА STAGING

### Гипотеза A (приоритет ВЫСОКИЙ): Staging запускает старый Docker-образ

Стагинг, скорее всего, запущен с образом, собранным из ветки `main`, а не из `claude/ab-afisha-architecture-plan-805f5o`.

**Доказательство:**  
`apps/frontend/public/` в ветке `main` содержит ТОЛЬКО:
```
.gitkeep
maintenance.png
```

`apps/frontend/public/` в feature ветке содержит:
```
.gitkeep
ab-logo-mark.png      ← ОТСУТСТВУЕТ в main
favicon.ico
fonts/
hero-composition.png  ← ОТСУТСТВУЕТ в main
maintenance.png
```

Если staging собирался из `main` — у него нет `hero-composition.png` и `ab-logo-mark.png`.  
Hero-секция без изображения может коллапсировать непредвиденным образом.

### Гипотеза B (приоритет СРЕДНИЙ): Staging использует устаревший CSS-билд

Docker standalone-build кэширует `.next/` директорию. Если образ не пересобирался после наших push-ов — staging использует CSS из старого коммита (Stage 44C или даже раньше). Старая CSS могла иметь другие размеры контейнеров.

### Гипотеза C (приоритет НИЗКИЙ): Скрин снят при узком viewport

Если браузер при снятии скрина имел viewport < 767px — срабатывает `@media (max-width: 767px)` для Hero и `@media (max-width: 1399px)` для Events. Это не делает страницу 500px широкой, но меняет layout.

---

## 6. ПОЧЕМУ ПРОБЛЕМА ЗАТРОНУЛА ВЕСЬ САЙТ ОДНОВРЕМЕННО

Hero, Header, Calendar, Footer — все сужаются одновременно только при ОДНОМ из двух сценариев:

| Сценарий | Причина |
|----------|---------|
| Неправильный Docker-образ | Все компоненты рендерятся из старого кода без новых CSS-переменных и классов |
| Viewport сужен в браузере | Все max-width контейнеры (1496px, 1497px) остаются шире viewport → видимая ширина = viewport |

Часть кода изменить невозможно ни при каком CSS в репозитории — изолированная CSS-ошибка одного компонента не может сузить весь сайт, так как все wrapper-ы используют `width: 100%` / `max-width` + `margin: auto`.

---

## 7. ЧТО НЕОБХОДИМО ИСПРАВИТЬ В КОДЕ

### 7.1 Overflow controls row (MINOR)

**Файл:** `apps/frontend/src/app/globals.css`  
**Класс:** `.pub-events-outer`  
**Проблема:** inner width 1389px < controls row 1390.226px (+1.226px)  
**Исправление:** уменьшить `padding` или скорректировать ширину одной из колонок  
**Ожидает:** подтверждения точных Figma-значений

### 7.2 Глобальная ширина (NONE REQUIRED)

Глобальных CSS-изменений для исправления ширины страницы **не требуется**.  
В коде нет ни одного ограничения, вызывающего 500–600px.

---

## 8. КОМАНДЫ ДЛЯ ПРОВЕРКИ STAGING

Прежде чем трогать CSS — убедиться, что staging запущен с правильной веткой:

```bash
# На сервере: проверить текущую ветку
git -C /path/to/ab-partner-calendar-v2 log --oneline -3

# Убедиться, что запущен правильный образ
docker ps --format 'table {{.Image}}\t{{.Names}}\t{{.Status}}'

# Посмотреть, какой коммит был использован при сборке
docker inspect <frontend-container-name> | grep -i label
```

Если staging запущен из `main` или из старого коммита — необходим полный rebuild:

```bash
# 1. Получить feature-ветку
git fetch origin claude/ab-afisha-architecture-plan-805f5o
git checkout claude/ab-afisha-architecture-plan-805f5o
git pull origin claude/ab-afisha-architecture-plan-805f5o

# 2. Пересобрать и перезапустить frontend
docker compose build --no-cache frontend
docker compose up -d --no-deps frontend

# 3. Проверить логи
docker compose logs -f frontend --tail=100
```

---

## 9. LOGO ASSET DELIVERY DIAGNOSTICS

| Параметр | Значение |
|----------|----------|
| `src` в коде | `/ab-logo-mark.png` |
| Компонент | `SiteHeader.tsx`, тег `<img>` (не `<Image>`) |
| basePath | нет (`next.config.mjs` не содержит `basePath`) |
| Case | lowercase `ab-logo-mark.png` — корректно |
| Файл в feature branch | ✅ **СУЩЕСТВУЕТ** — `apps/frontend/public/ab-logo-mark.png` (15 272 байта, SHA: `80f6e135`) |
| Файл в `main` branch | ❌ **ОТСУТСТВУЕТ** — `apps/frontend/public/` содержит только `.gitkeep` и `maintenance.png` |

### Вывод

Если Docker-образ был собран из ветки `main` — `/ab-logo-mark.png` возвращает **HTTP 404** → broken image. Это подтверждает гипотезу A: staging использует образ из `main`, а не из feature-ветки.

### Что НЕ делать
- Не рисовать SVG-заглушку
- Не менять дизайн логотипа
- Не менять `src` в компоненте
- Ждать rebuild staging с правильной веткой

### Ожидаемый HTTP-статус после rebuild
```
GET /ab-logo-mark.png → 200 OK (PNG, 15 272 bytes)
```

---

## 10. ФАЙЛЫ, КОТОРЫЕ НУЖНО ИЗМЕНИТЬ (после подтверждения)

| # | Файл | Изменение | Приоритет |
|---|------|-----------|----------|
| 1 | `globals.css` | Скорректировать overflow +1.226px в `.pub-events-outer` padding или колонках | MINOR |

Все остальные компоненты (Header, Hero, Footer, Calendar, Filters) — корректны в текущем коде.

---

## 11. СТАТУС

| Элемент | Статус |
|---------|--------|
| Global desktop geometry в коде | ✅ КОРРЕКТНО — CSS не ограничивает ширину |
| Staging отображение | ❌ BLOCKER — требует rebuild Docker с feature-веткой |
| Logo asset в коде | ✅ КОРРЕКТНО — файл есть в feature branch |
| Logo на staging | ❌ BROKEN — образ собран из main без файла |
| Controls row overflow | ⚠️ MINOR +1.226px — ждёт подтверждения |
