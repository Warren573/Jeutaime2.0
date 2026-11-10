# Sécurisation du compte propriétaire (OWNER)

Branche : `claude/owner-account-security` — rien n'est fusionné ni déployé.
**Aucune donnée réelle n'a été modifiée.** Tous les essais ont été faits sur une base PostgreSQL locale.

## 1. État des lieux

| Point | Constat | Preuve |
|---|---|---|
| Compte OWNER | `testuser4@jeutaime.test`, promu par migration | `prisma/migrations/20261007090100_assign_owner_account` |
| Changement d'e-mail | Existe : `POST /api/auth/change-email`, exige le mot de passe actuel, ne modifie que la colonne `email`, révoque toutes les sessions | `accountSecurity.service.ts`, écran `frontend/app/email.tsx` |
| Changement de mot de passe | Existe : `POST /api/auth/change-password`, exige l'ancien, refuse un mot de passe identique, révoque toutes les sessions | idem, écran `frontend/app/password.tsx` |
| Révocation des sessions | Jetons de rafraîchissement révoqués en base. Le jeton d'accès en cours reste valable **15 minutes au plus** (durée `JWT_ACCESS_EXPIRES_IN`) | `auth.service.ts`, `env.ts` |
| Vérification de la nouvelle adresse | **Absente** : aucun envoi d'e-mail n'existe dans le projet | aucune dépendance d'envoi d'e-mails |
| Récupération du compte (« mot de passe oublié ») | **Absente** | `auth.routes.ts` : aucune route de réinitialisation |
| Journal des connexions | Présent (`LoginEvent`) | `schema.prisma` |
| Double authentification | **Absente** | — |

Conséquence directe : **si le mot de passe du compte OWNER est perdu, il n'existe aujourd'hui aucun
moyen de le récupérer autrement que par une intervention manuelle en base.**

## 2. Anomalies trouvées et corrections

| Réf. | Gravité | Anomalie | Correction | Statut |
|---|---|---|---|---|
| OWN-1 | P0 | `scripts/reset-test-users.ts` supprimait **tout** compte dont l'e-mail contient `.test`, y compris le compte OWNER, puis le recréait en simple USER | Le script ne supprime plus que des comptes au rôle `USER` et ne recrée jamais un compte existant | **corrigé** — essai réel : OWNER conservé (id, rôle, empreinte inchangés), compte USER voisin supprimé et recréé |
| OWN-2 | P0 | Mot de passe des dix comptes de test écrit en clair dans ce script (dont celui du compte devenu OWNER) | Lu dans `TEST_USERS_PASSWORD` ; le script s'arrête sans rien modifier si la variable est absente | **corrigé** dans le code. **Le mot de passe déjà publié reste dans l'historique Git : seul un changement de mot de passe sur le compte réel le rend inutilisable** |
| OWN-3 | P1 | `prisma/seed.js` et `seed.ts` : mot de passe du compte `test@jeutaime.com` en clair, **et affiché dans les journaux** au démarrage | Lu dans `SEED_TEST_USER_PASSWORD` ; sans variable, le compte n'est pas créé ; plus d'affichage | **corrigé** |
| OWN-4 | P1 | `ensureBootstrapAdmin` : si `ADMIN_BOOTSTRAP_EMAIL` désignait le compte OWNER, il était rétrogradé en ADMIN et son mot de passe remplacé à chaque démarrage | Un compte OWNER existant n'est plus jamais modifié | **corrigé** — 4 tests |
| OWN-5 | P0 | Compte `admin@jeutaime.test` (ADMIN) créé par migration, empreinte de mot de passe publiée | Migration `20261103150000_neutralize_temporary_admin` reprise de la branche `claude/neutralize-temp-admin` : rôle USER, mot de passe inutilisable, compte banni, sessions révoquées, aucune suppression, OWNER exclu | **préparé et testé en local** — s'appliquera à la base réelle au premier déploiement suivant la fusion : **votre accord est requis** |

