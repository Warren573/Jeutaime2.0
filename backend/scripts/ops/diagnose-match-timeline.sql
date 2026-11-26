-- DIAGNOSTIC EN LECTURE SEULE — chronologie des actions entre comptes autour d'un instant.
-- Compatible avec l'éditeur SQL de Neon (aucune méta-commande psql, aucune variable) et avec psql.
-- N'écrit RIEN : uniquement des SELECT. À exécuter UNE REQUÊTE À LA FOIS (sélectionner le bloc, puis Run).
--
-- FUSEAU HORAIRE : les colonnes Prisma sont des « timestamp without time zone » qui contiennent de l'UTC.
-- Les heures « Paris » sont donc calculées avec  (col AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris'.
-- (Écrire simplement  col AT TIME ZONE 'Europe/Paris'  décalerait les heures et ferait manquer la fenêtre.)
-- Fenêtre par défaut : 25/11/2026 07:00 → 08:00 UTC  (= 08:00 → 09:00 à Paris). À adapter dans la CTE « w ».

-- ───────────── Requête 0 : fuseau du serveur et heure actuelle ─────────────
SELECT current_setting('TIMEZONE') AS fuseau_session, now() AS maintenant,
       (now() AT TIME ZONE 'UTC') AS maintenant_utc,
       (SELECT data_type FROM information_schema.columns WHERE table_name = 'Match' AND column_name = 'createdAt') AS type_colonne_createdAt;

-- ───────────── Requête 1 : TOUT ce qui s'est passé dans la fenêtre, une seule chronologie ─────────────
WITH w AS (SELECT timestamp '2026-11-25 07:00' AS d, timestamp '2026-11-25 08:00' AS f),   -- UTC
ev AS (
  SELECT r."createdAt" AS t, 'REACTION' AS source,
         r.type::text || '  ' || coalesce(pf.pseudo,'?') || ' → ' || coalesce(pt.pseudo,'?') AS detail
  FROM "Reaction" r
  LEFT JOIN "Profile" pf ON pf."userId" = r."fromId" LEFT JOIN "Profile" pt ON pt."userId" = r."toId"
  UNION ALL
  SELECT m."createdAt", 'MATCH_CREE',
         coalesce(pa.pseudo,'?') || ' & ' || coalesce(pb.pseudo,'?') || '  statut=' || m.status::text
         || '  initiateur=' || coalesce((SELECT pi.pseudo FROM "Profile" pi WHERE pi."userId" = m."initiatorId"),'?')
         || '  match=' || m.id
  FROM "Match" m
  LEFT JOIN "Profile" pa ON pa."userId" = m."userAId" LEFT JOIN "Profile" pb ON pb."userId" = m."userBId"
  UNION ALL
  SELECT m."activatedAt", 'MATCH_ACTIVE', coalesce(pa.pseudo,'?') || ' & ' || coalesce(pb.pseudo,'?') || '  match=' || m.id
  FROM "Match" m
  LEFT JOIN "Profile" pa ON pa."userId" = m."userAId" LEFT JOIN "Profile" pb ON pb."userId" = m."userBId"
  WHERE m."activatedAt" IS NOT NULL
  UNION ALL
  SELECT a."createdAt", 'REPONSE_QUESTION',
         'répondant=' || coalesce(p.pseudo,'?') || '  juste=' || a."isCorrect"::text || '  match=' || a."matchId"
  FROM "MatchQuestionAttempt" a LEFT JOIN "Profile" p ON p."userId" = a."responderId"
  UNION ALL
  SELECT l."sentAt", 'LETTRE', coalesce(pf.pseudo,'?') || ' → ' || coalesce(pt.pseudo,'?') || '  match=' || l."matchId"
  FROM "Letter" l
  LEFT JOIN "Profile" pf ON pf."userId" = l."fromUserId" LEFT JOIN "Profile" pt ON pt."userId" = l."toUserId"
  UNION ALL
  SELECT n."createdAt", 'NOTIFICATION',
         coalesce(p.pseudo,'?') || '  ' || n.type::text || '  lue=' || n."isRead"::text || '  match=' || coalesce(n.meta->>'matchId','-')
  FROM "Notification" n LEFT JOIN "Profile" p ON p."userId" = n."userId"
  UNION ALL
  SELECT e."createdAt", 'CONNEXION',
         'domaine=' || split_part(e.email,'@',2) || '  succes=' || e.success::text || '  motif=' || coalesce(e.reason,'-')
         || '  compte=' || coalesce((SELECT pp.pseudo FROM "Profile" pp WHERE pp."userId" = e."userId"),'?')
  FROM "LoginEvent" e
  UNION ALL
  SELECT t."createdAt", 'SESSION_CREEE',
         coalesce(p.pseudo,'?') || '  ip#' || left(md5(coalesce(t.ip,'')),6) || '  appareil=' || coalesce(left(t."userAgent",70),'?')
  FROM "RefreshToken" t LEFT JOIN "Profile" p ON p."userId" = t."userId"
  UNION ALL
  SELECT t."lastUsedAt", 'SESSION_UTILISEE',
         coalesce(p.pseudo,'?') || '  ip#' || left(md5(coalesce(t.ip,'')),6) || '  appareil=' || coalesce(left(t."userAgent",70),'?')
  FROM "RefreshToken" t LEFT JOIN "Profile" p ON p."userId" = t."userId" WHERE t."lastUsedAt" IS NOT NULL
)
SELECT to_char((ev.t AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD HH24:MI:SS') AS heure_paris,
       to_char(ev.t, 'HH24:MI:SS') AS heure_utc, ev.source, ev.detail
FROM ev, w
WHERE ev.t >= w.d AND ev.t < w.f
ORDER BY ev.t, ev.source;

-- ───────────── Requête 2 : les comptes concernés (identité, ancienneté, mot de passe factice ou non) ─────────────
-- « mot_de_passe_factice » = vrai pour les comptes créés par resetTestUsers (hash '$2b$10$YourHashedPasswordHere') :
-- personne ne peut s'y connecter normalement. Aucun hash n'est affiché.
SELECT p.pseudo, u.id, split_part(u.email,'@',2) AS domaine_email,
       (u."passwordHash" = '$2b$10$YourHashedPasswordHere') AS mot_de_passe_factice,
       u."isVerified", u."createdAt" AS compte_cree_utc,
       (SELECT count(*) FROM "RefreshToken" t WHERE t."userId" = u.id) AS nb_sessions_total,
       (SELECT max(t."lastUsedAt") FROM "RefreshToken" t WHERE t."userId" = u.id) AS derniere_utilisation_utc
FROM "User" u LEFT JOIN "Profile" p ON p."userId" = u.id
WHERE p.pseudo IN ('testuser2','testuser9') OR u.id IN (
  SELECT "userAId" FROM "Match" WHERE "createdAt" >= timestamp '2026-11-25 07:00' AND "createdAt" < timestamp '2026-11-25 08:00'
  UNION SELECT "userBId" FROM "Match" WHERE "createdAt" >= timestamp '2026-11-25 07:00' AND "createdAt" < timestamp '2026-11-25 08:00')
ORDER BY p.pseudo;

-- ───────────── Requête 3 : rythme des sourires par minute, toute la journée du 25/11 (UTC) — détecte un automate ─────────────
SELECT to_char(date_trunc('minute', r."createdAt"), 'HH24:MI') AS minute_utc, count(*) AS sourires,
       count(DISTINCT r."fromId") AS emetteurs_distincts
FROM "Reaction" r
WHERE r."createdAt" >= timestamp '2026-11-25 00:00' AND r."createdAt" < timestamp '2026-11-26 00:00'
GROUP BY 1 ORDER BY 1;

-- ───────────── Requête 4 : ces matchs existent-ils encore, et quel est leur état ? ─────────────
SELECT m.id, m.status::text, m."questionsValidated" AS questions_ok, pa.pseudo AS compte_a, pb.pseudo AS compte_b,
       m."createdAt" AS cree_utc, m."activatedAt" AS active_utc, m."letterCountA" AS lettres_a, m."letterCountB" AS lettres_b
FROM "Match" m
LEFT JOIN "Profile" pa ON pa."userId" = m."userAId" LEFT JOIN "Profile" pb ON pb."userId" = m."userBId"
WHERE pa.pseudo IN ('testuser2','testuser9') OR pb.pseudo IN ('testuser2','testuser9')
ORDER BY m."createdAt";
