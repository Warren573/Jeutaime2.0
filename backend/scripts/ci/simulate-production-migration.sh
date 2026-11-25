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
#             BASE_SHA (commit de la base de la PR : les NOUVELLES migrations sont celles ajoutées depuis ce commit),
#             NEW_MIGRATIONS (liste séparée par des espaces ; remplace la détection Git),
#             SKIP_DEPLOY=1 (s'arrêter avant migrate deploy), DB_NAME (défaut jt_prod_sim).
# Les migrations nouvelles sont détectées depuis Git, jamais codées en dur : une migration déjà présente dans la base
# de la PR n'est pas rejouée, et une migration ajoutée par la PR n'est jamais « baselinée » sans être exécutée.
set -euo pipefail

: "${PG_URL_ADMIN:?PG_URL_ADMIN requis}"
: "${BASE_SCHEMA:?BASE_SCHEMA requis}"
DB_NAME="${DB_NAME:-jt_prod_sim}"
case "$PG_URL_ADMIN" in
  *@localhost:*|*@127.0.0.1:*) ;;
  *) echo "REFUS : PG_URL_ADMIN doit pointer vers une base LOCALE (jamais Neon/production)." >&2; exit 2 ;;
esac
case "$DB_NAME" in *prod*|*neon*) ;; *) echo "REFUS : DB_NAME doit contenir « prod » (base de simulation)." >&2; exit 2 ;; esac

cd "$(dirname "$0")/../.."

# Nouvelles migrations de la PR (ajoutées depuis BASE_SHA) ; refus si une migration EXISTANTE est modifiée
# (la somme de contrôle Prisma bloquerait le démarrage en production).
if [ -n "${NEW_MIGRATIONS:-}" ]; then
  read -r -a NEW_LIST <<< "$NEW_MIGRATIONS"
else
  : "${BASE_SHA:?BASE_SHA requis pour détecter les nouvelles migrations (ou NEW_MIGRATIONS)}"
  mapfile -t NEW_LIST < <(git diff --name-only --diff-filter=A --relative "$BASE_SHA"...HEAD -- prisma/migrations \
    | sed -n 's#^prisma/migrations/\([^/]*\)/migration\.sql$#\1#p' | sort -u)
  CHANGED="$(git diff --name-only --diff-filter=MDR --relative "$BASE_SHA"...HEAD -- prisma/migrations || true)"
  [ -z "$CHANGED" ] || { echo "$CHANGED" >&2; echo "REFUS : une migration déjà présente dans la base de la PR est modifiée ou supprimée." >&2; exit 2; }
fi
is_new() { local m; for m in "${NEW_LIST[@]:-}"; do [ "$m" = "$1" ] && return 0; done; return 1; }
echo "Nouvelles migrations à simuler : ${NEW_LIST[*]:-(aucune)}"
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
# Données du Refuge existantes (tentative sans aliment) : doivent traverser la migration inchangées.
Q "INSERT INTO \"RefugeSession\"(id,\"adopteId\",\"adoptantId\",\"animalType\",\"animalCategory\",\"animalSexe\",\"animalAgeMonths\",\"acceptedSexe\",status,\"lastAdopteActivityAt\")
   VALUES ('sim-r1','sim-u1','sim-u2','CHAT','SIMPLE','NEUTRE',12,'HOMME_FEMME','ACTIVE',now())"
Q "INSERT INTO \"RefugeDailyChoice\"(id,\"refugeSessionId\",\"dayNumber\",action1,action2) VALUES ('sim-c1','sim-r1',1,'NOURRIR','JOUER')"
Q "INSERT INTO \"RefugeGuess\"(id,\"refugeSessionId\",\"dayNumber\",\"guessedAction1\",\"guessedAction2\") VALUES ('sim-g1','sim-r1',1,'NOURRIR','LAVER')"
RG_FP_SQL="SELECT md5(string_agg(id||'|'||\"refugeSessionId\"||'|'||\"dayNumber\"||'|'||\"guessedAction1\"::text||'|'||\"guessedAction2\"::text||'|'||\"submittedAt\"::text, ';' ORDER BY id)) FROM \"RefugeGuess\""
RG_BEFORE="$(Q "$RG_FP_SQL")"
FP_SQL="SELECT md5(string_agg(id||'|'||\"userId\"||'|'||type::text||'|'||message||'|'||coalesce(meta::text,'')||'|'||\"isRead\"::text||'|'||\"createdAt\"::text, ';' ORDER BY id)) FROM \"Notification\""
BEFORE_FP="$(Q "$FP_SQL")"; BEFORE_N="$(Q 'SELECT count(*) FROM "Notification"')"; BEFORE_U="$(Q 'SELECT count(*) FROM "User"')"
ok "avant : $BEFORE_U comptes, $BEFORE_N notifications, empreinte $BEFORE_FP"

