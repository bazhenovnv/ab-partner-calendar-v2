-- Расширение справочника тематических направлений мероприятий.
-- Миграция идемпотентна и безопасна для БД, где записи уже добавлены вручную.

INSERT INTO "Direction"
  ("id", "name", "slug", "sortOrder", "isActive")
VALUES
  ('6c2633d1-57f7-4c50-a4ab-2f76c24a0101', 'Бухгалтерский учёт',  'accounting',    100, true),
  ('6c2633d1-57f7-4c50-a4ab-2f76c24a0102', 'Отчётность',          'reporting',     110, true),
  ('6c2633d1-57f7-4c50-a4ab-2f76c24a0103', 'Кадры',               'personnel',     120, true),
  ('6c2633d1-57f7-4c50-a4ab-2f76c24a0104', 'Трудовое право',      'labor-law',     130, true),
  ('6c2633d1-57f7-4c50-a4ab-2f76c24a0105', 'Зарплата и взносы',   'payroll',       140, true),
  ('6c2633d1-57f7-4c50-a4ab-2f76c24a0106', 'ЭДО',                 'edo',           150, true),
  ('6c2633d1-57f7-4c50-a4ab-2f76c24a0107', 'Логистика',           'logistics',     160, true),
  ('6c2633d1-57f7-4c50-a4ab-2f76c24a0108', 'ВЭД',                 'foreign-trade', 170, true),
  ('6c2633d1-57f7-4c50-a4ab-2f76c24a0109', 'Маркетплейсы',        'marketplaces',  180, true),
  ('6c2633d1-57f7-4c50-a4ab-2f76c24a0110', 'Госзакупки',          'procurement',   190, true),
  ('6c2633d1-57f7-4c50-a4ab-2f76c24a0111', 'Производство',        'production',    200, true),
  ('6c2633d1-57f7-4c50-a4ab-2f76c24a0112', 'Финансы',             'finance',       210, true),
  ('6c2633d1-57f7-4c50-a4ab-2f76c24a0113', 'Управление бизнесом', 'business',      220, true),
  ('6c2633d1-57f7-4c50-a4ab-2f76c24a0114', 'Автоматизация и ИИ',  'automation',    230, true),
  ('6c2633d1-57f7-4c50-a4ab-2f76c24a0115', 'Юридические вопросы', 'legal',         240, true)
ON CONFLICT DO NOTHING;
