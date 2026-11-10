# Système publicitaire JeuTaime

Branche : `claude/rewarded-ads-backend` — rien n'est fusionné, déployé ni publié.
Aucun compte publicitaire n'a été créé, aucune publicité réelle n'a été diffusée.

## 1. État des lieux

| Élément | Avant | Sur cette branche |
|---|---|---|
| Bibliothèque publicitaire dans l'application | aucune | aucune (volontaire, voir § 5) |
| Validation serveur des publicités récompensées | absente | **développée et testée** |
| Plafond quotidien, anti-doublon, anti-fraude | absents | **développés et testés** |
| Consentement (RGPD, suivi publicitaire iOS) | absent | à faire, dans le build natif |
| Publicité quotidienne obligatoire | absente | **non développée — arbitrage requis (§ 4)** |

## 2. Publicités récompensées — ce qui est livré (serveur)

Règle validée appliquée : **+10 pièces par publicité visionnée et validée, 5 récompenses par jour**
(jour calendaire UTC, la même fenêtre que le bonus quotidien).

### Principe de sécurité

L'application mobile **ne peut pas** créditer de pièces. Après un visionnage complet, c'est le
serveur du réseau publicitaire qui appelle JeuTaime avec une requête signée ; JeuTaime vérifie la
signature avec les clés publiques du réseau, puis crédite.

| Menace | Protection | Test |
|---|---|---|
| Appel direct de l'URL sans avoir vu de publicité | signature ECDSA exigée → 403 | `ads-http` |
| Modification du montant ou du compte destinataire | la signature couvre tous les paramètres → 403 | `ads-ssv` |
| Rejeu d'une ancienne validation | horodatage de plus d'une heure refusé | `ads-ssv` |
| Même validation livrée plusieurs fois | index unique (réseau, transaction) : un seul crédit | `ads-rewarded` (6 envois simultanés → 1 crédit) |
| Dépassement du plafond par envois simultanés | comptage sous verrou du portefeuille | `ads-rewarded` (12 envois → 5 crédits, 50 pièces) |
| Même validation utilisée pour deux comptes | refusée pour le second | `ads-rewarded` |
| Emplacement publicitaire d'une autre application | liste d'emplacements autorisés ; liste vide = tout refusé | `ads-ssv` |
| Compte banni ou inexistant | aucun crédit | `ads-rewarded` |

Le montant crédité est toujours la constante du serveur (10) : le montant annoncé par le réseau
est ignoré. Chaque crédit écrit une ligne `AD_REWARD` dans l'historique des pièces.

### Interface

| Route | Appelant | Rôle |
|---|---|---|
| `GET /api/ads/admob/ssv` | serveurs du réseau publicitaire | validation signée ; 404 tant que `ADS_REWARDED_ENABLED` n'est pas `true` |
| `GET /api/ads/rewarded/status` | application, utilisateur connecté | activé ou non, récompenses restantes aujourd'hui |

### Fichiers

