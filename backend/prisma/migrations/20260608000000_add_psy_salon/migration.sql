-- Add PSY to SalonKind enum (idempotent for PostgreSQL)
-- Note: PSY may already exist in the enum from previous attempts
DO $$
BEGIN
  ALTER TYPE "SalonKind" ADD VALUE 'PSY';
EXCEPTION WHEN duplicate_object THEN
  -- PSY already exists, continue
  NULL;
END $$;

-- Insert Cabinet du Psy salon (idempotent)
-- Skip if it already exists by kind
INSERT INTO "Salon" (id, kind, name, description, "magicAction", gradient, "isActive", "order", "primaryColor", "secondaryColor", "createdAt", "updatedAt")
SELECT
  substring(md5(random()::text), 1, 24),
  'PSY',
  'Cabinet du Psy',
  'On y sert des mojitos aussi',
  'analyser',
  '{"start":"#00BCD4","end":"#0097A7"}'::jsonb,
  true,
  6,
  '#00BCD4',
  '#0097A7',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Salon" WHERE kind = 'PSY')
ON CONFLICT (kind) DO NOTHING;