Aucun autre secret exploitable trouvé dans le dépôt (recherche de clés privées, jetons, chaînes de
connexion : seulement des exemples fictifs dans d'anciens documents).

## 3. Permissions par rôle (audit)

| Action | USER | MODERATOR | ADMIN | OWNER |
|---|---|---|---|---|
| Signalements, modération de contenus, tickets de support | — | oui | oui | oui |
| Bannir, débannir, avertir | — | oui (pas un ADMIN ni l'OWNER) | oui (pas un autre ADMIN ni l'OWNER) | oui |
| Lister les comptes, ajuster les pièces, accorder Plus | — | — | oui | oui |
| Changer un rôle | — | — | USER ↔ MODERATOR seulement | USER, MODERATOR, ADMIN |
| Nommer ou révoquer un ADMIN | — | — | non | oui |
| Réinitialiser salons, refuge, bouteilles, lettres d'un compte | — | — | non | oui |
| Journal d'audit, économie, opérations, salons, journal | — | — | oui | oui |
| Créer un match directement entre deux comptes | — | oui | oui | oui |

**Élévation vers OWNER** : impossible par l'API. Le schéma de changement de rôle n'accepte que
`USER`, `MODERATOR`, `ADMIN` (test ajouté) ; nul ne peut modifier son propre rôle ; le rôle d'un
OWNER ne peut pas être modifié ; un OWNER ne peut pas être banni. Le rôle OWNER ne peut être attribué
que par une écriture directe en base (migration ou accès PostgreSQL).

Points à décider :

- Un ADMIN peut créditer **son propre** portefeuille et s'accorder Plus (l'action est tracée dans le
  journal d'audit, mais pas interdite).
- Un MODERATOR peut créer un match entre deux comptes quelconques (`POST /api/matches`).
- `requireOwner` (`core/middleware/auth.ts`) n'est utilisé par aucune route : code mort.

## 4. Procédure proposée pour le compte réel

À exécuter **par vous-même, dans l'application**, sans aucune écriture manuelle en base et sans
communiquer de mot de passe à qui que ce soit.

1. Fusionner et déployer cette branche (protections OWN-1 à OWN-4). *Votre accord.*
2. Dans l'application, connecté au compte OWNER : **Réglages → E-mail**. Saisir le mot de passe
   actuel et la nouvelle adresse. Toutes les sessions sont fermées ; se reconnecter avec la nouvelle
   adresse.
3. **Réglages → Mot de passe**. Saisir l'ancien puis un nouveau mot de passe long et unique, généré
   par un gestionnaire de mots de passe. Toutes les sessions sont de nouveau fermées.
4. Contrôle : **Réglages → Administration** s'ouvre toujours (rôle OWNER intact) ; profil, pièces,
   lettres et matchs sont inchangés.
5. Attendre 15 minutes : au-delà, plus aucun ancien jeton d'accès n'est valable.

Ce que cette procédure garantit, vérifié par `tests/integration/owner-credentials-rotation.test.ts`
(6 tests, base locale) : identifiant inchangé, rôle OWNER conservé, profil et portefeuille intacts,
anciennes sessions impossibles à prolonger, ancienne adresse et ancien mot de passe refusés.

Effets de bord à connaître après le changement d'adresse :

- `scripts/reset-test-interactions.js` cible les adresses `@jeutaime.test` : votre compte **sortira**
  de son périmètre (ses interactions ne seront plus remises à zéro par ce script).
- Les migrations historiques qui citent `testuser4@jeutaime.test` sont déjà appliquées : sans effet.
- La limitation des tentatives de connexion n'est levée que pour `@jeutaime.test` sur le service de
  staging : votre compte retrouvera la limite normale (5 tentatives par minute).

## 5. Reste à développer (décisions requises)

| Besoin | Pourquoi | Dépendance |
|---|---|---|
| Vérification de la nouvelle adresse e-mail | Sans elle, une faute de frappe dans l'adresse n'est pas détectée | Choix d'un service d'envoi d'e-mails et d'un nom de domaine expéditeur |
| « Mot de passe oublié » | Aucune récupération possible aujourd'hui | idem |
| Notification de sécurité (connexion, changement d'adresse ou de mot de passe) | Détection d'un accès indu | idem, ou notification interne |
| Seconde vérification pour les rôles OWNER et ADMIN | Protection des comptes à privilèges | À décider |

## 6. Tests exécutés

| Test | Résultat |
|---|---|
| `tests/unit/owner-protection.test.ts` | 10/10 |
| `tests/integration/owner-credentials-rotation.test.ts` (PostgreSQL local) | 6/6 |
| Exécution réelle de `reset-test-users.ts` sur la base locale avec un OWNER en `.test` | OWNER conservé |
| Migration de neutralisation sur la base locale | compte ADMIN temporaire → USER banni, sessions actives 0, OWNER voisin intact |
| Typecheck backend | 0 erreur |
