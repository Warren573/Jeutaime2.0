# Confiance et classement — fondations techniques (PR 1)

**Statut : fondations seulement.** Aucune fonctionnalité de l'application n'émet encore d'événement de réputation ;
aucun ancien mécanisme n'est désactivé ; aucun barème n'est défini. Ce document décrit ce qui existe, ce qui est
volontairement absent et ce qui doit être validé avant le branchement.

## 1. Principes (validés)
- Récompenser beaucoup plus souvent que pénaliser ; pénalités réservées aux abus manifestes ou répétés.
- Un membre discret mais respectueux peut atteindre une excellente fiabilité ; la participation ne masque jamais un
  mauvais comportement (axes séparés, jamais additionnés).
- Rien ne s'achète : les pièces (`Wallet`, `CoinTransaction`) sont totalement indépendantes (le moteur ne les lit ni ne
  les écrit — vérifié par test).
- Aucune pénalité automatique sur un simple signalement ; aucun blocage légitime pénalisé.

## 2. Ce qui est ajouté
| Élément | Rôle |
|---|---|
| `ReputationState` | État individuel (fiabilité, participation, popularité, époque, engagements évalués, dernière activité, remise à zéro, réévaluation, données d'accueil). Créé **à la demande**, base **neutre** (tout à 0) : aucun ancien score n'est converti. |
| `ReputationEvent` | Registre **append-only** : un fait, une ligne, clé d'idempotence unique, époque et version des règles. Jamais modifié ni supprimé. |
| `ReputationDispute` | Préparation de la contestation (aucune route, aucune interface). |
| `VacationPeriod` | Historique des périodes de mode vacances, alimenté à partir de la mise en service. |
| `Match.brokenById / brokenAt / breakKind / questionsValidatedAt`, `MessageInABottle.brokenById / brokenAt` | Auteur, date et nature des ruptures ; date de validation des trois questions. `NULL` pour tout l'historique (jamais de donnée inventée, jamais de pénalité rétroactive). |
| `policies/reputation.ts` | Règles **pures** : axes, registre de types d'événements, validation, seuil d'inactivité, date locale de l'accueil. |
| `modules/reputation/reputation.service.ts` | Moteur serveur : enregistrement idempotent, annulation compensatoire, ajustement ADMIN/OWNER, contestation, activité/remise à zéro, données d'accueil, outil de remise à zéro des comptes de test. |

Migration : `20261128150000_reputation_foundations` — **additive uniquement** (aucun `DROP`, aucune écriture de données),
rejouée sur l'état de production simulé par la CI. À appliquer en production **uniquement par le déploiement Render**
(`migrate deploy`) après fusion ; jamais manuellement sur Neon.

## 3. Garanties du moteur
1. **Serveur seul** : aucune route n'est ajoutée ; aucun calcul côté client.
2. **Atomicité et concurrence** : chaque écriture se fait dans une transaction et sous un verrou de ligne
   (`SELECT … FOR UPDATE` sur `ReputationState`) : événements, annulations et remises à zéro d'un même membre sont
   sérialisés ; les incréments sont atomiques.
3. **Idempotence** : `dedupeKey` unique (`INSERT … ON CONFLICT DO NOTHING`) ; un doublon ne modifie ni le registre ni l'état.
   La clé identifie le **fait** (`buildDedupeKey(kind, sourceType, sourceId, userId)`), jamais la requête.
4. **Axes isolés** : un type d'événement est rattaché à un seul axe ; un autre axe est refusé.
5. **Annulation** : événement compensatoire (`REVERSAL`, delta opposé, `reversalOf` unique → une seule annulation par
   événement). L'original reste intact. Après une remise à zéro, une annulation d'un événement d'une époque révolue est
   journalisée **sans** fabriquer de points (`affectsState = false`).
6. **Versionnement** : `REPUTATION_RULE_VERSION` est inscrit dans chaque événement ; aucun recalcul rétroactif.
7. **Droits** : ajustement, annulation et arbitrage réservés à ADMIN et OWNER (au niveau service) ; les routes qui les
   exposeront plus tard devront utiliser `requireRole` (double authentification ADMIN/OWNER déjà imposée). Chaque
   opération est écrite dans `AuditLog`.

## 4. Remise à zéro après inactivité (désactivée)
- Aucun seuil n'est configuré : `REPUTATION_INACTIVITY_RESET_DAYS` est **absente** → fonction **désactivée**.
- Évaluation **à la demande** (`registerParticipationActivity`) — aucune tâche planifiée, aucun polling.
- Due si : seuil configuré, dernière activité **connue**, délai atteint, et aucune remise à zéro depuis cette activité
  (idempotence). Le mode vacances est ignoré (règle validée).
- Effet : trois axes et engagements évalués remis à 0, époque +1, `reliabilityReassessment = true`, accueil de retour en
  attente, repère `INACTIVITY_RESET` (valeurs précédentes conservées dans `meta`). **Rien d'autre n'est touché.**
- `lastActivityAt` n'est écrit qu'une fois par heure au plus (économie d'écritures).
- **À valider avant activation** : le seuil exact (90 jours ou 3 mois calendaires), la liste exhaustive des actions qui
  comptent comme « activité réelle », le fuseau de référence.

## 5. Données prévues pour les accueils (aucune interface)
`lastWelcomeDay` (date locale « AAAA-MM-JJ », un affichage par jour, jamais de retour en arrière), `welcomeBackPendingAt`
(accueil « Heureux de te revoir ! » une seule fois par période d'inactivité), `lastSummaryAt`. Fonctions :
`markDailyWelcomeShown`, `acknowledgeWelcomeBack`, `getWelcomeState`.

## 6. Comptes de test
`resetReputationForTestAccounts(userIds)` efface la réputation des comptes indiqués (refuse hors environnement de test).
La suppression d'un compte supprime sa réputation par cascade. Les scripts existants de réinitialisation ne sont pas
modifiés.

## 7. Ce qui n'est PAS fait (volontairement)
- Aucun barème, seuil de pénalité, plafond, niveau public, formule de sélection, nombre de votes d'élection, fenêtre
  d'observation.
- Aucun branchement des fonctionnalités (lettres, matchs, bouteilles, salons, Refuge, duels, élections).
- **Les anciens mécanismes restent actifs et inchangés** : `discoveryActivityScore`, `discoveryBreakPenalty`, les trois
  triggers SQL, le −40 de rupture immédiate, le −5/jour d'absence du Refuge, l'XP et les niveaux. Leur remplacement
  se fera après test du nouveau moteur, par une bascule séparée et validée.
- Aucune règle sur les pièces n'est modifiée.

## 8. Types d'événements
Seuls trois types **système** existent (`ADMIN_ADJUST`, `REVERSAL`, `INACTIVITY_RESET`). Chaque fonctionnalité déclarera
ses types (`registerReputationKind`) dans la PR qui fixe son barème, avec un axe unique.
