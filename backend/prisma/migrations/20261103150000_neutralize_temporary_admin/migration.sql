-- Neutralise le compte d'administration temporaire créé par
-- 20261002102500_create_temporary_admin (email admin@jeutaime.test).
--
-- Pourquoi : cette migration historique contient un hash de mot de passe figé,
-- visible dans le dépôt public. Sur toute nouvelle base, elle recrée le compte
-- ADMIN avec les mêmes identifiants. Cette migration s'exécute juste après et
-- retire tout accès à ce compte.
--
-- Ce que fait cette migration (et rien d'autre) :
--   * rôle ADMIN -> USER (plus aucun droit d'administration) ;
--   * mot de passe remplacé par une valeur générée par PostgreSQL au moment de
--     la migration (unique pour chaque base, aucun hash figé dans ce fichier).
--     Cette valeur n'est PAS un hash bcrypt : bcrypt.compare renvoie toujours
--     false, aucun mot de passe ne peut donc correspondre ;
--   * compte banni définitivement (connexion et requêtes refusées) ;
--   * sessions (refresh tokens) révoquées.
--
-- Garanties :
--   * aucune ligne n'est supprimée (profil, portefeuille, audit conservés) ;
--   * seul l'email exact admin@jeutaime.test est ciblé ;
--   * le compte OWNER n'est jamais modifié (garde role <> 'OWNER') ;
--   * réexécution sans risque : sans effet si le compte n'existe pas ; si le
--     compte est déjà neutralisé, il le reste.

UPDATE "RefreshToken"
SET "revokedAt" = CURRENT_TIMESTAMP
WHERE "revokedAt" IS NULL
  AND "userId" IN (
    SELECT "id" FROM "User"
    WHERE lower("email") = lower('admin@jeutaime.test')
      AND "role" <> 'OWNER'
  );

UPDATE "User"
SET
  "role" = 'USER',
  "passwordHash" = '!disabled:' || md5(random()::text || clock_timestamp()::text),
  "isBanned" = true,
  "banReason" = 'Compte d''administration temporaire neutralisé',
  "banUntil" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE lower("email") = lower('admin@jeutaime.test')
  AND "role" <> 'OWNER';
