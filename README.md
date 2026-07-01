# АБ Афиша Бухгалтера

Репозиторий проекта `ab-event.pro`.

Проект: сайт-календарь бухгалтерских мероприятий с админкой, автоимпортом из MAX, Telegram/MAX-ботами, напоминаниями, аналитикой, юридическими документами и адаптивной версткой.

## Актуальные материалы

Основные документы находятся в папке `docs/`:

- `TZ_AB_Afisha_Buhgaltera_Claude.md` — техническое задание для Claude.ai / Claude Code.
- `TZ_AB_Afisha_Buhgaltera_Claude.txt` — текстовая версия ТЗ для Claude.ai.
- `TZ_AB_Afisha_Buhgaltera_customer.md` — версия ТЗ для заказчика.

Конфигурационные заметки:

- `project-config/.env.example` — пример переменных окружения.
- `project-config/CONTACT_EMAIL.md` — контактная почта проекта и поведение клика по email.
- `deployment/TIMEWEB_CLOUD_DEPLOYMENT.md` — развёртывание на Timeweb Cloud.
- `deployment/YANDEX_METRIKA.md` — подключение Яндекс.Метрики.

## Ключевые параметры

- Production-домен: `ab-event.pro`.
- Рабочая почта на период запуска: `info-event@a-b.ru`.
- Яндекс.Метрика: `110270689`.
- VPS: Timeweb Cloud, IPv4 `77.232.136.248`, host `kvnvm-277`.
- Стек: Next.js, React, TypeScript, NestJS, PostgreSQL, Redis, Docker, Nginx.

## Важно

Секреты, токены, пароли, SSH-ключи и production `.env` нельзя хранить в GitHub. В репозитории должен быть только `.env.example`.
