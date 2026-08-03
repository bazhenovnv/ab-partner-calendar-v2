-- Remove internal legal-review notices from the currently published documents.
-- LegalDocVersion rows are intentionally left unchanged as an audit history.
UPDATE "LegalDoc"
SET
  "content" = REPLACE(
    REPLACE(
      "content",
      '<p><em>Проект АБ Афиша Бухгалтера. Редакция для юридической проверки от 01.07.2026</em></p>',
      ''
    ),
    '<p><em>Документ подготовлен как проект для проверки и правовой редакции юристом.</em></p>',
    ''
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE
  "content" LIKE '%Проект АБ Афиша Бухгалтера. Редакция для юридической проверки от 01.07.2026%'
  OR "content" LIKE '%Документ подготовлен как проект для проверки и правовой редакции юристом.%';
