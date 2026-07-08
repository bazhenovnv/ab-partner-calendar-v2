# Project Assets — AB Афиша Бухгалтера

Эта папка предназначена для всех неисполняемых материалов проекта: дизайн, макеты, юридические документы, презентации, скриншоты, диаграммы, архивы и справочные файлы.

## Структура

```text
project-assets/
├── branding/       # логотипы, фирменные элементы, брендовые материалы
├── design/         # дизайн-система и UI-макеты
├── mockups/        # PDF/PNG макеты дизайнера и рендеры
├── legal/          # юридические DOCX/PDF и материалы для юриста
├── presentations/  # презентации, PDF для согласования
├── screenshots/    # скриншоты сайта, админки, сервера, GitHub
├── diagrams/       # архитектурные схемы, ER, data-flow, deploy-flow
├── illustrations/  # иллюстрации, maintenance, календарь, UI-графика
└── archive/        # старые версии, исходные архивы, выгрузки из чатов
```

## Главный дизайн-эталон

Основной утверждённый макет публичной главной страницы:

```text
project-assets/mockups/pdf/АБ Афиша main(4).pdf
```

Если файл ещё не загружен, использовать архив:

```text
AB_Afisha_DESIGN_ASSETS_FOR_CLAUDE.zip
```

и распаковать его по структуре ниже.

## Правило Design Freeze v1.0

Публичная главная страница считается утверждённой после PR #36.

Запрещено без отдельного согласования менять:

- структуру главной страницы;
- порядок блоков;
- визуальную концепцию;
- Header;
- Hero;
- Events layout;
- Footer;
- терминологию.

## Терминология

Использовать только:

- `Главные события`, не `Важные события`;
- `Завершено`, не `Проведено` и не `Прошло`;
- `info-event@a-b.ru`, не `ab-event.pro@yandex.ru`.

## Для Claude

Перед изменением UI Claude обязан изучить:

1. `docs/TZ_AB_Afisha_Buhgaltera_Claude.md`;
2. `docs/TZ_v7_additions.md`;
3. `docs/TZ_v8_additions.md`;
4. `docs/TZ_v9_cookie_analytics_notice.md`;
5. `docs/TZ_v10_broadcasts.md`;
6. `docs/TZ_v11_legal_documents_and_locations.md`;
7. `docs/design-assets/README.md`;
8. этот файл;
9. основной макет `АБ Афиша main(4).pdf`.
