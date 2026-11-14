# Notifications phase 2 — mise en production (PR #209)

Document d'exploitation. **Rien ici ne s'exécute sans l'autorisation explicite de Warren** (fusion, Neon, Render, OTA).

## 1. Ce qui a été vérifié (preuves)

| Point | Résultat |
|---|---|
| Render (`jeutaime-staging`, branche `main`) | Build `npm ci && npm run build` · Start `npm run start:render` = `npx prisma migrate deploy && node dist/server.js` · déploiement automatique · 1 instance |
| Historique Prisma de production (lecture seule, relevé par Warren) | 65 enregistrées, **63 terminées**, **2 annulées**, 0 échouée non résolue ; dernière terminée `20261110120000_account_security` |
| `prisma migrate deploy` sur cet état reproduit | Applique **uniquement** `20261113150000_notifications_phase2` ; les 2 migrations annulées (même une absente du dépôt) ne bloquent rien |
| Contrôle négatif | Une migration **échouée non résolue** produirait `P3009` et bloquerait le démarrage → c'est ce que les « annulées » ne sont pas |
| Données existantes | Même nombre de lignes dans les tables, **même empreinte** des notifications, `dedupeKey` vide partout |
| Démarrage du nouveau backend après migration | `npm run start:render` : migre puis sert ; `/api/health`, `/api/health/db`, inscription, connexion, notifications (liste, compteur, tout lire), profil : OK |
| Ancien backend (`main` @ `c362be4d`) sur la base migrée | Démarre avec sa propre commande (« No pending migrations »), mêmes routes OK |
| Redémarrage | Second `migrate deploy` : « No pending migrations » |
| Dérive de schéma | « No difference detected » |

Scripts reproductibles (GitHub Actions : `.github/workflows/notifications-phase2-tests.yml`) :
`backend/scripts/ci/simulate-production-migration.sh`, `backend/scripts/ci/smoke-backend.mjs`, `backend/scripts/ops/verify-notifications-migration.sql`.

**Limites** : la simulation est locale (PostgreSQL 15/16, pas Neon) ; la base de production réelle n'a pas été touchée ; les tables créées uniquement par du SQL de migration (ex. `AccountDeactivation`) sont reproduites à partir de leurs migrations.

## 2. Comportement de Render à connaître

