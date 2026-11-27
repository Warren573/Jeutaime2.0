# Test accéléré de fin d'aventure du Refuge

Outil de test **manuel**, réservé aux comptes `testuser2` à `testuser11@jeutaime.test`. Il ne modifie aucune règle de production, ni la durée réelle du Refuge, ni l'horloge du serveur.

## Principe

Pour la **seule session ciblée**, le script recule `startedAt` (et `endsAt = startedAt + 7 jours`) ainsi que les horodatages de ses propres choix et réponses du même écart : la session « vit » plus vite. Chaque jour est rejoué avec les vraies fonctions du service, donc les pièces, les points, les bonus et les notifications sont ceux de la production.

## Mise en place (une seule fois)

1. GitHub → Settings → Secrets and variables → Actions → secret **`REFUGE_TEST_DATABASE_URL`** : l'URL de connexion Neon utilisée par Render (`DATABASE_URL`). Elle n'est jamais affichée.
2. Recommandé : GitHub → Settings → Environments → créer **`refuge-test`** avec un relecteur obligatoire (validation avant chaque exécution).
3. Lancer : Actions → « Refuge — test accéléré de fin d'aventure » → Run workflow (branche `main`).

## Gardes

- Simulation par défaut : **aucune écriture**. L'exécution réelle exige `mode = apply` ET la phrase exacte `JE CONFIRME <scénario> <étape> <compagnon> <parrain>` affichée par la simulation.
- Comptes : adresses `testuser2` à `testuser11@jeutaime.test` uniquement, rôle `USER`, non suspendus (le compte d'administration `testuser4` est refusé).
- Adoption en cours préservée : tout compte participant d'un Refuge ouvert est refusé pour `adopt` ; les sessions listées dans `protect_session_ids` sont intouchables ; chaque étape après `adopt` exige l'identifiant exact de la session et vérifie le couple.
- Une étape ne s'exécute qu'une fois et dans l'ordre. Aucune suppression, aucune réinitialisation, aucun autre compte.
- Le dévoilement n'est proposé qu'après 168 h : l'étape `day-7` vérifie qu'il ne l'est pas, `fast-forward` est la seule étape qui franchit les 168 h.

## Déroulé (une exécution = une pause pour vérifier sur l'iPhone)

| Étape | Effet | À regarder sur l'iPhone |
|---|---|---|
| `adopt` | Le compagnon propose, le parrain adopte (règles v2) | Fenêtre d'adoption (compagnon), historique du parrain |
| `days-1-3` | Jours 1 à 3 joués, session placée au début du jour 4 | Calendrier, 10 pièces par jour |
| `days-4-6` | Jours 4 à 6 joués, session placée au début du jour 7 | Absences, points |
| `day-7` | Jour 7 joué (session au jour 7) | **Aucun dévoilement proposé** |
| `fast-forward` | 168 h écoulées : règlement final | **Fenêtre de fin**, bilan, bonus |
| `decision` | `none` : tu décides sur l'iPhone ; `scenario` : le script applique | Dévoilement mutuel ou refus ; le Refuge actif disparaît après un refus |
| `status` | Lecture seule | — |

## Valeurs attendues

| Scénario | Compagnon | Parrain / marraine | Fin |
|---|---|---|---|
| S1 parcours parfait | 70 + 100 = 170 pièces, 0 point | 170 pièces, 0 point | dévoilement mutuel accepté |
| S2 incomplet | 50 pièces, −10 points | 40 pièces, −10 points | refus (compagnon) |
| S3 7/7 sans 14/14 | 70 + 50 = 120 pièces, 0 point | 120 pièces, 0 point | compagnon accepte, parrain refuse |

## Précautions

- Ne pas laisser plus de ~20 h entre deux étapes d'un même scénario (la tâche horaire règlerait les jours naturellement).
- La tâche horaire peut envoyer un rappel « nouvelle journée » aux comptes de test pendant une pause : c'est normal.
- Les notifications et push sont réels (comptes de test uniquement) : le script ne désactive rien.
- Les soldes et points des comptes de test changent définitivement (autorisé) ; l'outil n'a aucune commande de remise à zéro.
- Inventaire en lecture seule sans exécuter de script : `backend/scripts/ops/refuge-test-inventory.sql` (SELECT uniquement).
