# JeuTaime — Suivi d'audit (novembre 2026)

- **Branche analysée** : `main` @ `5e2da93` (2026-11-09)
- **Branche de travail** : `claude/friendly-thompson-4keyus`
- **Dernière mise à jour** : 2026-11-09

Légende des statuts : `corrigé` (code écrit **et** testé) · `partiel` · `bloqué` (opération interdite ou
information manquante) · `non commencé`.

Rien de ce document n'a été fusionné, déployé, publié en OTA ni envoyé aux stores.

---

## 1. Inventaire builds et OTA

### 1.1 Sources et limites

| Source | Accès | Ce qu'elle prouve |
|---|---|---|
| Dépôt Git (historique complet, 2 578 commits) | oui | configuration à chaque commit |
| Journaux GitHub Actions (builds Android, OTA) | oui | ce qui a été **publié** |
| Tableau de bord Expo / EAS | **non** (hôte refusé depuis l'environnement d'audit, aucun jeton) | — |
| App Store Connect / Play Console | **non** | — |
| Téléphones | **non** | — |

Conséquence : ce qui suit prouve ce qui a été *construit* et *publié*. Ce qui est *installé* sur un
téléphone ne peut être établi que par la procédure du § 1.6.

### 1.2 Configuration native actuelle (`main` @ `5e2da93`)

| Élément | iOS | Android |
|---|---|---|
| Identifiant | `com.jeutaime.app` | `com.jeutaime.app` |
| Version | `2.0.0` (`Info.plist`) | `2.0.0` (`app.json`) |
| Numéro de build | géré par EAS (`appVersionSource: remote`) ; `Info.plist` contient `1` | `versionCode` géré par EAS, dernier connu **5** |
| `runtimeVersion` | `2.0.0` (codé en dur dans `ios/JeuTaime/Supporting/Expo.plist`) | `2.0.0` (`app.json`) |
| Canal EAS (profil `production`) | `internal-test` | `internal-test` |
| Projet natif | **dossier `frontend/ios/` commité** (projet figé) | **pas de dossier `android/`** (généré à chaque build) |
| Expo SDK / React Native | 54.0.33 / 0.81.5, nouvelle architecture | idem |

### 1.3 Builds natifs

| Plateforme | Build | Date | Commit | Preuve |
|---|---|---|---|---|
| Android | versionCode 5 — EAS `7eb5cdf6-3db5-4968-a603-2cc3cadebc60` | 2026-10-30 | `df21e30` | run GitHub Actions n° 6 (succès) |
| Android | versionCode 4 (déduit de « Incrementing versionCode from 4 to 5 ») | 2026-10-30 | `be92fed` | run n° 5 (succès) |
| Android | versionCode 3 (déduit) | 2026-10-29 | `22e2cc0` | run n° 4 (succès) |
| Android | runs n° 1 à 3 | 2026-10-29 | — | échecs, aucun binaire |
| iOS | **inconnu** | — | — | aucun workflow iOS dans le dépôt ; builds faits hors GitHub |

`frontend/package.json` et les plugins natifs de `app.json` sont **inchangés** entre `df21e30` et
`5e2da93` : les OTA publiées depuis sont compatibles nativement avec le build Android versionCode 5.

### 1.4 OTA publiées

- 46 exécutions du workflow « Publish JeuTaime Android OTA », 43 réussies, toutes sur la branche EAS
  `internal-test`, runtime `2.0.0`.
