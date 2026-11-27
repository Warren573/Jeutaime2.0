# Version 2.1.0 — procédure iOS (GitHub Actions uniquement)

Aucun terminal : tout se lance depuis GitHub > onglet **Actions** > workflow > **Run workflow**.
iOS uniquement. Aucune opération Android, aucune action sur Neon (aucune donnée n'est touchée).

## Les quatre numéros à ne pas confondre

| Notion | Valeur pour cette version | Où elle est définie | Où la voir dans l'app (Paramètres > À propos) |
|---|---|---|---|
| **Version** | `2.1.0` | `frontend/app.json` (`expo.version`), `Info.plist` (`CFBundleShortVersionString`) | « Application v2.1.0 » |
| **Numéro de build iOS** | géré par EAS (2.0.0 était au build 7 ; EAS attribue le numéro suivant, **8 ou plus** — à relever dans le résumé du workflow) | `eas.json` : `appVersionSource: remote` + `autoIncrement: true` | « Build natif : N » |
| **Numéro d'OTA** | `2.1.0-ios-ota.<n°>` (n° d'exécution du workflow) | `update-ios-internal.yml` | « OTA 2.1.0-ios-ota.N · identifiant » (« Code intégré au build » tant qu'aucune OTA n'est reçue) |
| **Version serveur** | SHA du commit déployé sur Render | `/api/health/version` | « Serveur : … · build abc1234 » |

Le **runtime** (`2.1.0`, `app.json > ios.runtimeVersion` et `Expo.plist > EXUpdatesRuntimeVersion`) relie un build à ses OTA :
une OTA n'est reçue que par un build de même runtime. Les builds iOS 2.0.0 déjà installés ne reçoivent donc plus d'OTA
une fois le workflow d'OTA passé en 2.1.0 ; ils restent fonctionnels.

Le dossier `ios/` est versionné : EAS compile ses valeurs et ignore les réglages natifs d'`app.json`.
C'est pourquoi `Info.plist` et `Expo.plist` sont modifiés avec `app.json`, et contrôlés par
`frontend/scripts/check-ios-release-config.js`.

## Étapes

1. **Fusionner** la pull request de version dans `main` (CI verte). GitHub n'affiche dans « Run workflow » que les workflows présents sur `main` :
   les workflows de tag et de contrôle ne sont lançables qu'après cette fusion. Relever ensuite le SHA complet de `main`.
2. **Tag de sauvegarde** — Actions > « Create a GitHub backup tag (restore point) » > Run workflow :
   `sha` = `664a53f1875714172e2fa56d5a44227416fbda32` (main avant la version 2.1.0, toujours valable après la fusion),
   `tag_name` = `backup/avant-2.1.0-664a53f`, `confirm` = `CREER_TAG`.
3. **Contrôle** (lecture seule) — Actions > « iOS release preflight » > Run workflow. Doit être vert.
4. **Attendre le déploiement Render** : le SHA affiché par `https://jeutaime-staging.onrender.com/api/health/version` doit être celui de `main`.
5. **Build + TestFlight** — Actions > « Build and submit JeuTaime iOS to TestFlight » > Run workflow, branche `main` :
   `expected_sha` = SHA complet de `main`, `confirm` = `BUILD_IOS_TESTFLIGHT`.
   Le résumé de l'exécution affiche la version, le numéro de build et l'identifiant EAS.
6. **Apple** — App Store Connect > TestFlight : attendre la fin du traitement, puis installer le build.
7. *(Seulement si la soumission automatique a échoué)* Actions > « Submit an existing JeuTaime iOS build to TestFlight » :
   `eas_build_id` (UUID du résumé), `expected_app_version` = `2.1.0`, `expected_build_number` = numéro de build du résumé,
   `confirm` = `SOUMETTRE_TESTFLIGHT`.
8. **OTA suivantes** (après installation du build 2.1.0) — « Publish JeuTaime iOS OTA » : `expected_sha` = SHA de `main`, `confirm` = `PUBLIER_IOS`.

## Hors périmètre

Android (`build-android-aab.yml`, `update-android-internal.yml`, `android.runtimeVersion` = `2.0.0`) n'est pas modifié.
