-- DIAGNOSTIC EN LECTURE SEULE — push : appareils enregistrés, réglages, notifications créées.
-- Compatible avec l'éditeur SQL de Neon. N'écrit RIEN. Exécuter UNE REQUÊTE À LA FOIS.
-- Aucun jeton n'est affiché en entier : seulement son type et une empreinte courte, pour comparer deux lignes.

-- ───────────── Requête 1 : appareils enregistrés par compte (qui est joignable en push, et depuis quand) ─────────────
SELECT p.pseudo, u.id AS compte, k.platform,
       CASE WHEN k.token LIKE 'ExponentPushToken[%' THEN 'ExponentPushToken' WHEN k.token LIKE 'ExpoPushToken[%' THEN 'ExpoPushToken' ELSE 'FORMAT INATTENDU' END AS type_jeton,
       'tok#' || left(md5(k.token), 6) AS empreinte_jeton,
       to_char((k."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD HH24:MI:SS') AS cree_paris,
       to_char((k."updatedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD HH24:MI:SS') AS derniere_inscription_paris
FROM "PushToken" k JOIN "User" u ON u.id = k."userId" LEFT JOIN "Profile" p ON p."userId" = u.id
ORDER BY p.pseudo, k."updatedAt" DESC;

-- ───────────── Requête 2 : un même jeton partagé par plusieurs comptes ? (impossible : unique) ; comptes SANS appareil ─────────────
SELECT p.pseudo, u.id AS compte,
       (SELECT count(*) FROM "PushToken" k WHERE k."userId" = u.id) AS nb_appareils
FROM "User" u LEFT JOIN "Profile" p ON p."userId" = u.id
WHERE u.id IN (SELECT "userId" FROM "Notification" WHERE "createdAt" >= timestamp '2026-11-26 10:30')
ORDER BY p.pseudo;

-- ───────────── Requête 3 : réglages de notification des comptes concernés ─────────────
SELECT p.pseudo, s."notifPush" AS push_general, s."notifActivities" AS categorie_activites, s."notifMeetings", s."notifLetters",
       s."soundEnabled" AS son, s."vibrationEnabled" AS vibration
FROM "UserSettings" s JOIN "User" u ON u.id = s."userId" LEFT JOIN "Profile" p ON p."userId" = u.id
WHERE s."userId" IN (SELECT "userId" FROM "Notification" WHERE "createdAt" >= timestamp '2026-11-26 10:30')
ORDER BY p.pseudo;

-- ───────────── Requête 4 : notifications créées par le test (heure Paris) : confirme les notifications INTERNES ─────────────
SELECT to_char((n."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', 'HH24:MI:SS') AS heure_paris,
       p.pseudo AS destinataire, n.type::text, n.message, n."isRead" AS lue
FROM "Notification" n LEFT JOIN "Profile" p ON p."userId" = n."userId"
WHERE n."createdAt" >= timestamp '2026-11-26 10:30' AND n."createdAt" < timestamp '2026-11-26 11:00'
ORDER BY n."createdAt";

-- ───────────── Requête 5 : incidents d'envoi push enregistrés par le serveur (échecs, reçus en erreur de configuration) ─────────────
SELECT to_char((i."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD HH24:MI:SS') AS heure_paris,
       i.level::text, i.source, i.code, i.message
FROM "SystemIncident" i WHERE i.source = 'push' AND i."createdAt" >= timestamp '2026-11-25 00:00' ORDER BY i."createdAt" DESC LIMIT 50;
