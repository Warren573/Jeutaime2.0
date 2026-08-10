INSERT INTO "OfferingCatalog" ("id", "emoji", "name", "cost", "category", "durationMs", "stackPriority", "salonOnly", "enabled", "consumptionMode") VALUES
('desk_rose', '🌹', 'Une rose', 40, 'SYMBOLIQUE', NULL, 10, NULL, true, 'PRIVATE'),
('desk_chocolats', '🍫', 'Boîte de chocolats', 70, 'NOURRITURE', NULL, 9, NULL, true, 'PRIVATE'),
('desk_parfum', '🧴', 'Un parfum', 180, 'SYMBOLIQUE', NULL, 8, NULL, true, 'PRIVATE'),
('desk_grand_cru', '🍷', 'Un grand cru', 220, 'BOISSON', NULL, 7, NULL, true, 'PRIVATE'),
('desk_bouquet', '💐', 'Un bouquet', 120, 'SYMBOLIQUE', NULL, 6, NULL, true, 'PRIVATE'),
('desk_venise', '🛶', 'Un week-end à Venise', 500, 'SYMBOLIQUE', NULL, 5, NULL, true, 'PRIVATE')
ON CONFLICT ("id") DO UPDATE SET
  "emoji" = EXCLUDED."emoji",
  "name" = EXCLUDED."name",
  "cost" = EXCLUDED."cost",
  "category" = EXCLUDED."category",
  "durationMs" = EXCLUDED."durationMs",
  "stackPriority" = EXCLUDED."stackPriority",
  "salonOnly" = EXCLUDED."salonOnly",
  "enabled" = EXCLUDED."enabled",
  "consumptionMode" = EXCLUDED."consumptionMode";
