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
| 8 | TOTP pour OWNER et ADMIN, codes de secours | **développé et testé** | `totp.test.ts` (vecteurs RFC 6238) |
| 9 | Alertes de sécurité | **développé et testé** | idem |
| 10 | Désactivation, suppression, export | **vérifié, 2 défauts corrigés** (§ 7) | idem |

### Tests exécutés (PostgreSQL 16 local, boîte e-mail simulée)

| Fichier | Résultat |
|---|---|
| `tests/unit/totp.test.ts` | 10/10 |
| `tests/integration/account-security.test.ts` | 21/21 |
| `tests/integration/account-security-http.test.ts` | 5/5 |
| Suite backend complète | 762 réussis, 19 échoués, 25 ignorés. Les 19 échecs sont **les mêmes que sur `main`** (mocks obsolètes, traités dans la PR #192) ; aucun nouveau |
| Typecheck backend et frontend | 0 erreur |
| Export web complet de l'application | réussi |
| Pilotage de l'interface web (format iPhone 13 et Pixel 7) contre l'API locale | voir § 6 |

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
| `TWO_FACTOR_ENCRYPTION_KEY` | chiffrement des secrets de double authentification, 32 caractères minimum | absente : la double authentification est alors **indisponible** |
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

## 6. Écrans iOS et Android

Code JavaScript uniquement : **livrable par OTA**, sans nouveau build, à condition que le serveur soit déployé avant.

| Écran | Accès |
|---|---|
| Mot de passe oublié | Connexion → « Mot de passe oublié ? » (visible seulement si l'envoi d'e-mails est actif) |
| Nouveau mot de passe | lien reçu par e-mail |
| Confirmer mon adresse, Nouvelle adresse e-mail | lien reçu par e-mail |
| **Sécurité et appareils** | Réglages → Compte → Sécurité et appareils : adresse confirmée ou non, appareils connectés (déconnexion individuelle ou générale), double authentification, 20 dernières connexions |
| Étape « Code de vérification » | apparaît à la connexion si le compte a la double authentification |
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
| Export des données | **ne contient pas l'historique des connexions ni la liste des appareils**, qui sont des données personnelles couvertes par le droit d'accès | **à décider** (ajout simple) |

## 8. Protections et limites connues

| Menace | Protection | Limite |
|---|---|---|
| Force brute sur le mot de passe | verrouillage de l'adresse après 10 échecs en 15 minutes ; limite existante de 5 tentatives par minute et par IP | **un tiers peut verrouiller le compte d'autrui pendant 15 minutes** en saisissant 10 faux mots de passe. Compromis assumé : le verrou expire seul, et réinitialiser le mot de passe le lève. Valable aussi pour le compte OWNER |
| Lien volé ou rejoué | usage unique atomique (deux requêtes simultanées : une seule réussit), expiration, nouvelle demande = ancien lien invalide, seule l'empreinte est stockée | — |
| Inondation de demandes | 3 liens par heure et par compte et par type, plus la limite par IP | — |
| Savoir si une adresse a un compte | « mot de passe oublié » répond de façon identique dans tous les cas | le **temps de réponse** peut légèrement différer ; et l'**inscription** indique encore « Cet email est déjà utilisé » (comportement antérieur, non modifié) |
| Vol du mot de passe d'un ADMIN | double authentification TOTP, codes de secours à usage unique, secret chiffré (AES-256-GCM) | **facultative** : un ADMIN ou OWNER peut s'en passer. La rendre obligatoire est une décision (avec délai de grâce) |
| Perte du téléphone et des codes de secours | aucune | **aucune récupération automatique** : une réinitialisation manuelle en base est nécessaire. Conserver les codes de secours hors du téléphone |
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
9. Supprimer un compte de test : plus de trace dans l'export d'un autre compte, et la reconnexion est impossible.

## 10. Reste à faire ou à décider

| Sujet | Nature |
|---|---|
| Choix et activation du fournisseur d'e-mails, DNS du domaine | **votre décision**, nécessaire pour que la récupération de compte existe |
| Confirmer que `jeutaime.app` sert l'application web | à vérifier |
| Liens ouvrant l'application mobile (liens universels) | **build natif** |
| Double authentification obligatoire pour OWNER et ADMIN | décision |
| Vérification de l'adresse obligatoire pour certaines fonctions | décision |
| Historique des connexions dans l'export des données | décision |
| Notification de sécurité pour une connexion depuis un pays inhabituel | non développé (nécessite une géolocalisation d'adresse IP : service tiers et traitement de données à déclarer) |
| Opération sur votre compte OWNER | **aucune effectuée** ; procédure dans `docs/securite-compte-owner.md` (PR #193) |
