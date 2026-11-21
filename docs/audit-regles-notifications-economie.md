# JeuTaime — Audit notifications, économie, règles métier, modération, réglages

- **Branche analysée** : `main` @ `5e2da93`
- **Méthode** : lecture du code et exécution des tests sur PostgreSQL local. Aucun appareil, aucun
  environnement réel. Une règle « attendue » est celle que vous avez écrite dans la mission ou dans
  `docs/product-rules/` ; une règle présente seulement dans le code est marquée **non confirmée**.
- Gravité : P0 critique · P1 important · P2 amélioration.

---

## 1. Notifications

### 1.1 État des lieux

| Élément | État | Preuve |
|---|---|---|
| Notifications internes (cloche) | en place, 9 types | `enum NotificationType` |
| Push | envoi par le service Expo, jetons purgés quand l'appareil n'est plus enregistré | `push.service.ts:133-146` |
| Préférences | 1 interrupteur général push + 5 catégories (rencontres, lettres, salons, activités, nouveautés) respectées avant envoi | `push.service.ts:70-82` |
| Confidentialité sur écran verrouillé | **conforme** : textes génériques, sans pseudo ni contenu (« Tu as reçu une nouvelle lettre ») | `policies/notifications.ts:166-178` |
| Limite de fréquence, regroupement | **absents** | — |
| Désenregistrement à la déconnexion | **absent** | aucune route de suppression de jeton |
| Bibliothèque côté application | `expo-notifications` 55.0.21 ; le SDK 54 attend 0.32.17 | `expo-doctor` |
| Droits iOS (`aps-environment`) | absents du projet iOS commité | `JeuTaime.entitlements` vide |

### 1.2 Couverture par événement

