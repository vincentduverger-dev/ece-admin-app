-- Seed required reference levels without creating demo families, applications, or students.
INSERT INTO "Level" ("id", "code", "label", "sortOrder", "availablePlaces", "createdAt", "updatedAt")
VALUES
  ('level_tps', 'TPS', 'Toute Petite Section', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_ps', 'PS', 'Petite Section', 1, 18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_ms', 'MS', 'Moyenne Section', 2, 18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_gs', 'GS', 'Grande Section', 3, 18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_cp', 'CP', 'CP', 4, 22, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_ce1', 'CE1', 'CE1', 5, 22, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_ce2', 'CE2', 'CE2', 6, 22, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_cm1', 'CM1', 'CM1', 7, 24, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_cm2', 'CM2', 'CM2', 8, 24, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_6e', '6E', '6e', 9, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_5e', '5E', '5e', 10, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_4e', '4E', '4e', 11, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_3e', '3E', '3e', 12, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_seconde', 'SECONDE', 'Seconde', 13, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_premiere', 'PREMIERE', 'Première', 14, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_terminale', 'TERMINALE', 'Terminale', 15, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "label" = EXCLUDED."label",
  "sortOrder" = EXCLUDED."sortOrder",
  "availablePlaces" = EXCLUDED."availablePlaces",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "LevelCapacity" ("id", "schoolYearId", "levelId", "availablePlaces", "createdAt", "updatedAt")
SELECT
  concat('levelcap_', substr(md5(sy."id" || ':' || l."id"), 1, 24)),
  sy."id",
  l."id",
  l."availablePlaces",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "SchoolYear" sy
CROSS JOIN "Level" l
ON CONFLICT ("schoolYearId", "levelId") DO NOTHING;
