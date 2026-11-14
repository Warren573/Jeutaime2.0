-- Vérification AVANT / APRÈS la migration 20261113150000_notifications_phase2.
-- STRICTEMENT EN LECTURE SEULE (transaction READ ONLY, annulée en fin de script) : aucune écriture possible.
--
-- Usage (avec une URL en lecture ; mot de passe lu depuis PGPASSWORD ou ~/.pgpass, jamais dans la commande) :
--   AVANT : psql "<url>" -v cutoff="'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" -f verify-notifications-migration.sql > avant.txt
--   APRÈS : psql "<url>" -v cutoff="'<MÊME valeur que l'avant>'"        -f verify-notifications-migration.sql > apres.txt
--   puis : diff avant.txt apres.txt   (seules les lignes marquées [ATTENDU DIFFÉRENT] peuvent changer)
--
-- `cutoff` = l'instant de la sauvegarde : l'empreinte ne porte que sur les notifications créées jusque-là,
-- afin de rester comparable même si de nouvelles notifications arrivent après la mise en production.
\set ON_ERROR_STOP on
\pset footer off
\pset pager off
BEGIN READ ONLY;

\echo '== 1. Historique Prisma (avant : 65 enregistrées, 63 terminées, 2 annulées, 0 échouée non résolue ; après : 66 / 64 / 2 / 0)'
\echo '[ATTENDU DIFFÉRENT après : +1 enregistrée, +1 terminée ; « annulées » et « échouées non résolues » ne changent pas]'
SELECT count(*)                                                        AS enregistrees,
       count(*) FILTER (WHERE finished_at IS NOT NULL)                 AS terminees,
       count(*) FILTER (WHERE rolled_back_at IS NOT NULL)              AS annulees,
       count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS echouees_non_resolues
FROM _prisma_migrations;
\echo '[ATTENDU DIFFÉRENT après] dernière migration terminée (avant : 20261110120000_account_security ; après : 20261113150000_notifications_phase2)'
SELECT migration_name AS derniere_terminee FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY finished_at DESC, migration_name DESC LIMIT 1;
\echo '[ATTENDU DIFFÉRENT après] migrations terminées (avant 63 ; après 64)'
SELECT count(*) AS terminees FROM _prisma_migrations WHERE finished_at IS NOT NULL;

\echo '== 2. Effectifs des tables (doivent être IDENTIQUES avant/après la migration)'
SELECT 'User' AS table, count(*) FROM "User" UNION ALL
SELECT 'Profile', count(*) FROM "Profile" UNION ALL
SELECT 'UserSettings', count(*) FROM "UserSettings" UNION ALL
SELECT 'Wallet', count(*) FROM "Wallet" UNION ALL
SELECT 'Match', count(*) FROM "Match" UNION ALL
SELECT 'MessageInABottle', count(*) FROM "MessageInABottle" UNION ALL
SELECT 'AnonymousMessage', count(*) FROM "AnonymousMessage" UNION ALL
SELECT 'PrivateDuel', count(*) FROM "PrivateDuel" UNION ALL
SELECT 'RefugeSession', count(*) FROM "RefugeSession" UNION ALL
SELECT 'Report', count(*) FROM "Report" UNION ALL
SELECT 'Block', count(*) FROM "Block" UNION ALL
SELECT 'PushToken', count(*) FROM "PushToken"
ORDER BY 1;

\echo '== 3. Notifications existantes jusqu''au cutoff (effectif ET empreinte identiques avant/après)'
SELECT count(*) AS notifications_jusqu_au_cutoff,
       count(*) FILTER (WHERE "isRead" = false) AS non_lues,
       md5(coalesce(string_agg(id || '|' || "userId" || '|' || type::text || '|' || message || '|' || coalesce(meta::text, '') || '|' || "isRead"::text || '|' || "createdAt"::text, ';' ORDER BY id), '')) AS empreinte
FROM "Notification" WHERE "createdAt" <= :cutoff::timestamptz;
\echo 'Répartition par type (jusqu''au cutoff)'
SELECT type::text AS type, count(*) FROM "Notification" WHERE "createdAt" <= :cutoff::timestamptz GROUP BY 1 ORDER BY 1;

\echo '== 4. Structure (avant : colonne absente, 0 valeur phase 2 ; après : colonne présente, index présent, 26 valeurs d''enum)'
\echo '[ATTENDU DIFFÉRENT après]'
SELECT (SELECT count(*) FROM information_schema.columns WHERE table_name = 'Notification' AND column_name = 'dedupeKey') AS colonne_dedupeKey,
       (SELECT count(*) FROM pg_indexes WHERE tablename = 'Notification' AND indexname = 'Notification_userId_dedupeKey_key') AS index_unique,
       (SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'NotificationType') AS valeurs_enum_NotificationType;

\echo '== 5. Notifications créées par la phase 2 (avant : 0 ; après activation : > 0, jamais supprimées)'
SELECT count(*) AS creees_apres_cutoff FROM "Notification" WHERE "createdAt" > :cutoff::timestamptz;

ROLLBACK;
