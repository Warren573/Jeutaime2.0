-- Synchronise le catalogue de salon avec les PNG réellement présents dans l'app.
-- Les anciennes offrandes sans PNG restent en base pour préserver l'historique,
-- mais elles ne sont plus proposées dans le catalogue.

UPDATE "OfferingCatalog"
SET "enabled" = false
WHERE "id" LIKE 'off_%'
  AND "id" NOT IN (
    'off_biere',
    'off_fraises',
    'off_bonbons',
    'off_cafe',
    'off_cocktail',
    'off_cookie',
    'off_glace',
    'off_pizza',
    'off_coupechampagne',
    'off_verrevin',
    'off_sushismakis',
    'off_the'
  );

UPDATE "OfferingCatalog"
SET "enabled" = true
WHERE "id" IN (
  'off_biere',
  'off_fraises',
  'off_bonbons',
  'off_cafe',
  'off_cocktail',
  'off_cookie',
  'off_glace',
  'off_pizza'
);

INSERT INTO "OfferingCatalog"
  ("id", "emoji", "name", "cost", "category", "durationMs", "stackPriority", "salonOnly", "enabled", "consumptionMode")
VALUES
  ('off_coupechampagne', '🥂', 'Coupe de champagne', 150, 'BOISSON', NULL, 4, NULL, true, 'SHARED'),
  ('off_verrevin',        '🍷', 'Verre de vin',       45, 'BOISSON', NULL, 2, NULL, true, 'SHARED'),
  ('off_sushismakis',     '🍣', 'Sushis & makis',     60, 'NOURRITURE', NULL, 3, NULL, true, 'SHARED'),
  ('off_the',             '🍵', 'Thé',                20, 'BOISSON', NULL, 1, NULL, true, 'SHARED')
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "cost" = EXCLUDED."cost",
  "category" = EXCLUDED."category",
  "durationMs" = EXCLUDED."durationMs",
  "stackPriority" = EXCLUDED."stackPriority",
  "salonOnly" = EXCLUDED."salonOnly",
  "enabled" = true,
  "consumptionMode" = EXCLUDED."consumptionMode";
