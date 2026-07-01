# ТЗ для Claude.ai / Claude Code — АБ Афиша Бухгалтера

Проект нужно разработать с нуля в репозитории `bazhenovnv/ab-partner-calendar-v2`.

Production-домен: `ab-event.pro`.

Контактная почта на период запуска: `info-event@a-b.ru`.

## Цель

Создать адаптивный сайт-календарь бухгалтерских мероприятий с публичной главной страницей, админкой, импортом событий из MAX, будущими API-источниками, Telegram/MAX-ботами, напоминаниями, аналитикой, SEO, юридическими документами и полным управлением контентом через админку.

Старый код не использовать как основу. Нужна новая расширяемая архитектура.

## Стек

- Frontend: Next.js + React + TypeScript.
- Backend: NestJS + Node.js + TypeScript.
- DB: PostgreSQL.
- Очереди и фоновые задачи: Redis + job queue.
- Обработка изображений: Sharp.
- Админка: `/admin`.
- Боты: Telegram Bot API + MAX Bot/API integration.
- Аналитика: Яндекс.Метрика `110270689` + внутренняя аналитика.
- Деплой: Docker / Docker Compose на Timeweb Cloud VPS.
- Окружения: staging + production.

## Сервер

Production VPS:

- Provider: Timeweb Cloud.
- Domain: `ab-event.pro`.
- IPv4: `77.232.136.248`.
- Host: `kvnvm-277`.
- CPU: 2 × 3.3 GHz.
- Disk: 50 GB.

На сервере должны работать frontend, backend, PostgreSQL, Redis, job queue, Sharp, Telegram/MAX-боты, MAX/API-импорт, Nginx/reverse proxy и SSL.

Для постоянной работы использовать отдельного deploy-пользователя, SSH-ключи и открытые только необходимые порты 22/80/443. Production-переменные окружения и приватные данные в GitHub не хранить.

## Публичная страница

Структура:

1. Header.
2. HeroSection.
3. MainCalendarSection: EventFilters, MonthCalendar, EventsList.
4. MainEventsSection / Главные события.
5. RotatingQuotesBlock / Цитаты.
6. Footer.
7. CopyrightBlock.

Адаптивы: 1920, 1440, 1024, 390. Нельзя получать 1440/1024/390 простым сжатием 1920. Для 1440 использовать макет `АБ Афиша main(4).pdf`.

Везде использовать финальное название `Главные события`, не `Важные события`.

## Header

Ссылки:

- Telegram: `https://t.me/ab_afisha_buh`.
- MAX: `https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0`.
- Стать партнёром: `https://ab-buhpartner.ru/`.

Внешние ссылки открывать в новой вкладке с `target="_blank" rel="noopener noreferrer"`.

## Footer и email

Project contact email: `info-event@a-b.ru`.

Поведение клика по email:

1. Скопировать `info-event@a-b.ru` в буфер обмена.
2. Открыть почтовый клиент пользователя через `mailto:info-event@a-b.ru`.
3. Показать toast: `Email скопирован`.
4. Если Clipboard API заблокирован, всё равно открыть `mailto:` и показать fallback-сообщение.
5. Элемент должен быть доступен с клавиатуры и иметь понятный `aria-label`.

## Яндекс.Метрика

```env
YANDEX_METRIKA_ID=110270689
```

Next.js/React SPA requirements:

- счётчик инициализировать один раз;
- не дублировать script при переходах;
- отправлять hit/pageview при route changes;
- добавить noscript fallback;
- включённые опции: `ssr`, `webvisor`, `clickmap`, `accurateTrackBounce`, `trackLinks`, `ecommerce: "dataLayer"`.

## MAX-импорт

Источник: `https://max.ru/join/tumioTNhr5Kh90TaDp1Tzgn-uDKw8Eko7KFhXdKeu9c`.

Проверка каждый час.

Правило: один MAX-пост = одно событие. Посты-подборки автоматически не разбивать.

Если пост содержит `#Хит`, событие должно попасть в календарь, обычные события и `Главные события`, `mainEvent = true`.

Если `#Хит` нет, событие показывается в календаре и обычных событиях, но не в `Главных событиях`.

## Админка

Меню: Dashboard, Events, Requires attention, Main events, Quotes, Filters, Cities and regions, MAX import, Integrations/API sources, Bots and reminders, Contacts, Analytics, Site builder, Site settings, Users and roles, Archive/deleted, Action log, Technical error log.

Роли: Admin — полный доступ. Editor — события, главные события, цитаты, просмотр аналитики, исправление ошибок событий; без доступа к пользователям, глобальным настройкам, интеграциям, ботам, SEO и правам.

## Юридические документы

Оператор: ООО «АБ ГРУПП», ОГРН 1212300074766, ИНН 2308283450, адрес: 350049, Краснодарский край, г. Краснодар, ул. Красных Партизан, д. 164, помещение 5.

Документы: Политика конфиденциальности, Пользовательское соглашение, Согласие на обработку персональных данных.

Во всех документах использовать email: `info-event@a-b.ru`.

## Примечание

Полная версия v6 с PDF, customer-версией, макетами и assets находится в архиве `AB_Afisha_Claude_transfer_package_v6.zip`, подготовленном отдельно для передачи Claude/Claude Code.
