# Комплект файлов для Claude.ai / Claude Code

Открой сначала: `docs/TZ_AB_Afisha_Buhgaltera_Claude.md`.

## Что внутри

- `docs/` — рабочее ТЗ для Claude, TXT/PDF версия и PDF для заказчика.
- `design/` — PDF-макеты главной страницы и модальных окон.
- `assets/` — логотип, иконки, ZIP-архивы с графикой по адаптивам.
- `examples/max-posts/` — примеры MAX-постов: картинки и текстовые версии для настройки парсера.
- `project-config/` — пример `.env` без секретов.
- `deployment/` — заметки по Timeweb Cloud и Яндекс.Метрике.
- `notes/` — краткая инструкция по структуре проекта и передаче файлов.

## Главные исходные данные

- GitHub: `bazhenovnv/ab-partner-calendar-v2`
- Production-домен: `ab-event.pro`
- Production VPS: Timeweb Cloud, IPv4 `77.232.136.248`, host `kvnvm-277`
- Яндекс.Метрика: `110270689`
- Администратор уведомлений: `https://t.me/Bazhenovnv`

## Адаптивы

- 1920px — основной desktop.
- 1440px — промежуточный desktop/tablet, макет `design/АБ Афиша main(4).pdf`.
- 1024px — tablet / промежуточный макет `design/АБ Афиша main(2).pdf`.
- 390px — mobile, макет `design/АБ Афиша main(3).pdf`.

1440px, 1024px и 390px нельзя получать простым сжатием 1920px. Сверяй расположение блоков по соответствующим PDF-макетам.

## Порядок работы для Claude

1. Прочитать `docs/TZ_AB_Afisha_Buhgaltera_Claude.md`.
2. Проверить макеты из `design/`.
3. Подключить assets из `assets/`.
4. Использовать примеры MAX-постов из `examples/max-posts/` для логики парсера.
5. Использовать `project-config/.env.example` как основу переменных окружения.
6. Использовать `deployment/` для настройки Timeweb Cloud и Яндекс.Метрики.

## Важно

Не коммитить реальные `.env`, root-пароли, SSH-ключи, токены ботов, пароли БД и другие секреты в GitHub.

Update v5: customer and Claude PDFs regenerated without automatic section-number prefix duplication. Headings now show single section numbers.

## Contact email

Current project contact email: `info-event@a-b.ru`. Use it in the footer and legal documents. Click behavior: copy to clipboard and open `mailto:`. See `project-config/CONTACT_EMAIL.md`.
