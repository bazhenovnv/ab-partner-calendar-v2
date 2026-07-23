-- Required reference data for MAX import.
-- Idempotent: safe for existing staging/production databases.

INSERT INTO "Direction" ("id", "name", "slug", "sortOrder", "isActive", "createdAt")
VALUES
  (gen_random_uuid()::text, '1C',         '1c',      10, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '54-ФЗ',      '54fz',    20, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ЕГАИС',      'egais',   30, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Маркировка', 'marking', 40, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Налоги',     'taxes',   50, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'СНО',        'sno',     60, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ОФД',        'ofd',     70, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'НДС',        'nds',     80, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Кассы',      'kassy',   90, true, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = true;

INSERT INTO "HashtagMapping" ("id", "hashtag", "directionId", "isMainEvent", "createdAt")
VALUES
  (gen_random_uuid()::text, '#Хит',        NULL, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '#УСН',        (SELECT "id" FROM "Direction" WHERE "slug" = 'sno'), false, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '#АУСН',       (SELECT "id" FROM "Direction" WHERE "slug" = 'sno'), false, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '#ПСН',        (SELECT "id" FROM "Direction" WHERE "slug" = 'sno'), false, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '#ОСНО',       (SELECT "id" FROM "Direction" WHERE "slug" = 'sno'), false, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '#НПД',        (SELECT "id" FROM "Direction" WHERE "slug" = 'sno'), false, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '#ЕСХН',       (SELECT "id" FROM "Direction" WHERE "slug" = 'sno'), false, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '#Налоги',     (SELECT "id" FROM "Direction" WHERE "slug" = 'taxes'), false, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '#НДС',        (SELECT "id" FROM "Direction" WHERE "slug" = 'nds'), false, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '#1С',         (SELECT "id" FROM "Direction" WHERE "slug" = '1c'), false, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '#54ФЗ',       (SELECT "id" FROM "Direction" WHERE "slug" = '54fz'), false, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '#Маркировка', (SELECT "id" FROM "Direction" WHERE "slug" = 'marking'), false, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '#ЕГАИС',      (SELECT "id" FROM "Direction" WHERE "slug" = 'egais'), false, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '#ОФД',        (SELECT "id" FROM "Direction" WHERE "slug" = 'ofd'), false, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '#Кассы',      (SELECT "id" FROM "Direction" WHERE "slug" = 'kassy'), false, CURRENT_TIMESTAMP)
ON CONFLICT ("hashtag") DO UPDATE
SET
  "directionId" = EXCLUDED."directionId",
  "isMainEvent" = EXCLUDED."isMainEvent";
