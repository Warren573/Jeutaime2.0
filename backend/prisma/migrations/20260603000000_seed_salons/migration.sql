-- Seed Salon records (7 salons)
-- This migration ensures salons are always present after deploy

INSERT INTO "Salon" (id, kind, name, description, "magicAction", gradient, "isActive", "order", "primaryColor", "secondaryColor", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'PISCINE', 'La Piscine', 'Un espace aquatique pour des rencontres rafraîchissantes', 'plonger', '{"start":"#4FACFE","end":"#00F2FE"}', true, 0, '#4FACFE', '#00F2FE', NOW(), NOW()),
  (gen_random_uuid(), 'CAFE_DE_PARIS', 'Café de Paris', 'L''élégance parisienne pour des discussions raffinées', 'trinquer', '{"start":"#F093FB","end":"#F5576C"}', true, 1, '#F093FB', '#F5576C', NOW(), NOW()),
  (gen_random_uuid(), 'ILE_PIRATES', 'Île des Pirates', 'L''aventure et le mystère au bout des flots', 'embarquer', '{"start":"#4E54C8","end":"#8F94FB"}', true, 2, '#4E54C8', '#8F94FB', NOW(), NOW()),
  (gen_random_uuid(), 'THEATRE', 'Le Théâtre', 'Le grand spectacle de la vie et des émotions', 'monter sur scène', '{"start":"#667EEA","end":"#764BA2"}', true, 3, '#667EEA', '#764BA2', NOW(), NOW()),
  (gen_random_uuid(), 'BAR_COCKTAILS', 'Bar à Cocktails', 'Des saveurs et des bulles pour une ambiance festive', 'shaker', '{"start":"#FA709A","end":"#FEE140"}', true, 4, '#FA709A', '#FEE140', NOW(), NOW()),
  (gen_random_uuid(), 'METAL', 'Le Métal', 'Pour les âmes rebelles et les esprits libres', 'headbanger', '{"start":"#434343","end":"#000000"}', true, 5, '#434343', '#000000', NOW(), NOW())
ON CONFLICT (kind) DO NOTHING;
