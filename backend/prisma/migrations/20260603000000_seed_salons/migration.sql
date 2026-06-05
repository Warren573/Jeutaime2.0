-- Seed Salon records (7 salons)
-- This migration is a fallback; salons should be seeded via prisma db seed
-- It's included here to ensure data exists even if seeding fails

-- Only insert if table is empty (to avoid conflicts)
INSERT INTO "Salon" (id, kind, name, description, "magicAction", gradient, "isActive", "order", "primaryColor", "secondaryColor", "createdAt", "updatedAt")
SELECT
  substring(md5(random()::text), 1, 24) as id,
  kind,
  name,
  description,
  "magicAction",
  gradient,
  "isActive",
  "order",
  "primaryColor",
  "secondaryColor",
  NOW() as "createdAt",
  NOW() as "updatedAt"
FROM (
  VALUES
    ('PISCINE', 'La Piscine', 'Un espace aquatique pour des rencontres rafraîchissantes', 'plonger', '{"start":"#4FACFE","end":"#00F2FE"}'::jsonb, true, 0, '#4FACFE', '#00F2FE'),
    ('CAFE_DE_PARIS', 'Café de Paris', 'L''élégance parisienne pour des discussions raffinées', 'trinquer', '{"start":"#F093FB","end":"#F5576C"}'::jsonb, true, 1, '#F093FB', '#F5576C'),
    ('ILE_PIRATES', 'Île des Pirates', 'L''aventure et le mystère au bout des flots', 'embarquer', '{"start":"#4E54C8","end":"#8F94FB"}'::jsonb, true, 2, '#4E54C8', '#8F94FB'),
    ('THEATRE', 'Le Théâtre', 'Le grand spectacle de la vie et des émotions', 'monter sur scène', '{"start":"#667EEA","end":"#764BA2"}'::jsonb, true, 3, '#667EEA', '#764BA2'),
    ('BAR_COCKTAILS', 'Bar à Cocktails', 'Des saveurs et des bulles pour une ambiance festive', 'shaker', '{"start":"#FA709A","end":"#FEE140"}'::jsonb, true, 4, '#FA709A', '#FEE140'),
    ('METAL', 'Le Métal', 'Pour les âmes rebelles et les esprits libres', 'headbanger', '{"start":"#434343","end":"#000000"}'::jsonb, true, 5, '#434343', '#000000')
) AS data(kind, name, description, "magicAction", gradient, "isActive", "order", "primaryColor", "secondaryColor")
WHERE NOT EXISTS (SELECT 1 FROM "Salon" WHERE kind = data.kind::"SalonKind")
ON CONFLICT (kind) DO NOTHING;