`backend/src/policies/adRewards.ts`, `backend/src/modules/ads/` (3 fichiers),
migration `20261110090000_ad_reward_claims` (additive : une table, une valeur d'énumération).

### Tests exécutés (PostgreSQL 16 local)

| Fichier | Résultat |
|---|---|
| `tests/unit/ads-ssv.test.ts` | 14/14 |
| `tests/integration/ads-rewarded.test.ts` | 7/7 |
| `tests/integration/ads-http.test.ts` | 4/4 |
| Suite complète | 752 réussis ; les 19 échecs sont ceux déjà présents sur `main` (traités dans la PR #192) |

**Non testé** : l'échange réel avec le réseau publicitaire (aucun compte), et tout le parcours sur
téléphone.

## 3. Bibliothèque et compatibilité Expo SDK 54

| Sujet | Constat |
|---|---|
| Bibliothèque | `react-native-google-mobile-ads` (Google AdMob), avec plugin de configuration Expo |
| Version | La dernière (17.4.0) exige React Native ≥ 0.86 : **incompatible** avec le projet (0.81.5). Les séries 16.x (jusqu'à 16.5.0) et 17.0.x (React Native ≥ 0.76) sont candidates. **La version exacte doit être validée par un build EAS réel** — non vérifiable ici |
| Consentement RGPD | Plateforme de consentement de Google (UMP), incluse dans la bibliothèque |
| Suivi publicitaire iOS | `expo-tracking-transparency` + texte `NSUserTrackingUsageDescription` |
| Expo Go | Ne fonctionne pas : build de développement obligatoire |

Tout ceci est natif : **nouveau build iOS et Android, avec une nouvelle `runtimeVersion`**.

## 4. Publicité quotidienne obligatoire — analyse de conformité

Règle validée : une publicité par jour pour les comptes gratuits, sans récompense.

| Exigence des stores | Conséquence |
|---|---|
| Google Play : pas de publicité plein écran inattendue, notamment au lancement ou à la fermeture de l'application ; une publicité plein écran doit pouvoir être fermée (15 secondes au plus) | Un interstitiel affiché dès l'ouverture, ou impossible à fermer, expose à un refus |
| Google Play et Apple : une publicité ne doit pas interrompre une action en cours ni provoquer de clic involontaire | Jamais pendant la rédaction d'une lettre, une conversation de salon, un duel |
| Apple : pas de règle interdisant un interstitiel quotidien, mais consentement au suivi obligatoire avant toute publicité personnalisée | Demande d'autorisation avant la première publicité |

**Conclusion : la règle est réalisable, à condition de choisir le moment d'affichage.**
« Obligatoire » ne peut pas signifier « bloquant à l'ouverture et impossible à fermer ».

Options, la règle économique restant inchangée (une par jour, comptes gratuits, sans récompense) :

| Option | Description | Risque de refus | Gêne |
|---|---|---|---|
| **A (recommandée)** | Format « ouverture d'application » du réseau, prévu pour cela : affiché après l'écran de démarrage, au premier lancement du jour, fermable | faible | modérée |
| B | Interstitiel à une transition naturelle, une fois par jour (par exemple en quittant un salon ou en revenant à l'accueil), jamais pendant une saisie | faible | faible |
| C | Interstitiel bloquant dès l'ouverture | **élevé** | forte |

Je n'ai rien développé pour cette publicité : le choix A ou B vous revient.

## 5. Pourquoi l'application n'est pas modifiée sur cette branche

Ajouter la bibliothèque publicitaire au code de l'application sans nouveau build ferait planter les
binaires actuels à la prochaine OTA (module natif absent). L'intégration côté application doit donc
être faite sur la branche du prochain build natif, en une seule fois avec les autres modules natifs
(photos, notifications, achats).

### Plan d'intégration côté application (à faire avec le build natif)

1. Installer la bibliothèque et son plugin ; identifiants d'application **de test Google** dans `app.json`.
2. iOS : comme le dossier `ios/` est figé, ajouter à la main dans `Info.plist` l'identifiant
   d'application publicitaire, `NSUserTrackingUsageDescription` et la liste `SKAdNetworkItems` — ou
   revenir à un projet iOS généré (décision à prendre).
3. Au premier lancement : formulaire de consentement (UMP), puis demande de suivi iOS, **puis**
   seulement initialisation des publicités.
4. Publicité récompensée : bouton dans « Pièces » affichant « n restantes aujourd'hui » (route de
   statut) ; l'identifiant du compte est transmis au réseau pour la validation serveur ; après
   fermeture, l'application relit simplement le solde.
5. Cas d'échec à gérer : aucune publicité disponible, échec de chargement, fermeture avant la fin
   (pas de récompense), perte de réseau, validation serveur en retard (le solde se met à jour au
   rafraîchissement suivant).
6. Pendant tout le développement : **uniquement** les identifiants de test fournis par la
   bibliothèque (`TestIds`), jamais d'identifiant réel.

## 6. Conformité et confidentialité

| Sujet | À faire |
|---|---|
| RGPD | Consentement avant toute publicité personnalisée ; lien permanent « Gérer mes choix publicitaires » dans Réglages → Confidentialité |
| iOS | Demande d'autorisation de suivi ; fiche de confidentialité App Store mise à jour (identifiants, données d'usage) |
| Android | Déclaration de l'identifiant publicitaire et section « Sécurité des données » de Google Play |
| Âge | L'inscription exige 18 ans (`auth.schemas.ts`). Publicités à paramétrer comme non destinées aux enfants, avec un plafond de classification du contenu à choisir |
| Catégories | Exclure dans la console du réseau les catégories sensibles et les applications de rencontre concurrentes |
| Politique de confidentialité | Mentionner le réseau publicitaire, les finalités et la base légale (projet dans `docs/legal/`) |
| Site web | Le réseau demande un fichier `app-ads.txt` sur le site du développeur |

## 7. Règles à confirmer

| Question | Pourquoi |
|---|---|
| Les abonnés Plus voient-ils la publicité quotidienne ? | La règle dit « comptes gratuits » : j'en déduis que non, à confirmer |
| Les abonnés Plus peuvent-ils regarder des publicités récompensées ? | Non précisé. Le serveur ne fait aujourd'hui aucune différence |
| Moment d'affichage de la publicité quotidienne | Option A ou B (§ 4) |
| Plafond de classification du contenu publicitaire | Choix éditorial |

## 8. Procédure de vérification sur appareils réels (après build natif)

À faire sur iPhone 16e et Galaxy A16, avec les identifiants de test uniquement.

1. Premier lancement : le formulaire de consentement s'affiche avant toute publicité ; sur iPhone,
   la demande de suivi s'affiche ensuite.
2. Refuser le consentement : les publicités restent possibles mais non personnalisées ; l'application
   fonctionne normalement.
3. Pièces → regarder une publicité jusqu'au bout : le solde augmente de 10 en moins d'une minute ;
   une ligne apparaît dans l'historique.
4. Fermer une publicité avant la fin : aucun crédit.
5. Regarder 5 publicités : le bouton indique 0 restante ; une sixième ne crédite rien.
6. Mode avion pendant le chargement : message clair, aucun blocage de l'écran.
7. Passer l'application en arrière-plan pendant une publicité puis revenir : pas d'écran figé.
8. Lendemain (après minuit UTC, soit 1 h ou 2 h à Paris) : 5 récompenses de nouveau disponibles.
9. Compte Plus : comportement conforme à la règle confirmée au § 7.
10. Vérifier qu'aucune publicité n'apparaît pendant la rédaction d'une lettre, dans un salon ou un duel.

## 9. Mise en service (toutes ces étapes exigent votre accord)

1. Créer le compte publicitaire et les emplacements.
2. Déclarer dans la console l'URL de validation serveur `…/api/ads/admob/ssv`.
3. Fusionner et déployer cette branche (migration additive).
4. Définir `ADMOB_REWARDED_AD_UNITS`, puis `ADS_REWARDED_ENABLED=true`.
5. Publier le build natif contenant l'intégration côté application.
