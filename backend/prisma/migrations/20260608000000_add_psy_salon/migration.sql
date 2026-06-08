-- Add PSY to SalonKind enum
ALTER TYPE "SalonKind" ADD VALUE 'PSY';

-- Insert Cabinet du Psy salon
INSERT INTO "Salon" (id, kind, name, description, "magicAction", gradient, "isActive", "order", "primaryColor", "secondaryColor", "createdAt", "updatedAt")
VALUES (
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
)
ON CONFLICT (kind) DO NOTHING;
