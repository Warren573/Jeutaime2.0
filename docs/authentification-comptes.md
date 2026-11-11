# Authentification et gestion des comptes

Branche : `claude/auth-account-security`. Rien n'est fusionné, déployé ni publié.
**Aucun e-mail réel n'a été envoyé, aucun fournisseur n'est activé, aucun compte réel n'a été touché.**
Tous les essais ont utilisé une base PostgreSQL locale et une boîte d'envoi simulée.

## 1. Ce qui est livré

| N° | Demande | État | Preuve |
|---|---|---|---|
| 1 | Mot de passe oublié : lien unique, expiration, limitation, révocation des sessions | **développé et testé** | `account-security.test.ts` |
| 2 | Vérification de l'adresse à l'inscription | **développé et testé** (non bloquant, voir § 5) | idem |
| 3 | Changement d'e-mail confirmé par la nouvelle adresse | **développé et testé** | idem |
| 4 | Alerte à l'ancienne adresse, sans la nouvelle | **développé et testé** | idem |
| 5 | Protection contre les tentatives répétées | **développé et testé** | idem |
| 6 | Déconnexion de tous les appareils, retrait des jetons push | **développé et testé** | idem |
| 7 | Historique des connexions, sessions actives | **développé et testé** | idem + parcours HTTP |
| 8 | TOTP pour OWNER et ADMIN, codes de secours — **obligatoire après 14 jours** (§ 5 bis) | **développé et testé** | `totp.test.ts` (vecteurs RFC 6238), `two-factor-enforcement.test.ts` |
| 9 | Alertes de sécurité | **développé et testé** | idem |
| 10 | Désactivation, suppression, export | **vérifié, 2 défauts corrigés** (§ 7) ; l'historique des connexions est ajouté à l'export | idem |

### Tests exécutés (PostgreSQL 16 local, boîte e-mail simulée)

| Fichier | Résultat |
|---|---|
| `tests/unit/totp.test.ts` | 10/10 |
| `tests/unit/twoFactorEnforcement.test.ts` (règle pure : rôles, dates, 14 jours) | 12/12 |
| `tests/unit/twoFactorReminder.test.ts` (seuils de rappel) | 6/6 |
| `tests/integration/account-security.test.ts` | 21/21 |
| `tests/integration/account-security-http.test.ts` | 5/5 |
| `tests/integration/two-factor-enforcement.test.ts` (chaque rôle, délais, sessions existantes, contournements, récupération, vérification renforcée, export) | 26/26 |
| `tests/integration/two-factor-reminder.test.ts` (rappels avant échéance) | 9/9 |
| `tests/integration/two-factor-roles-regression.test.ts` (non-régression USER et MODERATOR) | 12/12 |
| Suite backend complète | **830 réussis**, 20 échoués, 25 ignorés. Les 20 échecs sont les 19 d'origine (mocks obsolètes, PR #192) plus `notifications.policy.test.ts` (déjà échouant sur `main`, corrigé dans la PR #198). Aucun échec nouveau |
| Contrôle des tests par mutation | contrôle d'accès neutralisé : 8 échecs ; interdiction de désactiver retirée : 1 échec ; verrou anti-doublon des rappels retiré : 1 échec ; rôles USER/MODERATOR traités comme ADMIN : 3 échecs. Code restauré : tout passe |
| Typecheck backend et frontend ; lint de `src` | OK ; 243 problèmes, identique à avant ce travail |
| Interface web pilotée (iPhone 13, Pixel 7) contre l'API locale | voir § 5 bis et § 6 |

**Non testé** : tout sur iPhone et Galaxy physiques, et tout envoi réel d'e-mail.

## 2. Architecture d'envoi d'e-mails pour `jeutaime.app`

### Ce qui est en place
Une interface unique (`backend/src/modules/mail/mailer.ts`) avec deux transports :

