#!/usr/bin/env bash
# Simule l'état de production AVANT la migration puis applique `prisma migrate deploy` comme le fait Render.
#
#   - schéma « avant » (BASE_SCHEMA) créé par `db push`, comme une base historique ;
#   - historique Prisma reconstitué : toutes les migrations déjà présentes enregistrées « terminées »,
#     plus 2 lignes « annulées » (rolled_back_at renseigné), comme en production (63 terminées + 2 annulées) ;
#   - données de test (utilisateurs, notifications d'anciens types) dont une EMPREINTE est comparée avant/après ;
#   - `migrate status`, `migrate deploy`, second `migrate deploy` (redémarrage), contrôle de dérive du schéma.
#
# Ne touche QUE la base locale désignée (DB_NAME) : refuse tout hôte qui n'est pas local.
# Variables : PG_URL_ADMIN (ex. postgresql://postgres:postgres@127.0.0.1:5432/postgres), BASE_SCHEMA (chemin du schema « avant »),
#             SKIP_DEPLOY=1 (s'arrêter avant migrate deploy), DB_NAME (défaut jt_prod_sim), NEW_MIGRATION (défaut 20261113150000_notifications_phase2).
set -euo pipefail

: "${PG_URL_ADMIN:?PG_URL_ADMIN requis}"
: "${BASE_SCHEMA:?BASE_SCHEMA requis}"
DB_NAME="${DB_NAME:-jt_prod_sim}"
NEW_MIGRATION="${NEW_MIGRATION:-20261113150000_notifications_phase2}"
case "$PG_URL_ADMIN" in
  *@localhost:*|*@127.0.0.1:*) ;;
  *) echo "REFUS : PG_URL_ADMIN doit pointer vers une base LOCALE (jamais Neon/production)." >&2; exit 2 ;;
esac
case "$DB_NAME" in *prod*|*neon*) ;; *) echo "REFUS : DB_NAME doit contenir « prod » (base de simulation)." >&2; exit 2 ;; esac

cd "$(dirname "$0")/../.."
BASE_URL="${PG_URL_ADMIN%/*}"
export DATABASE_URL="${BASE_URL}/${DB_NAME}?schema=public"
export DIRECT_URL="$DATABASE_URL"
PSQL_URL="${BASE_URL}/${DB_NAME}"
Q() { psql "$PSQL_URL" -v ON_ERROR_STOP=1 -Atq -c "$1"; }
ok() { echo "  ✔ $*"; }
ko() { echo "  ✘ $*" >&2; exit 1; }

echo "1. Base de simulation « $DB_NAME » au schéma AVANT la PR"
psql "$PG_URL_ADMIN" -v ON_ERROR_STOP=1 -q -c "DROP DATABASE IF EXISTS \"$DB_NAME\"" -c "CREATE DATABASE \"$DB_NAME\""
npx prisma db push --schema "$BASE_SCHEMA" --skip-generate --accept-data-loss >/dev/null
# Tables créées uniquement par du SQL de migration (absentes de schema.prisma, donc de `db push`) :
# elles existent en production, la simulation doit les reproduire (le code les lit en SQL brut).
psql "${BASE_URL}/${DB_NAME}" -v ON_ERROR_STOP=1 -q -f prisma/migrations/20260807143000_add_account_deactivation/migration.sql
ok "schéma créé (+ table AccountDeactivation issue des migrations)"

echo "2. Données existantes"
Q "INSERT INTO \"User\"(id,email,\"passwordHash\",\"updatedAt\") VALUES ('sim-u1','sim1@x.test','h',now()),('sim-u2','sim2@x.test','h',now()),('sim-u3','sim3@x.test','h',now())"
Q "INSERT INTO \"Notification\"(id,\"userId\",type,message,meta,\"isRead\") VALUES
   ('sim-n1','sim-u1','LETTER_RECEIVED','Nouvelle lettre','{\"matchId\":\"m1\"}',false),
   ('sim-n2','sim-u1','SECURITY_ALERT','Alerte',NULL,true),
   ('sim-n3','sim-u2','ADMIN_MESSAGE','Message',NULL,false),
   ('sim-n4','sim-u3','QUESTIONS_PASSED','Questions','{\"matchId\":\"m2\"}',false),
   ('sim-n5','sim-u3','OFFERING_RECEIVED','Offrande','{\"salonId\":\"s1\"}',true)"