- Runs 1 à 6 (30–31 octobre) : publiés depuis la branche Git `ota-settings-a16-20261030`
  (branche aujourd'hui supprimée). Runs 8 à 46 : depuis `main`.
- **Dernière OTA** : n° 46, 2026-11-09 23:04 UTC, commit `5e2da93`, groupe
  `15939ccc-0083-46a0-a096-0c1f140f0fcf`, identifiant Android `01a1c28e-aa65-7394-…`,
  identifiant iOS `01a1c28e-aa65-7665-…`, message « JeuTaime OTA 2.0.0-ota.46 ».

**Constat OTA-1** — Le workflow s'appelle « Android OTA » mais la commande
`eas update --branch internal-test` (`.github/workflows/update-android-internal.yml:49`) n'a pas
d'option `--platform` : chaque exécution publie **Android et iOS** (journal : `Platform android, ios`).
Toute OTA « Android » atteint donc aussi les builds iOS du canal `internal-test`.

**Constat OTA-2** — Aucune OTA n'a été publiée sur une autre branche EAS que `internal-test` par ce
workflow. Des publications manuelles éventuelles (`eas update` en local) ne sont pas visibles d'ici.

### 1.5 Tableau de compatibilité

| Installation | Runtime | Canal | Reçoit les OTA `internal-test` ? |
|---|---|---|---|
| Android versionCode 3, 4, 5 (EAS, profil `production`) | 2.0.0 | internal-test | **oui** |
| iOS construit **avant** le 2026-11-03 (`42d7056`) | — | — | **non** : `EXUpdatesEnabled` était `false`, aucune URL |
| iOS construit après le 2026-11-03 **via EAS Build** | 2.0.0 | internal-test (injecté par EAS) | oui, à confirmer (§ 1.6) |
| iOS construit après le 2026-11-03 **depuis Xcode en local** | 2.0.0 | **aucun** (`Expo.plist` ne contient pas d'en-tête de canal) | **je ne sais pas encore** — à vérifier (§ 1.6) |
| Web (Vercel) | sans objet | sans objet | sans objet : reconstruit à chaque push sur `main` |

### 1.6 Procédure de vérification sur chaque téléphone (manuelle)

Dans l'application : **Réglages → bas de page** (`frontend/src/screens/SettingsScreen.tsx:171-184`).

| Valeur affichée | Attendu si l'OTA n° 46 est réellement installée |
|---|---|
| Version OTA | `2.0.0-ota.46` |
| Identifiant de mise à jour | `01a1c28e` |
| Canal | `internal-test` |
| État | « mise à jour » et non « embarqué » |
| Build | Android : `5` |

Si le canal affiche « non renseigné » ou si l'état reste « embarqué » après deux redémarrages complets
de l'application, ce téléphone **ne reçoit pas** les OTA.

### 1.7 Changements qui exigent un nouveau build natif (pas une OTA)

| Besoin | Raison |
|---|---|
| Ajout de photo depuis le mobile | nécessite `expo-image-picker` (module natif + permissions) |
| Notifications push fiables | `expo-notifications` 55.0.21 installé alors que le SDK 54 attend ~0.32.16 ; `JeuTaime.entitlements` vide (pas d'`aps-environment`) ; plugin absent de `app.json` |
| Achats intégrés (Plus, packs de pièces) | aucune bibliothèque d'achat installée |
| Publicités | aucune bibliothèque publicitaire installée |
| Stockage sécurisé des jetons | `expo-secure-store` absent |
| Toute modification d'icône, d'écran de démarrage, de permissions | natif |

**Règle à appliquer au prochain build** : passer `runtimeVersion` à une nouvelle valeur (par exemple
`2.1.0`) sur iOS (`Expo.plist`) **et** Android (`app.json`). Sinon une OTA utilisant un nouveau module
natif serait livrée aux anciens binaires `2.0.0`, qui planteraient au démarrage.

### 1.8 Incohérences de configuration relevées

| Réf. | Constat | Preuve |
|---|---|---|
| CFG-1 | iOS utilise un projet natif figé : `app.json` (icône, écran de démarrage, plugins, runtime) n'est **pas** appliqué à iOS | `expo-doctor` : « native project folders but also native configuration in app.json » |
| CFG-2 | `Podfile.lock` commité antérieur à l'ajout d'`expo-updates` : ni `EXUpdates` ni `expo-dev-client` n'y figurent | `grep` sur `frontend/ios/Podfile.lock` |
| CFG-3 | `expo-notifications` 55.0.21 dans un projet SDK 54, avec `expo-constants` en double (18.0.13 et 55.0.15) | `expo-doctor` |
| CFG-4 | Les trois images de l'écran de démarrage iOS (1x, 2x, 3x) sont le même fichier de 1,8 Mo | commit `e954f5d` |
| CFG-5 | Profils EAS `development` et `preview` sans canal : un build issu de ces profils ne reçoit aucune OTA | `frontend/eas.json` |
| CFG-6 | Archive envoyée à EAS : 190 Mo, pas de `.easignore` | journal du build n° 6 |
| CFG-7 | 7 workflows encore enregistrés sur GitHub n'existent plus dans `main` (dont « Backend CI », « Security P0 checks ») : plus aucune CI n'exécute la suite complète | liste des workflows |

---

## 2. Infrastructure — points à confirmer par le propriétaire

Je n'ai accès ni à Render, ni à Vercel, ni à Neon. Les points suivants sont **inconnus** et
conditionnent la gravité de plusieurs constats.

| Réf. | Question | Pourquoi c'est important |
|---|---|---|
| INF-1 | Existe-t-il un backend de **production** distinct de `jeutaime-staging.onrender.com` ? | Tout le code client (`frontend/.env`, `.env.production`, valeur par défaut de `src/api/client.ts:6`) pointe vers **staging**. Sur ce service, les routes `/api/test/*` sont actives (`app.ts:118-121`) et la limitation des tentatives de connexion est levée pour les adresses `@jeutaime.test` (`rateLimit.ts:22-30`). |
| INF-2 | Quelle est la commande de démarrage Render ? | Trois existent : `npm start` (rejoue `prisma/seed.js`, qui crée `test@jeutaime.com` avec un mot de passe écrit dans le dépôt), `npm run start:render`, `scripts/deploy.sh` (`prisma db push`). |
| INF-3 | Le service Render a-t-il un disque persistant monté sur `UPLOAD_DIR` ? | Les photos sont écrites sur le disque local (`photos.storage.ts:20`). Sans disque persistant, **chaque déploiement efface toutes les photos**, et `verify-deployment.yml` déclenche un déploiement à chaque push sur `main`. |
| INF-4 | `NODE_ENV` vaut-il `production` sur ce service ? | Sinon `isTestMode()` est vrai (`core/testMode.ts:13`) : auto-offrande et auto-sort autorisés, routes `/api/debug` ouvertes. |
| INF-5 | `ENABLE_SCHEDULER` vaut-il `true` ? | Valeur par défaut `false` (`env.ts:39`) : sans lui, aucune tâche planifiée (expiration des sessions de salon, clôture du refuge, purge des jetons, rétrogradation Plus). |
| INF-6 | Sauvegardes PostgreSQL : fréquence, rétention, restauration testée ? | Non vérifiable d'ici. |
| INF-7 | Le mot de passe du compte `testuser4@jeutaime.test` (rôle **OWNER**) a-t-il été changé ? | `backend/scripts/reset-test-users.ts:71-72` crée ce compte avec un mot de passe écrit en clair dans le dépôt. |

---

## 3. Inventaire des problèmes

### P0 — critique

| Réf. | Problème | Cause / preuve | Statut | OTA ou build |
|---|---|---|---|---|
| P0-1 | Le compte propriétaire (OWNER) est un compte de test dont le mot de passe d'origine figure dans le dépôt | migration `20261007090100_assign_owner_account` + `scripts/reset-test-users.ts:71-72` | **bloqué** — dépend de INF-7 ; changer le mot de passe est une opération sur les données réelles | aucun |
| P0-2 | Compte `admin@jeutaime.test` (rôle ADMIN) créé par migration, empreinte du mot de passe publiée dans le dépôt | migration `20261002102500_create_temporary_admin`. Correctif existant mais **non fusionné** : branche `claude/neutralize-temp-admin` (`bead129`) | **bloqué** — la neutralisation est une migration sur la base réelle | aucun |
| P0-3 | Application cliente branchée sur le service « staging », routes de test actives | voir INF-1 | **bloqué** — décision d'infrastructure | selon décision |
| P0-4 | Risque de perte de toutes les photos à chaque déploiement | voir INF-3 | **bloqué** — à confirmer | aucun |

### P1 — important

| Réf. | Problème | Cause / preuve | Statut | OTA ou build |
|---|---|---|---|---|
| P1-1 | Bonus quotidien : plusieurs réclamations simultanées toutes acceptées ; crédits/débits concurrents perdus | `wallet.service.ts` lisait le portefeuille sans verrou. Mesuré avant : 5 acceptées sur 8, 5 écritures ; solde 120 au lieu de 130. Après : 1 acceptée, 1 écriture, 130 | **corrigé** — commit `c3ed5cc`, test `tests/integration/daily-bonus-concurrency.test.ts` (3/3) | aucun (backend) |
| P1-2 | Impossible d'ajouter une photo depuis iOS/Android | `frontend/app/my-photos.tsx:83-86` affiche « Bientôt disponible » hors web | non commencé | **build natif** |
| P1-3 | Aucun parcours « mot de passe oublié » ; aucune vérification d'adresse e-mail | `auth.routes.ts` : 10 routes, aucune de réinitialisation ; aucun service d'envoi d'e-mails | non commencé — nécessite un fournisseur d'e-mails (décision) | OTA + backend |
| P1-4 | JeuTaime Plus et packs de pièces non achetables | `premium.service.ts` : `subscribe` répond toujours 403 ; registre des reçus présent mais sans route ni vérification Apple/Google ; aucune bibliothèque d'achat côté client | **partiel** (socle serveur seulement) | **build natif** |
| P1-5 | Publicités (classiques et récompensées) | aucune trace dans le code | non commencé | **build natif** |
| P1-6 | La photo reste accessible après rupture du match | `photos.access.ts` ne tient pas compte de `match.status` (`BROKEN`, `PENDING`) ; seul un blocage coupe l'accès | **décision produit requise** — aucune règle écrite | aucun (backend) |
| P1-7 | Un abonné Plus peut voir la photo de n'importe quel profil, sans match | `photos.access.ts` : `viewerIsPremium` est testé avant l'existence d'un match. Conforme à `PHOTO_THRESHOLD_PREMIUM = 0` | **décision produit à confirmer** | aucun |
| P1-8 | L'historique des migrations Prisma ne peut pas être rejoué sur une base vide | 13 migrations nommées par horodatage Unix se trient avant `20260100000000_init` → `relation "User" does not exist`. `DIRECT_URL` exigé par le schéma mais absent de `.env.example` | **bloqué** — la correction touche la table `_prisma_migrations` de la base réelle | aucun |
| P1-9 | Notifications push : dépendance incompatible, droits iOS absents, couverture partielle | CFG-3 ; types existants : lettre, match, offrande, magie, Plus, message admin, invitation salon privé. Absents : duel, refuge, élections | partiel | **build natif** |
| P1-10 | `verify-deployment.yml` appelle `/api/test/reset-mutual-smile` sur le service utilisé par les testeurs à chaque push sur `main` | `.github/workflows/verify-deployment.yml` | à décider avec INF-1 | aucun |
| P1-11 | Dépendances backend vulnérables : 7 au départ (1 critique `proxy-addr`, 3 élevées `body-parser`, `sharp`, `zod`) | `npm audit --omit=dev` | **partiel** — 7 → 5 : `proxy-addr` 2.0.8, `body-parser` 1.20.9, `qs` 6.14.3 (correctifs sans rupture, suite inchangée 741/8). Restent `sharp`, `zod`, `uuid` via `node-cron` : montées de version majeures, à traiter une par une | aucun |

### P2 — amélioration

| Réf. | Problème | Preuve | Statut |
|---|---|---|---|
| P2-1 | 8 tests encore en échec : mocks désynchronisés du code (weekly-profile ×5, salon-sessions ×3) ; 2 fichiers exigent des données de seed (session-isolation, offerings.consume) | suite complète : 741 réussis / 8 échoués / 25 ignorés | partiel (11 des 19 échecs initiaux résolus, commit `cd7dbb1`) |
| P2-2 | Limite générale de 100 requêtes/minute **par adresse IP** | `rateLimit.ts:5-12`. Des utilisateurs derrière la même adresse (réseau mobile) partagent le quota | non commencé — demande une mesure en conditions réelles |
| P2-3 | Jetons d'accès stockés dans AsyncStorage (non chiffré) | `frontend/src/api/client.ts:143-144` | non commencé (build natif) |
| P2-4 | `requireAuth` exécute 2 requêtes SQL par appel API | `core/middleware/auth.ts:27-40` | non commencé |
| P2-5 | La suppression de compte efface aussi les signalements **visant** ce compte | `accountDeletion.service.ts` | décision (RGPD contre traçabilité) |
| P2-6 | `ensureBootstrapAdmin` rétrograderait un OWNER en ADMIN si l'adresse configurée est celle du propriétaire | `adminBootstrap.service.ts` | non commencé |
| P2-7 | `requireOwner` laisse passer tout rôle autre que USER | `core/middleware/auth.ts:76-78` | non commencé — usages à recenser |
| P2-8 | Anti-ghosting calculé à la volée ; l'état `GHOSTED` n'est jamais écrit en base | aucune tâche planifiée correspondante | à confirmer comme comportement voulu |

### P3 — nettoyage

| Réf. | Problème | Preuve |
|---|---|---|
| P3-1 | 77 `console.log` de diagnostic dans le backend (salons, bouteilles, offrandes) | `grep` |
| P3-2 | `GET /api/health/version` lance `git rev-parse` à chaque appel, sans authentification | `health.routes.ts:20` |
| P3-3 | 29 erreurs ESLint backend (imports et variables inutilisés), 59 erreurs frontend (apostrophes non échappées) | `eslint` |
| P3-4 | `weekly-profile.service.ts` écrit sur des lignes de plus de 600 caractères | fichier |
| P3-5 | Environ 70 documents d'audit anciens à la racine, ~100 branches distantes obsolètes | dépôt |
| P3-6 | `backend/test-results.json` produit par chaque exécution de tests et non ignoré par Git | `vitest.config.ts` |

---

## 4. Tests exécutés

| Vérification | Résultat | Environnement |
|---|---|---|
| Backend — typecheck | 0 erreur | local |
| Backend — suite complète avant intervention | 727 réussis / **19 échoués** / 25 ignorés | PostgreSQL 16 local, schéma `ci-baseline` + 4 migrations, dérive nulle |
| Backend — suite complète après intervention | **741 réussis / 8 échoués** / 25 ignorés | idem |
| Frontend — typecheck | 0 erreur | local |
| Frontend — `expo-doctor` | 13/18 (2 échecs dus au réseau, 3 réels : CFG-1, CFG-3) | local |
| Rejeu des migrations sur base vide | **échec** (P1-8) | local |
| Appareils physiques (iPhone 16e, Galaxy A16) | **non testés** — aucun accès | — |
| Environnement de production / staging | **non contacté** | — |

## 5. Commits

| Commit | Contenu | Fusionné | Déployé |
|---|---|---|---|
| `c3ed5cc` | verrou du portefeuille + test de concurrence | non | non |
| `cd7dbb1` | tests obsolètes alignés sur les règles validées | non | non |
| (commit suivant) | correctifs de sécurité des dépendances backend (`package-lock.json` seul) | non | non |
