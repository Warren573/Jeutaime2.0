-- COMPARAISON EN LECTURE SEULE des sessions (appareil, réseau) et des actions de deux comptes, 25/11 vs 26/11/2026.
-- Compatible avec l'éditeur SQL de Neon. N'écrit RIEN (SELECT uniquement). Exécuter UNE REQUÊTE À LA FOIS (sélectionner, Run).
--
-- À SAVOIR (vérifié dans le code, auth.service.ts) :
--   * Une ligne « RefreshToken » est créée à CHAQUE renouvellement de session (donc à chaque ouverture de l'app après
--     expiration du jeton d'accès) ; son createdAt est l'instant du renouvellement.
--   * L'adresse IP et l'appareil (User-Agent) sont fixés à la PREMIÈRE connexion de la session et recopiés tels quels à
--     chaque renouvellement (« une valeur déjà connue n'est jamais remplacée »). Ils décrivent donc l'appareil/le réseau
--     de la connexion d'origine, pas forcément ceux de l'instant du renouvellement.
--   * Les heures « Paris » = (col AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris' (colonnes en UTC sans fuseau).
--   * Les IP ne sont JAMAIS affichées : seulement une empreinte de 6 caractères (md5), comparable entre lignes.
--
-- COMPTES : les deux participants du match du 25/11 (cmwvsz3t6001okik505vsekyq, créé 07:29:23 UTC), repérés par pseudo
-- (testuser2 / testuser9) ou par leur appartenance à ce match.
-- FENÊTRES (UTC) :
--   A = 25/11 07:27:00–07:29:00  renouvellements juste AVANT le match  (08:27–08:29 Paris)
--   B = 26/11 06:02:00–06:03:30  proposition puis adoption du Refuge   (07:02–07:03 Paris, session de l'utilisateur)
--   C = 26/11 08:43:00–08:44:30  ouverture + consultation des profils  (09:43–09:44 Paris)
--   D = 25/11 07:33:00–07:36:00  relecture de la lettre / des notifications (08:33–08:36 Paris)

-- ───────────── Requête 1 : les sessions renouvelées dans les fenêtres A, B, C, D (une ligne par session) ─────────────
WITH comptes AS (
  SELECT u.id, p.pseudo FROM "User" u LEFT JOIN "Profile" p ON p."userId" = u.id
  WHERE p.pseudo IN ('testuser2','testuser9')
     OR u.id IN (SELECT "userAId" FROM "Match" WHERE id = 'cmwvsz3t6001okik505vsekyq'
                 UNION SELECT "userBId" FROM "Match" WHERE id = 'cmwvsz3t6001okik505vsekyq')
), s AS (
  SELECT c.pseudo, c.id AS user_id, t."createdAt" AS cree_utc, t."userAgent" AS ua, t.ip, t."revokedAt",
    CASE WHEN t."createdAt" >= '2026-11-25 07:27' AND t."createdAt" < '2026-11-25 07:29'   THEN 'A  25/11 avant le match'
         WHEN t."createdAt" >= '2026-11-26 06:02' AND t."createdAt" < '2026-11-26 06:03:30' THEN 'B  26/11 adoption Refuge'
         WHEN t."createdAt" >= '2026-11-26 08:43' AND t."createdAt" < '2026-11-26 08:44:30' THEN 'C  26/11 consultation profils'
         WHEN t."createdAt" >= '2026-11-25 07:33' AND t."createdAt" < '2026-11-25 07:36'   THEN 'D  25/11 relecture lettre'
         ELSE NULL END AS fenetre
  FROM "RefreshToken" t JOIN comptes c ON c.id = t."userId"
)
SELECT fenetre, pseudo,
       to_char(cree_utc, 'YYYY-MM-DD HH24:MI:SS') AS cree_utc,
       to_char((cree_utc AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', 'HH24:MI:SS') AS heure_paris,
       'ip#' || left(md5(coalesce(ip,'')), 6) AS empreinte_ip,
       CASE WHEN ua LIKE 'JeuTaime/%CFNetwork%Darwin%' THEN 'APP NATIVE iOS (build ' || split_part(split_part(ua,'/',2),' ',1) || ')'
            WHEN ua ~* 'headless|playwright|puppeteer|selenium|phantom|webdriver|cypress' THEN 'NAVIGATEUR AUTOMATISÉ (marqueur explicite)'
            WHEN ua ~* '(^|[^a-z])(curl|node|undici|python|axios|okhttp|go-http|postman|insomnia|wget)' THEN 'OUTIL / SCRIPT'
            WHEN ua ~ 'CriOS' THEN 'Chrome iOS'  WHEN ua ~ 'FxiOS' THEN 'Firefox iOS'
            WHEN ua ~ 'iPhone' AND ua ~ 'Safari/' AND ua ~ 'Version/' THEN 'Safari iPhone (indiscernable d''un WebKit émulé par l''UA seul)'
            WHEN ua ~ 'iPhone' THEN 'WebView dans une autre application (pas Safari)'
            WHEN ua IS NULL THEN 'inconnu (session ancienne)' ELSE 'autre' END AS type_client,
       ua AS user_agent_complet, ("revokedAt" IS NOT NULL) AS revoquee
FROM s WHERE fenetre IS NOT NULL
ORDER BY fenetre, cree_utc;

-- ───────────── Requête 2 : « chaînes » de session par compte — le même appareil/réseau revient-il d'un jour à l'autre ? ─────────────
-- Une chaîne = même (compte, appareil, empreinte IP). Si la chaîne du 25/11 (A) est aussi présente le 26/11 (B/C),
-- c'est le MÊME appareil/connexion d'origine ; sinon, un autre.
WITH comptes AS (
  SELECT u.id, p.pseudo FROM "User" u LEFT JOIN "Profile" p ON p."userId" = u.id
  WHERE p.pseudo IN ('testuser2','testuser9')
     OR u.id IN (SELECT "userAId" FROM "Match" WHERE id = 'cmwvsz3t6001okik505vsekyq'
                 UNION SELECT "userBId" FROM "Match" WHERE id = 'cmwvsz3t6001okik505vsekyq')
)
SELECT c.pseudo,
       'ip#' || left(md5(coalesce(t.ip,'')), 6) AS empreinte_ip,
       left(coalesce(t."userAgent",'?'), 60) AS appareil,
       count(*) AS renouvellements,
       min(t."createdAt") AS premiere_ligne_utc, max(t."createdAt") AS derniere_ligne_utc,
       bool_or(t."createdAt" >= '2026-11-25 07:27' AND t."createdAt" < '2026-11-25 07:29') AS vue_fenetre_A_25_11,
       bool_or(t."createdAt" >= '2026-11-26 06:02' AND t."createdAt" < '2026-11-26 06:03:30') AS vue_fenetre_B_adoption,
       bool_or(t."createdAt" >= '2026-11-26 08:43' AND t."createdAt" < '2026-11-26 08:44:30') AS vue_fenetre_C_profils
FROM "RefreshToken" t JOIN comptes c ON c.id = t."userId"
WHERE t."createdAt" >= '2026-11-20'
GROUP BY c.pseudo, t.ip, t."userAgent"
ORDER BY c.pseudo, min(t."createdAt");

-- ───────────── Requête 3 : les réactions (sourires / grimaces) du 25/11, avec l'écart entre deux réactions ─────────────
-- Ne PAS conclure à un humain ou un script sur le seul rythme : regarder QUI réagit à QUI et DE QUEL TYPE.
WITH comptes AS (
  SELECT "userAId" AS id FROM "Match" WHERE id = 'cmwvsz3t6001okik505vsekyq'
  UNION SELECT "userBId" FROM "Match" WHERE id = 'cmwvsz3t6001okik505vsekyq'
), r AS (
  SELECT r."createdAt" AS t, r.type::text AS type, r."fromId", r."toId",
         coalesce(pf.pseudo,'?') AS de, coalesce(pt.pseudo,'?') AS vers
  FROM "Reaction" r LEFT JOIN "Profile" pf ON pf."userId" = r."fromId" LEFT JOIN "Profile" pt ON pt."userId" = r."toId"
  WHERE r."createdAt" >= '2026-11-25 07:00' AND r."createdAt" < '2026-11-25 09:00'
)
SELECT to_char((t AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', 'HH24:MI:SS.MS') AS heure_paris, de, vers, type,
       round(extract(epoch FROM (t - lag(t) OVER (ORDER BY t)))::numeric, 2) AS ecart_s_avec_precedente,
       ("fromId" IN (SELECT id FROM comptes)) AS emetteur_est_un_des_deux_comptes,
       ("toId"   IN (SELECT id FROM comptes)) AS cible_est_un_des_deux_comptes
FROM r ORDER BY t;

-- ───────────── Requête 4 : le sourire réciproque — qui a souri en premier, et il y a combien de temps ? ─────────────
-- Un match instantané s'explique si l'un des deux comptes avait déjà souri à l'autre (parfois des jours avant).
SELECT to_char((r."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD HH24:MI:SS') AS heure_paris,
       pf.pseudo AS de, pt.pseudo AS vers, r.type::text AS type
FROM "Reaction" r
LEFT JOIN "Profile" pf ON pf."userId" = r."fromId" LEFT JOIN "Profile" pt ON pt."userId" = r."toId"
WHERE r."fromId" IN (SELECT "userAId" FROM "Match" WHERE id = 'cmwvsz3t6001okik505vsekyq' UNION SELECT "userBId" FROM "Match" WHERE id = 'cmwvsz3t6001okik505vsekyq')
  AND r."toId"   IN (SELECT "userAId" FROM "Match" WHERE id = 'cmwvsz3t6001okik505vsekyq' UNION SELECT "userBId" FROM "Match" WHERE id = 'cmwvsz3t6001okik505vsekyq')
ORDER BY r."createdAt";

-- ───────────── Requête 5 : les réponses aux 3 questions — connaissance des réponses et probabilité de réussite au hasard ─────────────
-- Le serveur ne renvoie JAMAIS la bonne réponse au client (options mélangées : bonne + au moins 2 mauvaises).
-- Réussir 3/3 sans la connaître : au plus (1/3)^3 ≈ 3,7 % par joueur ; les 2 joueurs : ≈ 0,14 %.
SELECT to_char((a."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', 'HH24:MI:SS.MS') AS heure_paris,
       p.pseudo AS repondant, a."isCorrect" AS juste, a."questionId" AS question,
       char_length(a."submittedAnswer") AS longueur_reponse,            -- jamais le texte
       (SELECT array_length(q."wrongAnswers", 1) + 1 FROM "ProfileQuestion" q WHERE q.id = a."questionId") AS nb_choix_proposes
FROM "MatchQuestionAttempt" a LEFT JOIN "Profile" p ON p."userId" = a."responderId"
WHERE a."matchId" = 'cmwvsz3t6001okik505vsekyq'
ORDER BY a."createdAt", a."questionId";

-- ───────────── Requête 6 : la lettre — délai et longueur (le CONTENU n'est jamais affiché) ─────────────
SELECT to_char((l."sentAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', 'HH24:MI:SS.MS') AS heure_paris,
       pf.pseudo AS de, pt.pseudo AS vers,
       char_length(l.content) AS nb_caracteres,
       array_length(regexp_split_to_array(btrim(l.content), '\s+'), 1) AS nb_mots_approx,
       round(extract(epoch FROM (l."sentAt" - (SELECT max(a."createdAt") FROM "MatchQuestionAttempt" a WHERE a."matchId" = l."matchId")))::numeric, 1) AS secondes_apres_les_reponses,
       round(extract(epoch FROM (l."sentAt" - (SELECT m."createdAt" FROM "Match" m WHERE m.id = l."matchId")))::numeric, 1) AS secondes_apres_le_match,
       l.status::text, l."isGhostRelance" AS relance_anti_ghosting, l."readAt" IS NOT NULL AS lue
FROM "Letter" l LEFT JOIN "Profile" pf ON pf."userId" = l."fromUserId" LEFT JOIN "Profile" pt ON pt."userId" = l."toUserId"
WHERE l."matchId" = 'cmwvsz3t6001okik505vsekyq' ORDER BY l."sentAt";

-- ───────────── Requête 7 : 26/11 — qui a proposé, qui a adopté le Refuge (pour relier aux sessions de la fenêtre B) ─────────────
SELECT to_char((s."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD HH24:MI:SS') AS proposition_paris,
       to_char((s."startedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD HH24:MI:SS') AS adoption_paris,
       round(extract(epoch FROM (s."startedAt" - s."createdAt"))::numeric, 0) AS secondes_entre_les_deux,
       pc.pseudo AS compagnon_adopte, pa.pseudo AS parrain_adoptant, s.status::text
FROM "RefugeSession" s LEFT JOIN "Profile" pc ON pc."userId" = s."adopteId" LEFT JOIN "Profile" pa ON pa."userId" = s."adoptantId"
WHERE s."createdAt" >= '2026-11-26 06:00' AND s."createdAt" < '2026-11-26 06:10'
   OR s."startedAt" >= '2026-11-26 06:00' AND s."startedAt" < '2026-11-26 06:10'
ORDER BY s."createdAt";
