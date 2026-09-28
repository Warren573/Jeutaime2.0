-- Integrate uploaded salon offering assets and Metal demonic-cat transformation.
-- Pizza, hen and demonic cat currently use only their first 3 visual stages.

INSERT INTO "OfferingCatalog"
  ("id","emoji","name","cost","category","durationMs","stackPriority","salonOnly","enabled","consumptionMode")
VALUES
  ('off_cafe','☕','Café',20,'BOISSON',NULL,1,NULL,true,'SHARED'),
  ('off_cocktail','🍸','Cocktail',50,'BOISSON',NULL,2,NULL,true,'SHARED'),
  ('off_cookie','🍪','Cookie',25,'NOURRITURE',NULL,1,NULL,true,'SHARED'),
  ('off_glace','🍦','Glace',30,'NOURRITURE',NULL,2,NULL,true,'SHARED'),
  ('off_pizza','🍕','Pizza',45,'NOURRITURE',NULL,2,NULL,true,'SHARED')
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

INSERT INTO "MagieCatalog"
  ("id","emoji","name","cost","durationSec","type","breakConditionId","enabled")
VALUES
  ('mag_chat_noir','🐈‍⬛','Chat noir démoniaque',100,60,'TRANSFORMATION','rainbow',true),
  ('mag_arc_en_ciel','🌈','Arc-en-ciel',30,0,'VISUAL_EFFECT',NULL,true)
ON CONFLICT ("id") DO UPDATE SET
  "emoji" = EXCLUDED."emoji",
  "name" = EXCLUDED."name",
  "cost" = EXCLUDED."cost",
  "durationSec" = EXCLUDED."durationSec",
  "type" = EXCLUDED."type",
  "breakConditionId" = EXCLUDED."breakConditionId",
  "enabled" = EXCLUDED."enabled";
