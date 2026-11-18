-- Les deux sourires constituent l'accord des deux participants.
UPDATE "Match" AS m
SET "status" = 'ACTIVE',
    "activatedAt" = CURRENT_TIMESTAMP,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE m."status" = 'PENDING'
  AND EXISTS (
    SELECT 1 FROM "Reaction" AS r
    WHERE r."fromId" = m."userAId" AND r."toId" = m."userBId" AND r."type" = 'SMILE'
  )
  AND EXISTS (
    SELECT 1 FROM "Reaction" AS r
    WHERE r."fromId" = m."userBId" AND r."toId" = m."userAId" AND r."type" = 'SMILE'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "Block" AS b
    WHERE (b."fromId" = m."userAId" AND b."toId" = m."userBId")
       OR (b."fromId" = m."userBId" AND b."toId" = m."userAId")
  );
