-- CHRONOLOGIE EN LECTURE SEULE de ce qui s'est réellement passé entre deux comptes autour d'un instant donné.
-- N'écrit rien. Usage (adapter la fenêtre, en heure de Paris) :
--   psql "<url>" -v debut="'2026-11-25 08:15'" -v fin="'2026-11-25 08:45'" -f scripts/ops/diagnose-match-timeline.sql
-- Répond à : « qui a fait quoi, depuis quel appareil, et ces matchs existent-ils encore ? »

\echo '== 1. Matchs créés ou activés dans la fenêtre (avec les deux pseudos)'
SELECT m.id AS match_id, m.status::text, m."questionsValidated" AS questions_ok,
       pa.pseudo AS compte_a, pb.pseudo AS compte_b, ua.email AS email_a, ub.email AS email_b,
       (m."createdAt" AT TIME ZONE 'Europe/Paris') AS cree_paris, (m."activatedAt" AT TIME ZONE 'Europe/Paris') AS active_paris,
       (SELECT pi.pseudo FROM "Profile" pi WHERE pi."userId" = m."initiatorId") AS initiateur
FROM "Match" m
JOIN "User" ua ON ua.id = m."userAId" JOIN "User" ub ON ub.id = m."userBId"
LEFT JOIN "Profile" pa ON pa."userId" = m."userAId" LEFT JOIN "Profile" pb ON pb."userId" = m."userBId"
WHERE (m."createdAt" AT TIME ZONE 'Europe/Paris') BETWEEN :debut::timestamp AND :fin::timestamp
   OR (m."activatedAt" AT TIME ZONE 'Europe/Paris') BETWEEN :debut::timestamp AND :fin::timestamp
ORDER BY m."createdAt";

\echo '== 2. Sourires / grimaces dans la fenêtre : qui a réagi à qui'
SELECT (r."createdAt" AT TIME ZONE 'Europe/Paris') AS heure_paris, r.type::text, pf.pseudo AS de, pt.pseudo AS vers
FROM "Reaction" r LEFT JOIN "Profile" pf ON pf."userId" = r."fromId" LEFT JOIN "Profile" pt ON pt."userId" = r."toId"
WHERE (r."createdAt" AT TIME ZONE 'Europe/Paris') BETWEEN :debut::timestamp AND :fin::timestamp ORDER BY r."createdAt";

\echo '== 3. Réponses au jeu des 3 questions dans la fenêtre : qui a répondu, juste ou non'
SELECT (a."createdAt" AT TIME ZONE 'Europe/Paris') AS heure_paris, a."matchId", p.pseudo AS repondant, a."isCorrect"
FROM "MatchQuestionAttempt" a LEFT JOIN "Profile" p ON p."userId" = a."responderId"
WHERE (a."createdAt" AT TIME ZONE 'Europe/Paris') BETWEEN :debut::timestamp AND :fin::timestamp ORDER BY a."createdAt";

\echo '== 4. Lettres dans la fenêtre (sans le contenu)'
SELECT (l."sentAt" AT TIME ZONE 'Europe/Paris') AS heure_paris, l."matchId", pf.pseudo AS de, pt.pseudo AS vers
FROM "Letter" l LEFT JOIN "Profile" pf ON pf."userId" = l."fromUserId" LEFT JOIN "Profile" pt ON pt."userId" = l."toUserId"
WHERE (l."sentAt" AT TIME ZONE 'Europe/Paris') BETWEEN :debut::timestamp AND :fin::timestamp ORDER BY l."sentAt";

\echo '== 5. Connexions (réussies ou non) dans la fenêtre : qui s''est authentifié'
SELECT (e."createdAt" AT TIME ZONE 'Europe/Paris') AS heure_paris, e.email, e.success, e.reason
FROM "LoginEvent" e WHERE (e."createdAt" AT TIME ZONE 'Europe/Paris') BETWEEN :debut::timestamp AND :fin::timestamp ORDER BY e."createdAt";

\echo '== 6. Sessions (jetons) actives ou utilisées dans la fenêtre : appareil et IP'
SELECT p.pseudo, (t."createdAt" AT TIME ZONE 'Europe/Paris') AS cree_paris, (t."lastUsedAt" AT TIME ZONE 'Europe/Paris') AS derniere_utilisation_paris,
       t.ip, left(t."userAgent", 60) AS appareil
FROM "RefreshToken" t LEFT JOIN "Profile" p ON p."userId" = t."userId"
WHERE (t."createdAt" AT TIME ZONE 'Europe/Paris') BETWEEN :debut::timestamp AND :fin::timestamp
   OR (t."lastUsedAt" AT TIME ZONE 'Europe/Paris') BETWEEN :debut::timestamp AND :fin::timestamp ORDER BY t."createdAt";

\echo '== 7. Notifications créées dans la fenêtre, par compte'
SELECT (n."createdAt" AT TIME ZONE 'Europe/Paris') AS heure_paris, p.pseudo AS destinataire, n.type::text, n.meta->>'matchId' AS match_id, n."isRead" AS lue
FROM "Notification" n LEFT JOIN "Profile" p ON p."userId" = n."userId"
WHERE (n."createdAt" AT TIME ZONE 'Europe/Paris') BETWEEN :debut::timestamp AND :fin::timestamp ORDER BY n."createdAt";