| `EMAIL_TRANSPORT` | Effet |
|---|---|
| `disabled` (**défaut**) | rien n'est envoyé ; seule la nature du message est journalisée |
| `memory` | boîte simulée, pour les tests et le développement |

Aucun transport de fournisseur réel n'existe encore : il sera ajouté (une trentaine de lignes, un appel HTTPS)
**après** votre choix de fournisseur. Les corps de message et les liens ne sont jamais journalisés.

### Recommandation
Je recommande un fournisseur **hébergé dans l'Union européenne**, pour simplifier la politique de confidentialité
(pas de transfert hors UE à déclarer pour les adresses e-mail). À comparer, sur des critères que je n'ai pas pu
vérifier d'ici (tarifs, offres gratuites, localisation des serveurs, conditions) :

| Critère | Pourquoi |
|---|---|
| Serveurs et sous-traitance dans l'UE, accord de traitement des données (DPA) | RGPD |
| Signature DKIM, SPF, DMARC pris en charge | délivrabilité des messages de sécurité |
| API d'envoi simple et retour des rebonds | un lien envoyé à une adresse invalide doit se voir |
| Séparation des messages transactionnels et marketing | JeuTaime n'envoie **que** du transactionnel |

Je n'ai activé ni créé aucun compte.

### Configuration du domaine (à faire après le choix du fournisseur)
1. Utiliser un sous-domaine d'envoi dédié (par exemple `mail.jeutaime.app`), pour protéger la réputation du domaine principal.
2. Enregistrements DNS fournis par le prestataire : SPF, DKIM (2 ou 3 entrées), puis DMARC en commençant par `p=none`, à durcir ensuite.
3. Expéditeur : `JeuTaime <ne-pas-repondre@mail.jeutaime.app>` ; adresse de réponse : le support.
4. Une adresse de contact lisible (`support@…`) : les messages de sécurité y renvoient.

## 3. Liens reçus par e-mail

Les liens ont la forme `https://jeutaime.app/reset-password?token=…`, `/verify-email?token=…`,
`/confirm-email-change?token=…`.

- **Ils fonctionnent dès maintenant dans un navigateur**, puisque l'application web possède ces trois écrans.
  À condition que `jeutaime.app` serve bien l'application web (déploiement Vercel : **à confirmer**).
- Pour qu'un lien ouvre directement l'application mobile, il faut des liens universels (iOS) et des liens
  d'application (Android) : fichiers `apple-app-site-association` et `assetlinks.json` sur le domaine, et
  déclaration dans les projets natifs. **Nécessite un nouveau build natif.** Sans cela, le lien s'ouvre dans le
  navigateur du téléphone, ce qui reste fonctionnel pour réinitialiser un mot de passe.

## 4. Configurations nécessaires

| Variable | Rôle | Valeur par défaut |
|---|---|---|
| `EMAIL_TRANSPORT` | transport d'envoi | `disabled` |
| `EMAIL_FROM` | expéditeur | `JeuTaime <ne-pas-repondre@jeutaime.app>` |
| `APP_PUBLIC_URL` | base des liens envoyés | `https://jeutaime.app` |
| `TWO_FACTOR_ENCRYPTION_KEY` | chiffrement des secrets de double authentification, 32 caractères minimum | absente : la double authentification est **indisponible et l'obligation n'est pas appliquée** |
| `TWO_FACTOR_ENFORCEMENT_START` | **date d'activation de l'obligation**, au format `2026-12-01T00:00:00Z` | absente : **rien n'est bloqué** |
| `ENABLE_SCHEDULER` | active les tâches planifiées, **dont le rappel avant échéance** | `false` |
| `LOGIN_LOCK_MAX_FAILURES` | échecs avant verrouillage | 10 |
| `LOGIN_LOCK_WINDOW_MINUTES` | durée du verrouillage et fenêtre de comptage | 15 |

