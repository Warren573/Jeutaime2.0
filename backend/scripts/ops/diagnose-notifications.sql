-- DIAGNOSTIC EN LECTURE SEULE des notifications liées à des relations (match, 3 questions, lettres, bouteilles, refuge).
-- N'écrit rien, ne supprime rien. Usage : psql "<url>" -f scripts/ops/diagnose-notifications.sql
-- Répond à : « cette notification correspond-elle à une relation qui existe réellement ? »

\echo '== 1. Notifications de rencontre : relation existante ou orpheline ? (une ligne par notification)'
SELECT n."createdAt" AT TIME ZONE 'Europe/Paris' AS cree_le_paris,
       n.type::text AS type,
       pu.pseudo   AS destinataire,
       CASE WHEN m.id IS NULL THEN 'ORPHELINE (match introuvable)'
            WHEN n."userId" NOT IN (m."userAId", m."userBId") THEN 'MAUVAIS DESTINATAIRE'
            ELSE 'match existant : ' || m.status::text END AS etat,
       po.pseudo AS autre_participant,
       m."createdAt" AT TIME ZONE 'Europe/Paris' AS match_cree_le_paris,
       m."activatedAt" AT TIME ZONE 'Europe/Paris' AS match_active_le_paris,
       n."isRead" AS lue, n.id AS notification_id, n.meta->>'matchId' AS match_id
FROM "Notification" n
LEFT JOIN "Match" m ON m.id = n.meta->>'matchId'
LEFT JOIN "Profile" pu ON pu."userId" = n."userId"
LEFT JOIN "Profile" po ON po."userId" = CASE WHEN m."userAId" = n."userId" THEN m."userBId" ELSE m."userAId" END
WHERE n.type IN ('MATCH_CREATED','QUESTIONS_PASSED','QUESTIONS_FAILED','QUESTIONS_TURN','LETTER_RECEIVED','BOTTLE_REVEAL_ACCEPTED')
ORDER BY n."createdAt" DESC LIMIT 100;

\echo '== 2. Réponses au jeu des questions et sourires du match (preuve de ce qui s''est réellement passé)'
SELECT m.id AS match_id, m.status::text, m."questionsValidated", m."createdAt" AT TIME ZONE 'Europe/Paris' AS cree_le_paris,
       (SELECT count(*) FROM "MatchQuestionAttempt" a WHERE a."matchId" = m.id) AS reponses_questions,
       (SELECT count(*) FROM "Reaction" r WHERE (r."fromId" = m."userAId" AND r."toId" = m."userBId") OR (r."fromId" = m."userBId" AND r."toId" = m."userAId")) AS reactions
FROM "Match" m
WHERE m.id IN (SELECT n.meta->>'matchId' FROM "Notification" n WHERE n.type IN ('MATCH_CREATED','QUESTIONS_PASSED') AND n."createdAt" > now() - interval '3 days');

\echo '== 3. Notifications du Refuge : session existante, bon destinataire ? '
SELECT n."createdAt" AT TIME ZONE 'Europe/Paris' AS cree_le_paris, n.type::text, pu.pseudo AS destinataire,
       CASE WHEN s.id IS NULL THEN 'ORPHELINE (session introuvable)'
            WHEN n.type = 'REFUGE_ADOPTED' AND n."userId" <> s."adopteId" THEN 'MAUVAIS DESTINATAIRE'
            ELSE 'session ' || s.status::text END AS etat,
       n.meta->>'refugeSessionId' AS session_id
FROM "Notification" n
LEFT JOIN "RefugeSession" s ON s.id = n.meta->>'refugeSessionId'
LEFT JOIN "Profile" pu ON pu."userId" = n."userId"
WHERE n.type IN ('REFUGE_ADOPTED','REFUGE_REVEAL_PHASE','REFUGE_REVEALED')
ORDER BY n."createdAt" DESC LIMIT 100;

\echo '== 4. Doublons : plusieurs notifications du même type pour la même relation et le même destinataire'
SELECT n."userId", n.type::text, coalesce(n.meta->>'matchId', n.meta->>'refugeSessionId', n.meta->>'bottleId') AS relation, count(*) AS nombre
FROM "Notification" n
WHERE n.meta ?| array['matchId','refugeSessionId','bottleId'] AND n.type NOT IN ('LETTER_RECEIVED')
GROUP BY 1,2,3 HAVING count(*) > 1 ORDER BY nombre DESC LIMIT 50;

\echo '== 5. Total des notifications orphelines par type (relation disparue)'
SELECT n.type::text, count(*) AS orphelines
FROM "Notification" n
WHERE (n.meta ? 'matchId' AND NOT EXISTS (SELECT 1 FROM "Match" m WHERE m.id = n.meta->>'matchId'))
   OR (n.meta ? 'refugeSessionId' AND NOT EXISTS (SELECT 1 FROM "RefugeSession" s WHERE s.id = n.meta->>'refugeSessionId'))
   OR (n.meta ? 'bottleId' AND NOT EXISTS (SELECT 1 FROM "MessageInABottle" b WHERE b.id = n.meta->>'bottleId'))
GROUP BY 1 ORDER BY 2 DESC;
