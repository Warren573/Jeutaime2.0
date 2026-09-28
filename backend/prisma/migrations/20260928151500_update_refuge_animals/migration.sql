-- Conserve les sessions existantes tout en renommant l'animal côté métier.
ALTER TYPE "RefugeAnimalType" RENAME VALUE 'PINGOUIN' TO 'MANCHOT';

-- Nouveaux animaux du Refuge.
ALTER TYPE "RefugeAnimalType" ADD VALUE IF NOT EXISTS 'TOUCAN';
ALTER TYPE "RefugeAnimalType" ADD VALUE IF NOT EXISTS 'PERROQUET';