| Événement | Interne | Push | Constat |
|---|---|---|---|
| Nouvelle lettre | oui | oui | en place |
| Nouveau match | oui | oui | en place |
| Cadeaux et offrandes | oui | oui | en place |
| Magie reçue / rompue | oui | reçue : oui | en place |
| Réponse à une bouteille | non | oui | push seul, sans trace dans la cloche |
| Message de l'administration | oui | oui | en place |
| Invitation à un salon privé | oui | oui | en place |
| Abonnement souscrit / résilié | oui | non | types prêts, jamais émis à la souscription (achats non branchés) |
| Édition quotidienne du journal | non | oui | envoi groupé, catégorie « nouveautés » |
| Nouveau Smile, Smile réciproque | non | non | **absent** |
| Déblocage des trois questions | non | non | **absent** |
| Relance autorisée | non | non | **absent** |
| Demande de dévoilement (bouteille) | non | non | **absent** |
| Invitation et résultat d'un duel | non | non | **absent** |
| Mentions dans les salons | non | non | **absent** |
| Événements du refuge | non | non | **absent** (un événement interne `RefugeRevealed` existe, sans notification) |
| Élections et résultats | non | non | **absent** |
| Avertissement ou sanction de modération | non | non | **absent** |
| Sécurité du compte (connexion, changement d'e-mail ou de mot de passe) | non | non | **absent** |

### 1.3 Anomalies

| Réf. | Gravité | Anomalie | Conséquence | Correction proposée | OTA / build |
|---|---|---|---|---|---|
| NOT-1 | P1 | Jeton push non supprimé à la déconnexion | Sur un téléphone partagé ou après changement de compte, les notifications de l'ancien compte continuent d'arriver | Route de désenregistrement du jeton de l'appareil, appelée à la déconnexion | backend, puis OTA |
| NOT-2 | P1 | `expo-notifications` incompatible avec le SDK 54, droits iOS absents | Push non fiables, surtout sur iOS | Version 0.32.x, plugin dans `app.json`, droits iOS | **build natif** |
| NOT-3 | P1 | 10 événements de votre liste sans aucune notification | Voir tableau | Ajouter les types un par un (migration d'énumération à chaque lot) | backend + OTA |
| NOT-4 | P2 | Aucune limite de fréquence ni regroupement | Un salon actif ou une série d'offrandes peut produire une rafale | Regrouper par type et par fenêtre de quelques minutes | backend |
| NOT-5 | P2 | Réponse à une bouteille : push sans notification interne | Rien dans la cloche si le push est manqué | Créer la notification interne en même temps | backend |
| NOT-6 | P2 | L'envoi push est lancé sans attente ni reprise | Un échec réseau perd la notification, sans trace | Journaliser l'échec, reprise simple | backend |

### 1.4 Décisions nécessaires avant de développer NOT-3

Je n'ai créé aucun nouveau déclencheur. Pour chaque événement manquant, il faut décider : catégorie
de préférence, texte affiché, et pour les mentions de salon et le refuge, quels événements exacts
méritent une notification. Les notifications de sécurité du compte ne doivent pas pouvoir être
désactivées par l'utilisateur (proposition).

---

## 2. Économie

### 2.1 Conformité des règles validées

| Règle validée | Code | Verdict |
|---|---|---|
| Connexion quotidienne +20 | `DAILY_BONUS_FREE = 20`, `DAILY_BONUS_PREMIUM = 20`, une fois par jour UTC | **conforme** |
| Publicité récompensée +10, 5 par jour | absent sur `main` ; développé dans la PR #194 | **préparé** |
| Publicité quotidienne non récompensée | absent | voir `docs/publicites.md` § 4 |
| Refuge : +50 assiduité **ou** +100 score parfait | `refuge.utils.ts:14-17` : **+10** (2/2), **+5** (1/2), **+5** de participation, **−5** de pénalité d'absence, **par jour** | **ÉCART** |
| Vote : +5 par vote valide, **5 votes maximum par élection** | `weekly-profile.service.ts:6-8` : +5 par vote, limite de **10 votes par jour** (gratuit) et **20 par jour** (Plus) | **ÉCART** |
| Gagnants des élections +50 | aucun crédit aux gagnants dans le code | **ABSENT** |
| Boisson 5, nourriture 10, magie 20 | `economyCatalog.ts` | **conforme** |
| Chocolats 60, fleurs 80, rose éternelle 120, vin 180, passeport et billets 300 | `economyCatalog.ts` | **conforme** |
| Packs 100 / 0,99 €, 500 / 2,99 €, 1 000 / 4,99 € | `paidProducts.ts` | **conforme** (catalogue serveur ; achat non branché) |
| Plus 5,99 € par mois, 500 pièces mensuelles | prix et quantité au catalogue ; **aucun crédit mensuel**, `subscribe` répond 403 | **PARTIEL** |
| Les pièces n'expirent pas | aucun mécanisme d'expiration | **conforme** |
| Une résiliation ne supprime pas les pièces | `premium.service.ts` `cancel` ne touche pas au portefeuille | **conforme** |

### 2.2 Écarts à arbitrer (je n'ai rien modifié)

| Réf. | Gravité | Écart | Conséquence pour les utilisateurs |
|---|---|---|---|
| ECO-1 | P0 | Refuge : barème du code (10 / 5 / 5 / −5 par jour) différent du barème validé (50 ou 100) ; la pénalité de −5 ne figure pas dans vos règles | Les gains actuels sont 5 à 10 fois inférieurs à la règle ; des joueurs perdent des pièces sans règle écrite. **À préciser : 50/100 par jour, par semaine ou par session ?** |
| ECO-2 | P0 | Votes : jusqu'à 50 pièces par jour (gratuit) ou 100 (Plus) au lieu de 25 par élection | Source de pièces 2 à 4 fois supérieure à la règle, **chaque jour** |
| ECO-3 | P1 | Gagnants des élections : +50 jamais versé | Récompense annoncée non distribuée |
| ECO-4 | P1 | Plus : 500 pièces mensuelles non versées, renouvellements non gérés | Sans objet tant que l'abonnement n'est pas vendu |

### 2.3 Intégrité du portefeuille

| Contrôle | Résultat | Preuve |
|---|---|---|
| Double réclamation du bonus quotidien | **anomalie corrigée dans la PR #192** (5 acceptées sur 8 avant, 1 après) | `daily-bonus-concurrency.test.ts` |
| Offrandes et magies concurrentes | verrou du portefeuille, pas de découvert | `economy-wallet-integrity.test.ts` |
| Jeu de cartes concurrent | un seul débit, un seul gain | `card-game-wallet-concurrency.test.ts` |
| Vote d'élection en double | garde atomique sur le duel (`usedAt`) | lecture du code ; les tests unitaires correspondants sont en échec pour cause de mock obsolète |
| Solde négatif | impossible sur offrandes, magies, cartes ; pénalité du refuge bornée à zéro (commentaire du code) | lecture |
| Prix envoyé par l'application | ignoré : le serveur applique son catalogue | `economyCatalog.ts`, test dédié |
| Historique | chaque mouvement écrit une ligne avec le solde résultant | `CoinTransaction` |

### 2.4 Achats intégrés

| Élément | État |
|---|---|
| Catalogue serveur des produits | en place |
| Registre des reçus, unicité de la transaction, livraison unique | en place et testé (`payment-*.test.ts`), **sans route HTTP** |
| Vérification Apple / Google | **absente** |
| Bibliothèque d'achat dans l'application | **absente** |
| Abonnement : souscription, renouvellement, expiration, restauration | **absent** |
| Remboursements et rétrofacturations | **absent** (aucun traitement des notifications des stores) |
| Résiliation | `cancel` retire Plus **immédiatement**. Sur les stores, un abonnement résilié reste dû jusqu'à la fin de la période payée : **à corriger avant la vente** |

Tout ceci exige un build natif et des comptes marchands configurés.

### 2.5 Jeu de cartes

Présent (entrée 20 pièces). Conformément à votre consigne, je ne l'ai ni modifié ni remplacé.
`GAME_WIN` reste une source de pièces active tant qu'il n'est pas retiré.

---

## 3. Règles métier

| Domaine | Règle attendue | Implémenté | Tests | Anomalie | Proposition | Conséquence |
|---|---|---|---|---|---|---|
| Inscription | majeur, CGU et règlement acceptés | 18 ans vérifiés côté serveur, deux acceptations obligatoires | — | l'âge est déclaratif | vérification d'âge : décision | — |
| Smile / Grimace | Smile mutuel → match | en place | `mutual-smile-flow` | — | — | — |
| Trois questions | — | 3 questions par profil ; **1 bonne réponse sur 3 suffit** ; si l'un des deux a 0/3, le match est rompu | `questions-validation` | seuil **non confirmé** | confirmer le seuil | un 0/3 rompt le match sans recours |
| Matchs gratuits / Plus | — | 5 / **10** | `policies` | la mission ne donne pas le chiffre Plus | confirmer 10 | — |
| Lettres | alternance stricte | en place ; 3 000 caractères ; 20 lettres par heure | `letter-alternation` | — | — | — |
| Photos | déblocage progressif | gratuit : 10 lettres au total ; Plus : **immédiat, même sans match** | `photosAccess` | (a) photo encore visible après rupture ; (b) Plus voit toute photo | décisions déjà demandées | vie privée |
| Ajout de photo | — | **impossible sur iOS et Android** | — | P1 | build natif | le déblocage des photos n'a pas d'objet sur mobile |
| Classement par participation | les profils actifs remontent | tri sur `discoveryActivityScore`… **qui n'est jamais augmenté** : le seul code qui l'écrit le diminue de 40 | — | **P1 : le classement par participation n'existe pas** ; seul le malus existe | définir ce qui fait gagner des points | tous les profils restent à 0, les pénalisés passent derrière **définitivement** |
| Pénalité de rupture immédiate | selon conditions validées | rupture dans les 5 minutes suivant l'activation et sans aucune lettre : −40 | — | conditions **non confirmées** ; le commentaire du code promet qu'une vraie conversation rétablit le rang, aucun code ne le fait | confirmer, et ajouter le rétablissement | pénalité de fait permanente |
| Anti-ghosting | 5 jours sans réponse, relance sous 7 jours | calculé à la lecture ; l'état `GHOSTED` n'est jamais enregistré | `policies` | pas de notification « relance autorisée » | — | — |
| Mode vacances | — | bloque l'envoi de bouteille et les nouvelles correspondances | — | effet sur la découverte et l'anti-ghosting non vérifié | à tester sur appareil | — |
| Salons | renouvellement hebdomadaire | session de 7 jours | `salonSessions.e2e` | **dépend de `ENABLE_SCHEDULER=true`** (inconnu) | confirmer la variable | sans elle, les sessions n'expirent pas |
| Bouteilles | anonymes, dévoilement mutuel | 1 bouteille en mer (gratuit), 5 (Plus) ; anonymat testé | `bottles-*` (7 fichiers) | — | — | — |
| Sujets interdits | — | **aucun filtre de contenu** dans le code | — | P1 | liste de sujets à fournir | la règle n'est appliquée que par signalement |
| Duels | délais | expiration à 48 h | — | dépend du planificateur | — | — |
| Refuge | — | voir ECO-1 | `refuge.*` | écart de barème | — | — |
| Élections | — | voir ECO-2, ECO-3 | en échec (mocks) | écarts | — | — |
| Offrandes et magies | prix validés | conformes ; pas d'auto-offrande en production | `offerings.*`, `magies.*` | exception en mode test si `NODE_ENV` ≠ `production` | confirmer `NODE_ENV` | — |
| Blocage | — | coupe lettres et photos | `matches.security` | — | — | — |
| Signalement | — | 5 par heure ; traitement ADMIN/MODERATOR | `reports.*` | — | — | — |
| Sanctions | progressives | avertissement, suspension à durée, bannissement | `moderation` | l'utilisateur n'est pas notifié ; pas de contestation | voir § 4 | — |

---

## 4. Règlement communautaire et modération

### 4.1 Mécanismes techniques existants

| Mécanisme | État |
|---|---|
| Acceptation des CGU et du règlement à l'inscription, horodatée | en place |
| Écran « Règles de la communauté » | en place (`GameRulesScreen`) |
| Signalement d'un utilisateur, liste de ses signalements | en place |
| Blocage, liste des bloqués | en place |
| Avertissement, suspension temporaire, bannissement | en place, tracés au journal d'audit |
| Masquage d'une photo par la modération | en place (`moderationStatus`) |
| Tickets de support avec réponses | en place |
| Suppression et désactivation du compte, export des données | en place |

### 4.2 Manques

| Réf. | Gravité | Manque | Exigence |
|---|---|---|---|
| MOD-1 | P1 | Aucun filtrage automatique des contenus (lettres, salons, bouteilles, profils) | Apple (contenus d'utilisateurs) : une méthode de filtrage est attendue |
| MOD-2 | P1 | Signalement d'un **contenu** précis (message de salon, lettre, bouteille) à vérifier ; le signalement vise un utilisateur | Apple, Google, DSA (notification d'un contenu) |
| MOD-3 | P1 | La personne sanctionnée ne reçoit ni motif ni voie de contestation | DSA art. 17 (motivation) ; bonne pratique des stores |
| MOD-4 | P1 | Aucun point de contact publié (adresse à compléter) | DSA art. 11-12, Apple, Google |
| MOD-5 | P1 | Aucune procédure écrite pour les contenus d'exploitation de mineurs | Google Play : normes de sécurité des enfants, obligatoires pour les applications de rencontre |
| MOD-6 | P2 | Aucun délai de traitement des signalements défini | à fixer dans la politique |
| MOD-7 | P2 | Un MODERATOR peut créer un match entre deux comptes | à justifier ou retirer |

Textes proposés : `docs/legal/reglement-communautaire.md` et `docs/legal/politique-moderation.md`.
Ils ne sont pas publiés dans l'application.

---

## 5. Réglages et gestion du compte

| Entrée | Opérationnelle ? | Remarque |
|---|---|---|
| Modifier le profil, avatar, questions | oui | — |
| Mes photos | **non sur mobile** | « Bientôt disponible » |
| E-mail | oui | sans vérification de la nouvelle adresse |
| Mot de passe | oui | pas de « mot de passe oublié » |
| Vérification du profil | **non** | écran « Bientôt disponible » |
| Notifications | oui | 6 interrupteurs enregistrés côté serveur |
| Confidentialité | oui | — |
| Préférences de rencontre | **partiel** | l'écran indique que l'âge et la ville ne sont pas enregistrés |
| Localisation | oui | — |
| Sons | **non** | écran « Effets sonores à venir » |
| Utilisateurs bloqués | oui | — |
| Mes signalements | oui | — |
| Mode vacances | oui | — |
| Abonnement Plus | **non** | « Souscription bientôt disponible » |
| Boutique de pièces | **non** | « Les paiements ne sont pas encore activés » |
| Historique des pièces | oui | — |
| Mes données personnelles (export) | oui | — |
| Support, signaler un bug | oui | — |
| Déconnexion | oui | jeton push non retiré (NOT-1) |
| Désactivation, suppression du compte | oui | mot de passe exigé ; suppression confirmée par le mot « SUPPRIMER » |
| Version, build, OTA, canal | oui | bas de l'écran Réglages |
| Attentions personnelles | à vérifier | affiche « arrivent bientôt » si le catalogue est vide |

Avant soumission aux stores, toute entrée menant à un écran « bientôt disponible » devrait être
masquée ou terminée : Apple refuse régulièrement les fonctions annoncées mais inactives.

Deux écrans ne sont plus utilisés par aucune route (`AccountLifecycleUnavailableScreen`,
`SupportUnavailableScreen`) : code mort.

---

## 6. Changements exigeant un build natif (récapitulatif)

Photos depuis le mobile · notifications push fiables · achats intégrés · publicités et consentement
· stockage sécurisé des jetons. À regrouper dans **un seul** build, avec une nouvelle
`runtimeVersion`.

## 7. Décisions qui vous reviennent

1. ECO-1 : barème du refuge (50/100 : par jour, par semaine, par session ?) et sort de la pénalité de −5.
2. ECO-2 : plafond de votes (5 par élection, ou 10/20 par jour ?).
3. ECO-3 : versement des +50 aux gagnants — à quel moment, par quelle tâche.
4. Seuil des trois questions (1 bonne réponse sur 3) et rupture automatique à 0/3.
5. Conditions de la pénalité de rupture immédiate (5 minutes, aucune lettre, −40) et rétablissement du rang.
6. Ce qui doit faire monter un profil dans le classement.
7. Liste des sujets interdits et choix d'un filtrage automatique.
8. Textes et catégories des notifications manquantes.
9. Photo visible après rupture ; photo visible par tout abonné Plus sans match.