**Migration** `20261110120000_account_security` : additive (3 colonnes sur `User`, 3 sur `RefreshToken`,
2 tables, 1 type, 1 valeur d'énumération). Aucune donnée existante n'est modifiée. Elle est ajoutée à la CI d'intégration.

**À connaître avant de définir `TWO_FACTOR_ENCRYPTION_KEY`** : la conserver dans un gestionnaire de secrets.
**Si elle est perdue ou changée après des activations, tous les secrets deviennent illisibles** et les comptes
concernés ne peuvent plus se connecter (reprise manuelle en base).

## 5. Comportements à connaître

### Tant qu'aucun fournisseur d'e-mails n'est branché (état par défaut)
- « Mot de passe oublié ? » est **masqué** dans l'application (elle interroge `GET /api/auth/capabilities`),
  pour ne pas promettre un e-mail qui ne partira pas. Vérifié dans l'interface.
- Le changement d'adresse reste **immédiat**, comme avant, pour ne bloquer personne.
- Aucun lien de vérification n'est créé à l'inscription.
- **Il n'existe donc toujours aucun moyen de récupérer un mot de passe perdu.** Le chantier ne protège pleinement
  qu'une fois un fournisseur activé.

### Une fois un fournisseur activé
- La vérification de l'adresse n'est **pas obligatoire** pour se connecter ni pour utiliser JeuTaime : elle est
  enregistrée (`emailVerifiedAt`) et visible dans « Sécurité et appareils ». Les comptes existants restent non
  vérifiés jusqu'à ce que leur titulaire ouvre un lien, ou réinitialise son mot de passe (ce qui prouve la possession
  de la boîte). **Décision produit** : faut-il restreindre certaines fonctions tant que l'adresse n'est pas confirmée ?
- Changement d'adresse : l'adresse ne change qu'à l'ouverture du lien envoyé à la **nouvelle** adresse (valable 1 heure).
  À ce moment l'**ancienne** adresse reçoit une alerte qui ne mentionne pas la nouvelle, et tous les appareils sont déconnectés.

## 5 bis. Double authentification obligatoire pour OWNER et ADMIN

Décision validée : obligatoire pour OWNER et ADMIN ; jamais pour les utilisateurs classiques ni les MODERATOR.

### Règles appliquées