echo "3. Historique Prisma reconstitué (terminées + 2 annulées)"
FINISHED=0
for dir in prisma/migrations/*/; do
  name="$(basename "$dir")"; is_new "$name" && continue
  npx prisma migrate resolve --applied "$name" >/dev/null 2>&1 || ko "baseline impossible : $name"
  FINISHED=$((FINISHED+1))
done
# 2 migrations annulées : une tentative échouée puis résolue « rolled-back », une autre sur un nom absent du dépôt.
EXCLUDE="$(mktemp)"; printf '%s\n' migration_lock.toml "${NEW_LIST[@]:-}" > "$EXCLUDE"
FIRST="$(ls prisma/migrations | grep -v -x -F -f "$EXCLUDE" | sed -n 5p)"; rm -f "$EXCLUDE"
Q "INSERT INTO _prisma_migrations(id,checksum,migration_name,started_at,finished_at,rolled_back_at,logs,applied_steps_count)
   VALUES (gen_random_uuid()::text,'x','$FIRST',now()-interval '30 days',NULL,now()-interval '30 days','échec simulé',0),
          (gen_random_uuid()::text,'x','20260101000000_supprimee_du_depot',now()-interval '40 days',NULL,now()-interval '40 days','échec simulé',0)"
T="$(Q 'SELECT count(*) FROM _prisma_migrations')"; F="$(Q 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL')"
R="$(Q 'SELECT count(*) FROM _prisma_migrations WHERE rolled_back_at IS NOT NULL')"; X="$(Q 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL')"
ok "historique : $T enregistrées, $F terminées, $R annulées, $X échouée non résolue"
[ "$X" = "0" ] || ko "une migration échouée non résolue bloquerait le démarrage"

echo "4. prisma migrate status (avant)"
STATUS="$(npx prisma migrate status 2>&1 || true)"; echo "$STATUS" | sed 's/^/    /' | tail -6
for m in "${NEW_LIST[@]:-}"; do
  [ -z "$m" ] && continue
  echo "$STATUS" | grep -q "$m" || ko "la nouvelle migration $m n'apparaît pas comme en attente"
done
echo "$STATUS" | grep -qi "failed" && ko "migrate status signale un échec"
ok "en attente : exactement les nouvelles migrations (${#NEW_LIST[@]})"

if [ "${SKIP_DEPLOY:-0}" = "1" ]; then echo "SKIP_DEPLOY=1 : état d'avant migration prêt (base $DB_NAME)."; exit 0; fi
echo "5. prisma migrate deploy (commande de démarrage Render)"
OUT="$(npx prisma migrate deploy 2>&1)" || { echo "$OUT" >&2; ko "migrate deploy a échoué"; }
echo "$OUT" | grep -E "Applying|successfully|No pending" | sed 's/^/    /'
for m in "${NEW_LIST[@]:-}"; do
  [ -z "$m" ] && continue
  echo "$OUT" | grep -q "Applying migration \`$m\`" || ko "la migration $m n'a pas été appliquée"
done
[ "$(echo "$OUT" | grep -c 'Applying migration')" = "${#NEW_LIST[@]}" ] || ko "le nombre de migrations appliquées ne correspond pas aux nouvelles migrations"
ok "exactement ${#NEW_LIST[@]} migration(s) appliquée(s), les nouvelles uniquement"

echo "6. Données après migration"
AFTER_FP="$(Q "$FP_SQL")"; AFTER_N="$(Q 'SELECT count(*) FROM "Notification"')"; AFTER_U="$(Q 'SELECT count(*) FROM "User"')"
[ "$AFTER_FP" = "$BEFORE_FP" ] || ko "empreinte des notifications modifiée ($BEFORE_FP → $AFTER_FP)"
[ "$AFTER_N" = "$BEFORE_N" ] && [ "$AFTER_U" = "$BEFORE_U" ] || ko "effectifs modifiés"
[ "$(Q 'SELECT count(*) FROM "Notification" WHERE "dedupeKey" IS NOT NULL')" = "0" ] || ko "dedupeKey inattendu sur des anciennes lignes"
ok "après : mêmes $AFTER_U comptes, $AFTER_N notifications, même empreinte, dedupeKey vide partout"
[ "$(Q "$RG_FP_SQL")" = "$RG_BEFORE" ] || ko "données du Refuge modifiées par la migration"
[ "$(Q 'SELECT count(*) FROM "RefugeSession"')" = "1" ] || ko "session du Refuge perdue"
if is_new 20261125190000_refuge_guess_food; then
  [ "$(Q "SELECT count(*) FROM information_schema.columns WHERE table_name='RefugeGuess' AND column_name='foodChoice'")" = "1" ] || ko "colonne foodChoice absente après migration"
  [ "$(Q 'SELECT count(*) FROM "RefugeGuess" WHERE "foodChoice" IS NOT NULL')" = "0" ] || ko "foodChoice renseigné sur une ancienne tentative"
  ok "Refuge : colonne foodChoice présente, tentative existante intacte (foodChoice nul)"
else
  ok "Refuge : données existantes intactes"
fi

echo "7. Redémarrage (second migrate deploy) et dérive"
npx prisma migrate deploy 2>&1 | grep -q "No pending migrations" || ko "le redémarrage devrait être sans effet"
ok "redémarrage sans effet"
# Seule différence admise : la table AccountDeactivation, créée par le SQL de migration et volontairement absente de
# schema.prisma (le code la lit en SQL brut) ; tout autre écart est une dérive.
DIFF_SQL="$(npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script 2>/dev/null || true)"
REST="$(printf '%s\n' "$DIFF_SQL" | grep -v -E '^(--|[[:space:]]*$)' | grep -v 'AccountDeactivation' || true)"
[ -z "$REST" ] || { echo "$REST" >&2; ko "dérive entre la base migrée et schema.prisma"; }
ok "aucune dérive de schéma (hors table AccountDeactivation issue des migrations)"
echo "SIMULATION PRODUCTION : RÉUSSIE"