* **Fusionner = déployer.** Render déploie `main` automatiquement, et `.github/workflows/verify-deployment.yml` appelle aussi le hook de déploiement à chaque push sur `main` : deux déclenchements pour une fusion sont possibles. C'est sans danger (le second `migrate deploy` est sans effet : verrou consultatif Prisma + « No pending migrations »).
* **La migration s'applique au démarrage** de la nouvelle version (`start:render`), **avant** que le serveur n'écoute. Avec une instance et un déploiement sans interruption, l'ancienne version continue de servir pendant la migration : c'est compatible (la migration est additive, vérifié avec l'ancien backend réel).
* Si la migration échoue, le processus s'arrête, le déploiement échoue et **Render conserve la version précédente**.
* `DIRECT_URL` doit exister dans l'environnement Render (le schéma Prisma la lit via `directUrl`) et pointer vers l'hôte **direct** de Neon (sans `-pooler`). Des migrations récentes ont déjà été appliquées ainsi, mais **à confirmer** dans le tableau de bord.

## 3. Interrupteur de sécurité `NOTIFY_PHASE2_EVENTS`

Variable d'environnement Render, lue à chaque événement. **Absente ou `true` : les nouveaux événements sont actifs. `false` : aucune nouvelle notification** (ni ligne en base, ni push) ; seul le push historique des réponses de bouteille continue, à l'identique d'avant. Aucune donnée n'est modifiée.

Elle permet d'activer en deux temps et de revenir en arrière **sans redéployer ni retirer de données**. Pourquoi c'est important : un retour au code précédent **après** création de nouvelles notifications fait échouer (HTTP 500) la *liste* « Mes notifications » des personnes concernées (l'ancien code ne connaît pas les nouveaux types ; compteur et reste de l'app non touchés — vérifié).

## 4. Procédure de mise en production

**Avant la fusion (aucun changement de production)**
1. PR #209 : tous les contrôles verts, passée de brouillon à « prête pour relecture ».
2. Dans Render → Environment : **ajouter `NOTIFY_PHASE2_EVENTS=false`** *(autorisation requise ; le service redémarre, sans effet sur le code actuel qui l'ignore)*.
3. Confirmer que `DIRECT_URL` est définie (hôte direct).
4. Noter le SHA actuellement déployé (`GET /api/health/version`) : c'est la cible de retour.

**Sauvegarde Neon** *(autorisation requise — non faite à ce jour)* — projet `nameless-meadow-40740116`, branche parente `br-small-star-aldpbor6`, base `neondb`
5. Noter l'instant UTC exact : `date -u +%Y-%m-%dT%H:%M:%SZ` → **c'est `cutoff`**.
6. Console Neon → Branches → *Create branch* depuis `br-small-star-aldpbor6` (état courant), nommée `backup-pre-notifications-phase2-AAAAMMJJ`. (CLI équivalente : `neonctl branches create --project-id nameless-meadow-40740116 --parent br-small-star-aldpbor6 --name backup-pre-notifications-phase2-AAAAMMJJ`.) Cette branche est un instantané instantané ; **ne pas la supprimer avant la fin de la période d'observation**.
7. Sauvegarde logique indépendante, depuis ton poste (lecture seule sur la production) : `pg_dump --format=custom --no-owner "$DIRECT_URL" -f jeutaime-avant-notif-phase2.dump` (la variable vient de ton environnement, jamais collée dans un fichier ou une conversation).
8. Vérifier la fenêtre de restauration (PITR) de ton offre Neon : **non vérifiée, offre inconnue**.
9. État « avant » : `psql "$DIRECT_URL_LECTURE" -v cutoff="'<cutoff>'" -f backend/scripts/ops/verify-notifications-migration.sql > avant.txt` (attendu : 65 / 63 / 2 / 0 ; colonne `dedupeKey` = 0 ; 12 valeurs d'enum).

**Fusion et déploiement** *(autorisation requise)*
10. Fusionner la PR #209. Render construit et démarre.
11. Dans les journaux Render, attendre `Applying migration 20261113150000_notifications_phase2` puis `All migrations have been successfully applied`, puis le serveur à l'écoute.
12. `GET /api/health` → ok ; `GET /api/health/db` → connected ; `GET /api/health/version` → SHA de la fusion.
13. État « après », **même `cutoff`** : `... > apres.txt` puis `diff avant.txt apres.txt`. **Seules** doivent différer : enregistrées 66, terminées 64, dernière migration, colonne `dedupeKey` = 1, index = 1, enum = 26. Effectifs et empreinte : **identiques**. Sinon : arrêt, ne pas activer.
14. Se connecter avec un compte de test : « Mes notifications » s'ouvre, le compteur est inchangé, une lettre test arrive toujours.

**Activation (autorisation requise)**
15. Render → Environment : mettre `NOTIFY_PHASE2_EVENTS=true` (ou supprimer la variable). Le service redémarre.
16. Avec **deux comptes de test** : défier (reçu), répondre à une bouteille (une seule non lue par bouteille), demander un dévoilement, jouer un tour des 3 questions. Vérifier : le bon destinataire seulement, jamais l'auteur, pas de doublon, le toucher mène au bon écran, aucun contenu privé dans le push. Bloquer l'autre compte → plus de notification.
17. Observer 24 h : journaux (`[notify]`), nombre de notifications créées (`creees_apres_cutoff`).

**OTA iOS (autorisation requise)** — en dernier. Le frontend gère déjà les types inconnus (catégorie « Notification », repli sur `/notifications`), l'OTA n'est donc pas bloquante pour le backend ; la publier après l'activation vérifiée.

## 5. Récupération (aucune suppression de notification ni de compte)

| Situation | Action | Perte de données |
|---|---|---|
| La migration échoue au démarrage | Render garde la version précédente. Lire l'erreur ; la migration est transactionnelle et idempotente, on peut la rejouer après correction. Si `P3009` apparaît : `prisma migrate resolve --rolled-back 20261113150000_notifications_phase2` puis redéployer | Aucune |
| Problème après activation | **`NOTIFY_PHASE2_EVENTS=false`** dans Render (redémarrage ~1 min). Les notifications déjà créées restent lisibles. Corriger, puis réactiver | Aucune |
| Bug du backend sans rapport avec les notifications | Redéployer la version précédente dans Render. **Sûr si l'interrupteur est resté à `false`** (aucune nouvelle ligne n'existe). Si des nouvelles notifications existent déjà : préférer *corriger vers l'avant* (voir ci-dessus : sinon la liste de ces personnes répond 500) | Aucune |
| Corruption ou erreur de données | Restaurer **dans une nouvelle branche Neon** depuis la sauvegarde, comparer, réinjecter les lignes nécessaires. Ne jamais écraser la branche de production sans décision explicite | Les écritures postérieures à la sauvegarde, si on remplace la production |
| Retrait de la structure (dernier recours) | `DROP INDEX "Notification_userId_dedupeKey_key"; ALTER TABLE "Notification" DROP COLUMN "dedupeKey";` — les valeurs d'enum ne se retirent pas sans reconstruire le type. **Non recommandé**, jamais sans accord | Les clés anti-doublon seulement |

## 6. Points d'attention restants
* Neon, la restauration et l'offre exacte n'ont pas été vérifiés ; tout ce qui touche Neon/Render reste à faire par toi ou sur ton autorisation.
* Aucun test sur appareil réel de la réception des push.
* Les 9 tests déjà en échec sur `main` (`account-security` 2FA, `session-isolation`, `offerings.consume`, `salonSessions`, `weekly-profile`) ne sont pas liés à cette PR.