| Compte | Comportement | Vérifié par |
|---|---|---|
| USER, MODERATOR | jamais obligatoire ; aucune restriction ; ne peuvent pas activer la 2FA (réservée aux comptes d'administration) | tests : rôles, 60 jours après l'activation |
| OWNER et ADMIN **existants** | **14 jours à compter de la date d'activation**, puis administration bloquée tant que la 2FA n'est pas configurée | tests : 13,99 jours → accès, 14,01 jours → bloqué |
| **Nouvel ADMIN** (promu par l'OWNER) | **aucun délai** : l'administration lui est fermée jusqu'à la configuration. Un ADMIN rétrogradé puis re-promu redevient « nouveau » | tests : promotion par l'API, re-promotion |
| Après le délai | **seules les routes réservées au personnel sont fermées** (403 « double authentification requise »). Profil, lettres, portefeuille, réglages et configuration de la 2FA restent accessibles | test : routes testées une à une |
| Une 2FA active | n'est **jamais désactivée automatiquement** : ni par l'échéance, ni par une réinitialisation de mot de passe, ni par un changement de rôle. Une désactivation voulue est **refusée** dès l'entrée en vigueur de l'obligation (changement d'appareil permis) | tests dédiés + mutation |

« Existant » signifie : compte ADMIN ou OWNER dont la colonne `privilegedRoleSince` est vide, c'est-à-dire créé avant cette version. Cette colonne est renseignée à chaque promotion en ADMIN faite après le déploiement.

### Sessions existantes et contournements testés
- **Une session ouverte avant l'échéance est bloquée dès l'échéance**, sans se reconnecter, et le renouvellement du jeton ne contourne rien : le contrôle lit la base à chaque requête.
- Un code TOTP ne sert **qu'une fois**, y compris présenté 5 fois en parallèle (un seul accepté) ; un code de secours aussi (6 présentations simultanées, une seule connexion).
- La demande de réinitialisation par l'OWNER avec le code TOTP qui vient de servir à se connecter est refusée.
- Un ADMIN ne peut pas appeler la route de réinitialisation, ni un OWNER sans 2FA, ni sur un OWNER, ni sur soi-même, ni avec un mauvais mot de passe, un champ inconnu ou un motif trop court.
- Sans `TWO_FACTOR_ENCRYPTION_KEY`, l'obligation **n'est pas appliquée** : exiger une 2FA impossible à configurer verrouillerait l'administration (défaut trouvé et corrigé pendant ce travail).
- Les routes sensibles de la 2FA sont limitées à 5 tentatives par minute et par adresse IP.

### Codes de secours et récupération (aucune désactivation automatique)

| Situation | Solution | Nature |
|---|---|---|
| Téléphone disponible | code à 6 chiffres | — |
| Changement de téléphone | Réglages → Sécurité et appareils → « Changer d'appareil » : mot de passe + code actuel ; l'ancien appareil reste valable jusqu'à la confirmation du nouveau, puis 10 nouveaux codes de secours remplacent les anciens | dans l'application |
| Téléphone perdu, **codes de secours disponibles** | se connecter avec un code de secours (usage unique), puis « Changer d'appareil » | dans l'application |
| Codes de secours presque épuisés | « Nouveaux codes de secours » : les anciens cessent immédiatement | dans l'application |
| **Un ADMIN a tout perdu** | l'OWNER réinitialise sa 2FA depuis l'application (Administration → Propriétaire), ou par `POST /api/admin/users/:id/two-factor/reset` : mot de passe, code de sa propre 2FA, adresse du compte retapée, motif ; trace d'audit, sessions fermées, alerte à l'ADMIN. Voir « Réinitialiser la 2FA d'un ADMIN » | action humaine, dans l'application |
| **L'OWNER a tout perdu** | aucun recours dans l'application. Le détenteur de l'accès à la base exécute `scripts/reset-two-factor.ts` en deux temps : aperçu (aucune modification, affiche un code de confirmation propre au compte), puis exécution avec ce code. Efface la 2FA, ferme les sessions, laisse une ligne d'audit sans auteur applicatif, alerte le compte | action humaine hors application |
| Levier d'urgence | retirer `TWO_FACTOR_ENFORCEMENT_START` (ou `TWO_FACTOR_ENCRYPTION_KEY`) lève tout blocage ; ne touche à aucune 2FA existante | configuration |

**Conseil** : conserver les codes de secours hors du téléphone (gestionnaire de mots de passe ou papier).

### Rappel de sécurité avant l'échéance

Un rappel est envoyé aux OWNER et ADMIN **qui n'ont pas encore configuré la 2FA**, à **7 jours, 3 jours puis 1 jour** de l'échéance.

| Point | Règle (testée) |
|---|---|
| Destinataires | OWNER et ADMIN dans leur délai de transition, sans 2FA, non suspendus. **Jamais** USER ni MODERATOR, ni un compte déjà protégé, ni un nouvel ADMIN (déjà bloqué) |
| Fréquence | un rappel par seuil et par compte, au plus ; jamais deux à la fois : si le serveur est en retard, seul le plus urgent est envoyé, jamais un moins urgent après un plus urgent |
| Exécutions simultanées | un verrou par compte : 8 exécutions en parallèle produisent un seul rappel |
| Arrêt | dès que la 2FA est configurée, ou après l'échéance |
| Date repoussée | un nouveau cycle de rappels commence |
| Canaux | notification dans l'application (cloche, icône de sécurité, ouvre l'écran Sécurité) ; notification push au texte **générique** (« Une action de sécurité t'attend sur ton compte », sans détail sur l'écran verrouillé) ; e-mail (simulé tant qu'aucun fournisseur n'est branché) |
| Préférences | le push respecte l'interrupteur général de notifications de l'utilisateur ; la notification interne est toujours créée |

**Prérequis** : le rappel est une tâche planifiée (`sendTwoFactorReminders`). **Elle ne tourne que si `ENABLE_SCHEDULER=true`** sur le serveur, ce qui n'est pas le cas par défaut. Sans cela, aucun rappel n'est envoyé (le décompte reste visible dans Réglages → Sécurité et appareils). À confirmer sur votre service (question INF-5).

### Réinitialiser la 2FA d'un ADMIN (interface OWNER)

Application : **Administration → onglet « Propriétaire » → Administrateurs actuels**. Chaque ADMIN indique « Double authentification : active / non configurée ». Si elle est active, le bouton « Réinitialiser la double authentification » ouvre un panneau.

Vérification renforcée, toutes exigées **par le serveur** (l'interface n'est qu'un confort) :

| Exigence | Détail |
|---|---|
| Rôle | OWNER uniquement (USER, MODERATOR et ADMIN reçoivent 403) |
| L'OWNER est lui-même protégé | il doit avoir activé sa propre 2FA |
| Mot de passe de l'OWNER | vérifié sans consommer de code |
| Adresse du compte visé retapée | comparée côté serveur (la casse est ignorée) ; une faute de frappe est refusée **avant** de consommer le code de l'OWNER |
| Code de l'OWNER | code TOTP ou code de secours, à usage unique |
| Motif | 3 caractères minimum, inscrit au journal |
| Dernière confirmation | boîte de dialogue avant l'envoi |
| Limite | 5 tentatives par minute et par adresse IP |

Conséquences : 2FA et codes de secours du compte effacés, toutes ses sessions fermées, alerte envoyée à l'ADMIN, **ligne dans le journal d'audit** (auteur, cible, motif, nombre de sessions fermées ; jamais de mot de passe, de code ni de secret). Le rôle ne change pas. Si le délai est dépassé, l'ADMIN reste bloqué pour l'administration jusqu'à ce qu'il reconfigure sa 2FA ; il peut se connecter et le faire immédiatement. La liste des comptes n'expose qu'un booléen « 2FA active », jamais le secret.

Ne s'applique pas à un OWNER (aucun recours dans l'application : script de dernier recours, ci-dessus) ni à soi-même.

### Aucune régression pour USER et MODERATOR
- **Tests** : 12 tests dédiés, obligation active depuis 60 jours. USER et MODERATOR se connectent (un code superflu est ignoré), gardent session, portefeuille, profil, changement de mot de passe, déconnexion générale, export, désactivation et suppression ; ne reçoivent ni rappel ni e-mail ; ne peuvent ni configurer la 2FA ni utiliser la réinitialisation ; un MODERATOR garde ses routes de modération et reste exclu de l'administration avec le refus habituel de rôle. Un ADMIN bloqué puis rétrogradé en MODERATOR retrouve ses fonctions de modération, sans que sa 2FA soit touchée.
- **Interface** : un USER et un MODERATOR de test se connectent normalement ; leur écran Sécurité ne montre ni carte « Double authentification » ni bandeau ; aucune boîte de dialogue inattendue ; le MODERATOR ouvre l'écran « Modération » sans redirection ; aucun rappel dans leurs notifications.

### Mise en service (chaque étape exige votre accord)
1. Déployer le serveur avec la migration. **Tant que `TWO_FACTOR_ENFORCEMENT_START` est absente, rien n'est bloqué.**
2. Définir `TWO_FACTOR_ENCRYPTION_KEY` (gestionnaire de secrets, sauvegarde indispensable).
3. Publier l'OTA contenant les écrans. Le serveur doit être déployé avant.
4. **Avant de fixer la date**, configurer la 2FA sur votre compte OWNER et sur chaque ADMIN, et noter les codes de secours.
5. Définir `TWO_FACTOR_ENFORCEMENT_START` : le délai de 14 jours part de cette date. L'application affiche alors « Il te reste N jours » dans Réglages → Sécurité et appareils.
6. Repousser la date retarde l'échéance ; la retirer lève le blocage.

### Vérifié dans l'interface web (Playwright, API locale, compte ADMIN de test sans 2FA)
- Obligation active depuis 20 jours : l'ouverture de l'administration affiche « Double authentification requise » puis redirige vers l'écran Sécurité, qui montre le bandeau « Action requise ».
- Après configuration : bandeau disparu, **bouton « Désactiver » absent**, « Changer d'appareil » et « Nouveaux codes de secours » présents, administration de nouveau accessible.
- Changement d'appareil : nouvelle clé différente, 10 nouveaux codes de secours, aucun ancien code repris.
- Obligation active depuis 5 jours : « Il te reste 9 jours pour la configurer (jusqu'au 19/11/2026) » et administration accessible.
- **Rappel** : un ADMIN sans 2FA voit « La double authentification devient obligatoire pour ton rôle dans 6 jours » dans sa cloche ; le toucher ouvre l'écran Sécurité (« Il te reste 6 jours ») ; l'administration reste accessible.
- **Réinitialisation par l'OWNER** : la liste montre « active » / « non configurée » ; le bouton n'apparaît que pour l'ADMIN protégé ; une adresse erronée est signalée et le bouton reste inactif ; la dernière confirmation s'affiche ; après succès, la liste passe à « non configurée ». Contrôle en base : 2FA effacée, 0 session active, 0 code de secours, ligne d'audit avec l'OWNER comme auteur, alerte envoyée à l'ADMIN, rôle et 2FA de l'OWNER intacts.
- Non vérifié : iPhone 16e et Galaxy A16 réels.

## 6. Écrans iOS et Android

Code JavaScript uniquement : **livrable par OTA**, sans nouveau build, à condition que le serveur soit déployé avant.

| Écran | Accès |
|---|---|
| Mot de passe oublié | Connexion → « Mot de passe oublié ? » (visible seulement si l'envoi d'e-mails est actif) |
| Nouveau mot de passe | lien reçu par e-mail |
| Confirmer mon adresse, Nouvelle adresse e-mail | lien reçu par e-mail |
| **Sécurité et appareils** | Réglages → Compte → Sécurité et appareils : adresse confirmée ou non, appareils connectés (déconnexion individuelle ou générale), double authentification, 20 dernières connexions |
| Étape « Code de vérification » | apparaît à la connexion si le compte a la double authentification |
| Rappel avant échéance | notification dans la cloche (icône de sécurité) et push générique ; le toucher ouvre l'écran Sécurité |
| Bandeau d'obligation et décompte | écran Sécurité : « Action requise » (bloqué) ou « Il te reste N jours » |
| Changer d'appareil, nouveaux codes de secours | écran Sécurité, quand la 2FA est active |
| **Réinitialiser la 2FA d'un ADMIN** | OWNER : Administration → Propriétaire → Administrateurs actuels |
| Changement d'e-mail | l'écran existant gère désormais le cas « confirmation en attente » |

La déconnexion retire aussi le jeton de notification de l'appareil (jusqu'ici il restait enregistré).

**Vérifié dans l'interface web (Playwright, API locale)** : lien de connexion, message générique, lien invalide,
lien sans jeton, accès refusé sans session, écran Sécurité, activation de la double authentification, affichage de 10 codes
de secours, déconnexion de tous les appareils, champ de code à la connexion, connexion avec un code de secours.

**Non vérifié** : clavier, zones de sécurité, saisie semi-automatique des codes et boîtes de dialogue natives sur
iPhone 16e et Galaxy A16. Procédure manuelle au § 9.

### Messages d'erreur
Tous en français, sans détail technique : « Ce lien est invalide ou a expiré. Refais une demande. », « Trop de
tentatives de connexion. Réessaie dans 15 minutes ou réinitialise ton mot de passe. », « Code incorrect. Vérifie
l'heure de ton téléphone et réessaie. », « Trop de demandes. Réessaie dans une heure. ».

## 7. Désactivation, suppression, export — vérification et défauts corrigés

| Procédure | Constat | Statut |
|---|---|---|
| Désactivation | ferme les sessions et bloque l'accès immédiatement ; **les jetons push restaient enregistrés** : un compte désactivé recevait toujours des notifications (mesuré : 1 jeton avant, 0 après correctif) | **corrigé et testé** |
| Suppression | efface profil, photos, lettres, matchs, portefeuille, sessions, jetons push, liens et codes de secours (testé). **L'historique des connexions, qui contient l'adresse e-mail, n'était pas effacé** (2 lignes avant correctif, 0 après ; 7 lignes orphelines relevées dans la base de test) | **corrigé et testé** |
| Export des données | ne contient ni empreinte de mot de passe ni secret de double authentification (testé) | conforme |
| Export des données | contient désormais l'**historique des connexions et les appareils** (date, adresse IP, type d'appareil), dans une rubrique `security`, sans empreinte de jeton, de mot de passe ni de secret (testé) | **corrigé et testé** |

## 8. Protections et limites connues

| Menace | Protection | Limite |
|---|---|---|
| Force brute sur le mot de passe | verrouillage de l'adresse après 10 échecs en 15 minutes ; limite existante de 5 tentatives par minute et par IP | **un tiers peut verrouiller le compte d'autrui pendant 15 minutes** en saisissant 10 faux mots de passe. Compromis assumé : le verrou expire seul, et réinitialiser le mot de passe le lève. Valable aussi pour le compte OWNER |
| Lien volé ou rejoué | usage unique atomique (deux requêtes simultanées : une seule réussit), expiration, nouvelle demande = ancien lien invalide, seule l'empreinte est stockée | — |
| Inondation de demandes | 3 liens par heure et par compte et par type, plus la limite par IP | — |
| Savoir si une adresse a un compte | « mot de passe oublié » répond de façon identique dans tous les cas | le **temps de réponse** peut légèrement différer ; et l'**inscription** indique encore « Cet email est déjà utilisé » (comportement antérieur, non modifié) |
| Vol du mot de passe d'un ADMIN | double authentification TOTP **obligatoire** (§ 5 bis), codes de secours à usage unique, secret chiffré (AES-256-GCM), anti-rejeu des codes | pendant les 14 jours de transition, un ADMIN existant peut encore s'en passer |
| Perte du téléphone et des codes de secours | réinitialisation par l'OWNER (ADMIN, avec interface) ou par l'opérateur de la base (OWNER), § 5 bis | **jamais automatique** |
| Jeton d'accès après déconnexion | les jetons de rafraîchissement sont révoqués immédiatement | un jeton d'accès déjà émis reste valable au plus **15 minutes** |

## 9. Vérification manuelle sur appareils (après déploiement du serveur et publication de l'OTA)

À faire sur iPhone 16e et Galaxy A16, **avec des comptes de test uniquement**.

1. Connexion : le lien « Mot de passe oublié ? » est absent tant que l'envoi d'e-mails est désactivé, présent une fois activé.
2. Demande de réinitialisation avec une adresse de test : e-mail reçu en moins d'une minute ; le lien ouvre la page de réinitialisation ; après changement, l'ancien mot de passe est refusé et les autres appareils sont déconnectés.
3. Ouvrir le même lien une seconde fois : « lien invalide ou expiré ».
4. Réglages → E-mail : l'adresse actuelle reste valable tant que le lien n'est pas ouvert ; l'ancienne boîte reçoit l'alerte, sans la nouvelle adresse.
5. Réglages → Sécurité et appareils : le téléphone apparaît ; connexion depuis un second appareil, vérifier l'alerte « nouvel appareil » ; déconnexion individuelle puis générale.
6. Compte ADMIN de test : activer la double authentification avec une application d'authentification, noter les codes de secours, se reconnecter avec le code puis avec un code de secours (usage unique).
7. Clavier : les champs de code restent visibles au-dessus du clavier ; le code à 6 chiffres peut être proposé automatiquement par le téléphone.
8. Désactiver un compte de test : plus aucune notification reçue ; se reconnecter le réactive.
8 bis. **Rappel** : sur un ADMIN de test sans 2FA, avec `ENABLE_SCHEDULER=true` et une date d'obligation proche de l'échéance, la notification de rappel arrive (texte générique sur l'écran verrouillé) et ouvre l'écran Sécurité.
8 ter. **Réinitialisation** : en OWNER de test avec 2FA, ouvrir Administration → Propriétaire, réinitialiser la 2FA d'un ADMIN de test (mauvaise adresse refusée, dernière confirmation, succès) ; vérifier côté ADMIN : déconnecté, alerte reçue, administration bloquée si le délai est dépassé, reconfiguration possible.
8 quater. **USER et MODERATOR** de test : aucun bandeau ni rappel ; le MODERATOR garde ses fonctions de modération.
9. Supprimer un compte de test : plus de trace dans l'export d'un autre compte, et la reconnexion est impossible.

## 10. Reste à faire ou à décider

| Sujet | Nature |
|---|---|
| Choix et activation du fournisseur d'e-mails, DNS du domaine | **votre décision**, nécessaire pour que la récupération de compte existe |
| Confirmer que `jeutaime.app` sert l'application web | à vérifier |
| Date d'activation `TWO_FACTOR_ENFORCEMENT_START` et clé `TWO_FACTOR_ENCRYPTION_KEY` | **votre décision**, après avoir configuré votre propre 2FA (§ 5 bis) |
| `ENABLE_SCHEDULER=true` sur le serveur | nécessaire pour que le rappel avant échéance soit envoyé (INF-5) |
| Vérification de l'adresse obligatoire pour certaines fonctions | décision |
| Liens ouvrant l'application mobile (liens universels) | **build natif** |
| Notification de sécurité pour une connexion depuis un pays inhabituel | non développé (service tiers de géolocalisation et traitement à déclarer) |
| Opération sur votre compte OWNER | **aucune effectuée** ; procédure dans `docs/securite-compte-owner.md` (PR #193) |

## 11. Risques restants

| Risque | Gravité | Atténuation |
|---|---|---|
| Perte de la clé `TWO_FACTOR_ENCRYPTION_KEY` : tous les secrets deviennent illisibles, les comptes protégés ne peuvent plus se connecter | élevée | sauvegarde en gestionnaire de secrets ; le script de dernier recours efface les secrets ; levier d'urgence § 5 bis |
| Un OWNER perd téléphone et codes : seul l'opérateur de la base peut le débloquer | moyenne | codes hors du téléphone ; l'opérateur est le propriétaire lui-même |
| Aucun fournisseur d'e-mails : pas de récupération de mot de passe | élevée tant qu'il n'est pas choisi | décision en attente |
| Verrouillage de compte déclenchable par un tiers (15 min) | faible | expire seul ; déjà documenté |
| Jeton d'accès valable jusqu'à 15 minutes après une révocation | faible | les contrôles d'administration, eux, lisent la base à chaque requête |
| Migration `privilegedRoleSince` : un OWNER créé directement en base après l'activation bénéficie du délai de 14 jours | faible | l'OWNER n'est attribuable que par accès à la base |
| Le rappel dépend de `ENABLE_SCHEDULER=true` | moyenne | sans lui, seul le décompte de l'écran Sécurité informe les administrateurs ; à confirmer sur le service |
| Un OWNER dont la 2FA est réinitialisée par le script n'a pas de délai de grâce supplémentaire | faible | il peut se reconnecter et la reconfigurer aussitôt |
| Limite de 5 tentatives par minute et par IP sur les routes 2FA et la réinitialisation | faible | une équipe derrière une même adresse partage ce quota |