FP_SQL="SELECT md5(string_agg(id||'|'||\"userId\"||'|'||type::text||'|'||message||'|'||coalesce(meta::text,'')||'|'||\"isRead\"::text||'|'||\"createdAt\"::text, ';' ORDER BY id)) FROM \"Notification\""
BEFORE_FP="$(Q "$FP_SQL")"; BEFORE_N="$(Q 'SELECT count(*) FROM "Notification"')"; BEFORE_U="$(Q 'SELECT count(*) FROM "User"')"
ok "avant : $BEFORE_U comptes, $BEFORE_N notifications, empreinte $BEFORE_FP"

echo "3. Historique Prisma reconstitué (terminées + 2 annulées)"
FINISHED=0
for dir in prisma/migrations/*/; do
  name="$(basename "$dir")"; [ "$name" = "$NEW_MIGRATION" ] && continue
  npx prisma migrate resolve --applied "$name" >/dev/null 2>&1 || ko "baseline impossible : $name"
  FINISHED=$((FINISHED+1))
done
# 2 migrations annulées : une tentative échouée puis résolue « rolled-back », une autre sur un nom absent du dépôt.
FIRST="$(ls prisma/migrations | grep -v -E "^(migration_lock.toml|$NEW_MIGRATION)$" | sed -n 5p)"
Q "INSERT INTO _prisma_migrations(id,checksum,migration_name,started_at,finished_at,rolled_back_at,logs,applied_steps_count)
   VALUES (gen_random_uuid()::text,'x','$FIRST',now()-interval '30 days',NULL,now()-interval '30 days','échec simulé',0),
          (gen_random_uuid()::text,'x','20260101000000_supprimee_du_depot',now()-interval '40 days',NULL,now()-interval '40 days','échec simulé',0)"
T="$(Q 'SELECT count(*) FROM _prisma_migrations')"; F="$(Q 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL')"
R="$(Q 'SELECT count(*) FROM _prisma_migrations WHERE rolled_back_at IS NOT NULL')"; X="$(Q 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL')"
ok "historique : $T enregistrées, $F terminées, $R annulées, $X échouée non résolue"
[ "$X" = "0" ] || ko "une migration échouée non résolue bloquerait le démarrage"

echo "4. prisma migrate status (avant)"
STATUS="$(npx prisma migrate status 2>&1 || true)"; echo "$STATUS" | sed 's/^/    /' | tail -6
echo "$STATUS" | grep -q "$NEW_MIGRATION" || ko "la nouvelle migration n'apparaît pas comme en attente"
echo "$STATUS" | grep -qi "failed" && ko "migrate status signale un échec"
ok "seule la nouvelle migration est en attente"

if [ "${SKIP_DEPLOY:-0}" = "1" ]; then echo "SKIP_DEPLOY=1 : état d'avant migration prêt (base $DB_NAME)."; exit 0; fi
echo "5. prisma migrate deploy (commande de démarrage Render)"
OUT="$(npx prisma migrate deploy 2>&1)" || { echo "$OUT" >&2; ko "migrate deploy a échoué"; }
echo "$OUT" | grep -E "Applying|successfully" | sed 's/^/    /'
echo "$OUT" | grep -q "Applying migration \`$NEW_MIGRATION\`" || ko "la migration n'a pas été appliquée"
[ "$(echo "$OUT" | grep -c 'Applying migration')" = "1" ] || ko "plus d'une migration appliquée"
ok "exactement 1 migration appliquée"

echo "6. Données après migration"
AFTER_FP="$(Q "$FP_SQL")"; AFTER_N="$(Q 'SELECT count(*) FROM "Notification"')"; AFTER_U="$(Q 'SELECT count(*) FROM "User"')"
[ "$AFTER_FP" = "$BEFORE_FP" ] || ko "empreinte des notifications modifiée ($BEFORE_FP → $AFTER_FP)"
[ "$AFTER_N" = "$BEFORE_N" ] && [ "$AFTER_U" = "$BEFORE_U" ] || ko "effectifs modifiés"
[ "$(Q 'SELECT count(*) FROM "Notification" WHERE "dedupeKey" IS NOT NULL')" = "0" ] || ko "dedupeKey inattendu sur des anciennes lignes"
ok "après : mêmes $AFTER_U comptes, $AFTER_N notifications, même empreinte, dedupeKey vide partout"

echo "7. Redémarrage (second migrate deploy) et dérive"
npx prisma migrate deploy 2>&1 | grep -q "No pending migrations" || ko "le redémarrage devrait être sans effet"
ok "redémarrage sans effet"
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code >/dev/null || ko "dérive entre la base migrée et schema.prisma"
ok "aucune dérive de schéma"
echo "SIMULATION PRODUCTION : RÉUSSIE"
