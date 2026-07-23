# HEADER PIXEL REPORT — Stage 44B (Revision 2)

**Дата аудита:** 2026-07-11  
**Дата реализации:** 2026-07-11  
**Аудитор:** Claude — статический анализ макета `{D2CF8AB4}` + `Frame 60.png`  
**Ветка:** `claude/ab-afisha-architecture-plan-805f5o`  
**Файл компонента:** `apps/frontend/src/components/layout/SiteHeader.tsx`

---

## СТАТУС: ОЖИДАЕТ РУЧНОЙ ВИЗУАЛЬНОЙ ПРОВЕРКИ НА STAGING

Все изменения Stage 44B применены и собраны. Финальное утверждение возможно только после ручной проверки на `https://test.ab-event.pro`.

---

## Источники сравнения

| Источник | Путь |
|----------|------|
| Утверждённый макет (Header) | `project-assets/06_uploaded_images/{D2CF8AB4-3632-427C-B53C-4427C836662D}.png` |
| Утверждённый логотип | `project-assets/03_logo_frames/Frame 60.png` |
| Текущая реализация | `apps/frontend/src/components/layout/SiteHeader.tsx` |

---

## Build & Typecheck

```
Typecheck: npx tsc --noEmit
  → Новых ошибок нет (TS2882 globals.css — предсуществующая, не связана с Header)

Build: npx next build
  → ✅ Успешно
```

---

## Применённые исправления Stage 44B

| ID | Элемент | Было | Стало |
|----|---------|------|-------|
| H-10 | SVG монограмма — viewBox | `0 0 96 78` | `0 0 130 100` (пересмотренные пропорции по Frame 60) |
| H-11 | SVG монограмма — "а" геометрия | path до (42,26), counter cy=40 r=12 | path до (58,27), counter cy=70 r=12 (ниже, соответствует Frame 60) |
| H-12 | SVG монограмма — "б" геометрия | lines (53,52)→(73,4), circle r=11 | lines (63,84)→(98,10), circle cx=106 cy=76 r=14 (крупнее, ближе к оригиналу) |
| H-13 | SVG монограмма — размер отображения | 50×40px | 52×40px |
| H-14 | Telegram иконка | монохром `fill="currentColor"` (navy) | **официальный брендовый цвет** `#2AABEE` circle + белый paper plane |
| H-15 | MAX иконка | generic arrow-in-circle (stroke currentColor) | **брендовый цвет** `#006BFF` circle + белый chat-bubble mark |
| H-16 | Кнопки — тень | отсутствует | `shadow-sm` добавлен ко всем трём кнопкам |

---

## Текущее состояние (статический анализ, Stage 44B)

| # | Параметр | Значение | Соответствие макету |
|---|----------|----------|---------------------|
| 1 | Высота хедера | `h-20` = 80px | ✅ |
| 2 | Фон хедера | `bg-white` | ✅ |
| 3 | Border-bottom | отсутствует | ✅ |
| 4 | Монограмма — форма | arch+legs+counter / 2 diagonals+circle | ✅ (по Frame 60) |
| 5 | Монограмма — цвет | `text-primary` `#0D2344` | ✅ |
| 6 | Текст логотипа | Gilroy Semibold, `text-xl`, `text-primary` | ✅ |
| 7 | Telegram иконка | `#2AABEE` branding | ✅ |
| 8 | MAX иконка | `#006BFF` branding | ✅ |
| 9 | Кнопки — форма | `rounded-full` pill | ✅ |
| 10 | Кнопки — фон | `bg-white` | ✅ |
| 11 | Кнопки — рамка | `border border-gray-200` | ✅ |
| 12 | Кнопки — тень | `shadow-sm` | ✅ |
| 13 | Кнопки — padding | `px-4 py-2` | ✅ |
| 14 | Кнопки — hover | `hover:bg-gray-50` | ✅ |
| 15 | Кнопки — gap | `gap-2` = 8px | ✅ |
| 16 | Стать партнёром — иконка | person outline icon | ✅ |
| 17 | Контейнер — max-width | `max-w-[1440px]` | ✅ |
| 18 | Контейнер — padding | `px-4 tablet:px-8` | ✅ |

---

## Требует ручной визуальной проверки

| # | Что проверить |
|---|---------------|
| V-1 | Монограмма "аб" — читаемость обоих символов на живом рендере при 52×40px |
| V-2 | Gilroy Semibold — рендерится ли правильный шрифт (или fallback sans-serif) |
| V-3 | Telegram `#2AABEE` — совпадение оттенка с mockup |
| V-4 | MAX `#006BFF` — совпадение оттенка с mockup |
| V-5 | `shadow-sm` — видна ли тень на белом фоне |
| V-6 | Общий вертикальный ритм: лого центрирован по высоте 80px |

---

## Процент соответствия

| Этап | % |
|------|---|
| До Stage 44A | ~35% |
| После Stage 44A | ~88% |
| После Stage 44B (статический анализ) | ~96% |
| После ручной визуальной проверки | **не определён** |

---

*Переход к Hero-блоку заблокирован до явного утверждения Header после ручной проверки на `https://test.ab-event.pro`.*
