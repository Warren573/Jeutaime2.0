-- Inventaire LECTURE SEULE avant le test accéléré du Refuge (comptes testuser2 à testuser11@jeutaime.test).
-- Aucune écriture : uniquement des SELECT. À exécuter sur Neon, un bloc à la fois.
-- Ne sélectionne ni mot de passe, ni jeton, ni identifiant secret (les appareils sont seulement comptés).

-- 1) Comptes : identifiant, adresse, rôle, suspension, pseudo, pièces, points de classement, nombre d'appareils push
SELECT u.id, u.email, u.role, u."isBanned", p.pseudo,
       COALESCE(w.coins, 0) AS pieces, COALESCE(p."discoveryActivityScore", 0) AS points_classement,
       (SELECT count(*) FROM "PushToken" t WHERE t."userId" = u.id) AS appareils
FROM "User" u
LEFT JOIN "Profile" p ON p."userId" = u.id
LEFT JOIN "Wallet" w ON w."userId" = u.id
WHERE lower(u.email) ~ '^testuser([2-9]|10|11)@jeutaime\.test$'
ORDER BY u.email;

-- 2) Refuges impliquant ces comptes (EN COURS = CREATION, WAITING_FOR_ADOPTANT, ACTIVE, AWAITING_REVEAL_CONSENT)
SELECT s.id, s.status, s."rulesVersion", s."createdAt", s."startedAt", s."endsAt",
       ua.email AS compagnon, ub.email AS parrain
FROM "RefugeSession" s
JOIN "User" ua ON ua.id = s."adopteId"
LEFT JOIN "User" ub ON ub.id = s."adoptantId"
WHERE lower(ua.email) ~ '^testuser([2-9]|10|11)@jeutaime\.test$'
   OR lower(COALESCE(ub.email, '')) ~ '^testuser([2-9]|10|11)@jeutaime\.test$'
ORDER BY s."createdAt";

-- 3) Comptes à PRÉSERVER : participants d'un Refuge en cours (adoption actuellement en cours)
SELECT DISTINCT u.email
FROM "RefugeSession" s
JOIN "User" u ON u.id IN (s."adopteId", s."adoptantId")
WHERE s.status IN ('CREATION', 'WAITING_FOR_ADOPTANT', 'ACTIVE', 'AWAITING_REVEAL_CONSENT')
  AND lower(u.email) ~ '^testuser([2-9]|10|11)@jeutaime\.test$'
ORDER BY u.email;

-- 4) Couples (compagnon -> parrain) DÉJÀ CONSOMMÉS : un couple ne peut avoir qu'un seul Refuge
SELECT ua.email AS compagnon, ub.email AS parrain, s.id, s.status
FROM "RefugeSession" s
JOIN "User" ua ON ua.id = s."adopteId"
JOIN "User" ub ON ub.id = s."adoptantId"
WHERE lower(ua.email) ~ '^testuser([2-9]|10|11)@jeutaime\.test$'
  AND lower(ub.email) ~ '^testuser([2-9]|10|11)@jeutaime\.test$'
ORDER BY compagnon, parrain;

-- 5) Notifications du Refuge déjà présentes sur ces comptes (pour mesurer l'effet du test)
SELECT u.email, n.type, count(*) AS nombre
FROM "Notification" n
JOIN "User" u ON u.id = n."userId"
WHERE lower(u.email) ~ '^testuser([2-9]|10|11)@jeutaime\.test$' AND n.type::text LIKE 'REFUGE\_%'
GROUP BY u.email, n.type
ORDER BY u.email, n.type;
