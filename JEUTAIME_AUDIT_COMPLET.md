# AUDIT COMPLET — JEUTAIME

*Audit réalisé sur la base du pitch produit ET du code réel du dépôt (≈53 000 lignes : frontend Expo/React Native ~31k LOC, backend Express/Prisma/PostgreSQL ~15,5k LOC, ~6,6k LOC de tests, 35 fichiers de tests, CI GitHub Actions). Ton demandé : brutalement honnête. C'est ce qui suit.*

---

## 0. Préambule — Le pitch et le code ne racontent pas la même histoire

Avant toute analyse, cinq écarts factuels entre votre présentation et votre dépôt :

| # | Le pitch dit | Le code dit | Conséquence |
|---|---|---|---|
| 1 | Premium à **19,90 €/mois** | `premium.plans.ts` : **4,99 €/mois**, 12,99 €/trimestre, 39,99 €/an | Vous ne savez pas encore ce que vous vendez ni à quel prix. C'est un signal d'alarme pour un investisseur. |
| 2 | Photos débloquées « via Premium » | `RevealEngine.ts` : Premium **abaisse le seuil de 10 lettres à 3**, il ne supprime pas la règle | Le code est meilleur que le pitch. Pitchez ce que vous avez codé. |
| 3 | Boîte à souvenirs, journal communautaire, concours, mini-jeux | **UI sans backend** (aucun modèle Prisma, aucune route API pour le journal ; card-game = stub) | Fonctionnalités fantômes. À assumer ou à couper. |
| 4 | Application monétisable | Stripe = **stub** (`stripe_stub`, bloqué en production, aucun webhook) | Revenu possible aujourd'hui : **0 €**. |
| 5 | App de rencontre grand public | **Aucune vérification d'âge**, aucune vérification email/téléphone | Risque légal existentiel (mineurs sur une app de rencontre). |

---

## 1. Potentiel commercial

### Le verdict en une phrase
Le concept « photos cachées » n'est pas une innovation : c'est un **cimetière documenté**, et vous devez le savoir avant d'y investir un euro de plus.

### Les précédents directs (le point le plus important de cet audit)
- **Appetence** (française, ~2017) : photos floutées qui se révèlent au fil des échanges. *Exactement* votre concept. Morte.
- **Once** : slow dating, 1 match/jour. Vendue ~18 M$ puis déclin continu. Le slow dating n'a jamais atteint la masse critique.
- **S'More, Willow, Twine, Blindlee** (photos floutées/cachées) : toutes mortes ou marginales.
- **Boo** : seule survivante du créneau « personnalité », mais elle **montre les photos** et mise sur le MBTI viral sur TikTok.

**Pourquoi ce créneau échoue systématiquement** : les utilisateurs *déclarent* vouloir de la personnalité, mais *se comportent* en fonction des photos (préférences déclarées vs révélées — c'est le biais le plus documenté du secteur). Le concept gagne les sondages et perd les métriques de rétention.

### Problèmes identifiés

**P1.1 — Le concept repose sur une préférence déclarée, pas révélée**
- Gravité : **Critique**
- Impact : rétention J7 structurellement faible ; les gens installent par curiosité et repartent quand la gratification est à 10 lettres de distance.
- Solution : ne pas parier l'app entière sur le masquage. Le flou progressif (déjà codé) est le bon compromis — la photo se dévoile *visiblement* à chaque lettre, créant une boucle de récompense. En faire le cœur du produit et du marketing.
- Priorité : immédiate (c'est un choix de positionnement, pas de code).

**P1.2 — Marché : problème de liquidité locale (cold start)**
- Gravité : **Critique**
- Impact : une app de rencontre est un marché biface hyper-local. 5 000 utilisateurs répartis sur la France = app vide partout. C'est la cause de mort n°1, avant le concept.
- Solution : lancement sur **une seule ville** (une métropole étudiante : Lyon, Lille, Toulouse), saturation locale avant toute extension.
- Priorité : structurante pour les 12 prochains mois.

**P1.3 — Différenciation réelle mais non défendable**
- Gravité : Élevée
- Impact : si le concept marche, Hinge ou Bumble le copient en un sprint (Bumble a déjà acquis Fruitz pour exactement ce genre de pari français).
- Solution : la défense n'est pas la fonctionnalité, c'est la **communauté locale + la marque française**. Fruitz a prouvé qu'une app française Gen Z peut exister et se vendre — c'est votre scénario de succès réaliste (acquisition), pas « battre Tinder ».
- Priorité : moyenne (question de stratégie de sortie).

**Probabilité de succès brute** : faible. Le scénario réaliste n'est pas « alternative à Tinder » mais « app de niche slow-dating française rentable ou rachetée ». Voir section 10.

---

## 2. Acquisition utilisateurs

**Pourquoi installer ?** La fatigue des apps de rencontre est réelle et documentée (désengagement Gen Z, baisse des payeurs chez Match Group). Le pitch « marre de swiper » a une vraie résonance. C'est votre seul vent porteur. ✔️

**Pourquoi quitter Tinder ?** Mauvaise question. **Personne ne quitte Tinder pour vous** — les utilisateurs multi-homent (3-4 apps en parallèle). Votre vrai objectif : être l'app *complémentaire* qu'on ouvre le soir pour des échanges de qualité. Cessez de vous positionner en remplacement.

**Pourquoi rester après 7 jours ?** C'est ici que ça casse :

**P2.1 — Le calendrier de la valeur est catastrophique**
- Gravité : **Critique**
- Impact : sourire → attendre un sourire mutuel → réussir le jeu des 3 questions → échanger des lettres **en alternance obligatoire** → 10 lettres pour voir un visage. À faible densité d'utilisateurs, un nouvel inscrit peut passer **5 jours sans un seul événement gratifiant**. Tinder délivre sa dopamine en 2 minutes. Vous, en une semaine, peut-être.
- Solution : garantir un « moment de valeur » à J0 : profils actifs proposés dès l'onboarding, premier salon rejoint automatiquement, première interaction guidée. Mesurer obsessionnellement le *time-to-first-mutual-smile* et le *time-to-first-letter*.
- Priorité : immédiate.

**P2.2 — Pourquoi payer ?** Aujourd'hui : pour rien (Stripe absent). Demain : un nouvel utilisateur ne paiera jamais 19,90 € pour une app sans preuve sociale. Même les whales de Tinder paient pour de la *quantité* (likes illimités) ; vous vendez de la *rareté* — c'est cohérent mais ça plafonne le revenu. Voir section 5.

---

## 3. Rétention

**P3.1 — Le Jeu des 3 Questions est un destructeur de matchs**
- Gravité : **Critique**
- Impact : le sourire mutuel est *l'événement le plus précieux* d'une app de rencontre. Vous le faites suivre d'un **point d'échec aléatoire** (« si au moins une réponse correspond »). Chaque match détruit par ce filtre = deux utilisateurs frustrés simultanément, sur un événement rare. C'est la pire mécanique du produit.
- Solution : transformer le jeu en **brise-glace sans échec** : les 3 questions ouvrent la conversation (les réponses deviennent le premier sujet de lettre), elles ne la conditionnent jamais.
- Priorité : immédiate, avant tout lancement.

**P3.2 — Friction empilée**
- Gravité : Élevée
- Impact : chaque porte (smile mutuel, questions, alternance, seuil de lettres, slots limités) perd un pourcentage d'utilisateurs. Multipliées, elles laminent la cohorte.
- Solution : garder **une seule** friction signature (l'alternance des lettres + photos progressives). Supprimer ou adoucir le reste.
- Priorité : immédiate.

**P3.3 — Les fonctionnalités de remplissage (animaux, pièces, offrandes, magies, mini-jeux)**
- Gravité : Élevée
- Impact : je comprends la logique — donner du contenu solo pour survivre à la faible liquidité. Mais un utilisateur venu pour des rencontres qui se retrouve à nourrir un tamagotchi comprend que **l'app est vide**, et la désinstalle. Ces systèmes ont coûté des milliers de lignes de code (Pet, PetCatalog, OfferingCatalog, Magie*, CardGame…) et des mois de maintenance, pour zéro utilisateur.
- Solution : geler (pas forcément supprimer du code — le couper de l'UI) tout sauf : salons, lettres, smiles, photos. Réintroduire plus tard si les données le justifient.
- Priorité : immédiate.

**Ce qui est bon et à garder** : l'anti-ghosting avec relance (codé, testé, différenciant, coût marginal nul), l'alternance des lettres (la friction *signature*), le déblocage progressif des photos.

---

## 4. UX

**P4.1 — Charge cognitive d'entrée**
- Gravité : Élevée
- Impact : 7 types de salons, pièces, offrandes, magies, animaux, premium, smiles, lettres, questions, slots de discussion… Un nouvel utilisateur doit apprendre **une dizaine de systèmes** avant sa première conversation. Tinder en demande un (swiper).
- Solution : un seul parcours doré : *s'inscrire → voir des profils → sourire → écrire une lettre → voir la photo se préciser*. Tout le reste derrière des déverrouillages progressifs (jour 3, jour 7…).
- Priorité : immédiate.

**P4.2 — Tunnel d'inscription : pas de vérification = pas de confiance**
- Gravité : Élevée
- Impact : inscription email/mot de passe sans vérification email, ni téléphone, ni photo, ni âge. Sur une app où **les visages sont cachés**, la confiance dans l'authenticité des profils doit être *supérieure* à Tinder, pas inférieure.
- Solution : vérification email obligatoire (1 jour de dev), vérification photo/selfie avant activation du profil (la photo reste cachée des autres, mais elle est *vérifiée* — argument marketing en or : « visages cachés, identités vérifiées »).
- Priorité : avant lancement.

**P4.3 — Temps avant la valeur** : traité en P2.1. C'est le même problème vu côté UX. La métrique à afficher au mur : *% d'inscrits ayant reçu au moins une lettre sous 48 h*.

---

## 5. Monétisation

**P5.1 — Le prix de 19,90 € est indéfendable**
- Gravité : Élevée
- Impact : c'est le tarif de Tinder Gold/Hinge+, pratiqué par des apps qui offrent des millions de profils. Pour une app inconnue sans liquidité, la conversion serait quasi nulle et les avis stores destructeurs. (Le code dit 4,99 € — gardez le code, jetez le pitch.)
- Solution : lancer à **4,99–7,99 €/mois**, positionné « soutien au projet + confort », pas « accès aux fonctions de base ».
- Priorité : décision immédiate.

**P5.2 — Premium = payer pour contourner le concept**
- Gravité : Élevée
- Impact : « débloquer les photos » en payant détruit la promesse anti-superficielle *et* crée une asymétrie glauque : je paie pour voir le visage de quelqu'un qui croit que son visage est protégé par la règle des 10 lettres. C'est un problème de **consentement**, pas seulement de cohérence.
- Solution : Premium ne touche jamais aux photos des autres. Vendre : plus de slots de discussion, 2e relance anti-ghosting, accusés de lecture, salons exclusifs, bonus de pièces. Le seuil 10→3 lettres codé actuellement est moins grave que le pitch, mais je le supprimerais aussi : la révélation doit être symétrique et méritée.
- Priorité : avant lancement.

**P5.3 — Double économie (pièces + abonnement + offrandes)**
- Gravité : Moyenne
- Impact : deux monnaies, un catalogue d'offrandes, des magies, des transactions… complexité de casino pour une base de 0 utilisateur. Les biens virtuels ne fonctionnent qu'à forte densité sociale.
- Solution : geler l'économie de pièces au lancement. Un seul produit payant : l'abonnement.
- Priorité : avant lancement.

**P5.4 — Aucune capacité d'encaissement**
- Gravité : **Critique** (si lancement prévu)
- Impact : `stripe_stub` partout, aucun webhook, paiement bloqué en prod. Et sur mobile, Apple/Google **imposeront l'In-App Purchase (30/15 %)** pour du contenu numérique — ce qui ampute vos marges et n'est nulle part dans le code.
- Solution : intégrer RevenueCat (gère IAP iOS/Android + Stripe web) plutôt que Stripe seul. Prévoir les 15-30 % de commission dans le pricing.
- Priorité : haute, mais *après* la preuve de rétention (inutile d'encaisser dans une app vide).

**Viabilité économique, le calcul que personne n'a fait** : CAC réaliste d'une app de dating française au lancement : 3-8 € l'install, donc 60-250 € le payeur (à 3-5 % de conversion). À 4,99 €/mois avec 4-6 mois de durée de vie moyenne d'abonnement, LTV ≈ 20-30 €. **L'équation publicitaire ne ferme pas.** La seule acquisition viable : organique locale (campus, TikTok, presse « l'anti-Tinder français », bouche-à-oreille). C'est un argument de plus pour le lancement mono-ville.

---

## 6. Technique

D'abord le crédit, car il est dû : **le code est très au-dessus de la moyenne des projets solo.** Backend modulaire (22 modules), JWT access/refresh correctement implémenté (bcrypt 12 rounds, refresh hashé en base), Zod partout, rate limiting différencié, Helmet, Prisma/PostgreSQL avec migrations, 35 fichiers de tests, ~10 workflows E2E en CI. Un CTO ne jetterait rien de l'architecture.

**P6.1 — Endpoints de debug/test exposés**
- Gravité : **Critique**
- Impact : `/api/test/*` et `/api/debug/*` exposent le commit déployé, des préfixes de hash de mot de passe (`loginWithDebug`), création/reset d'utilisateurs. En production, c'est une porte d'entrée.
- Solution : suppression pure (pas un flag d'env — suppression) avant tout déploiement public + `console.log` de debug purgés.
- Priorité : immédiate.

**P6.2 — Dette de processus : 50+ fichiers d'audit Markdown à la racine, commits « CRITICAL FIX » en rafale**
- Gravité : Moyenne
- Impact : l'historique git (`FINAL: Fix...`, `DIAGNOSTIC ONLY...`) et la racine du dépôt racontent un développement par tâtonnements assisté par IA, sans revue. Ça marche à 1 développeur et 0 utilisateur ; ça casse au premier collaborateur ou au premier incident de prod.
- Solution : déplacer les .md dans `/docs/archive`, adopter des PR avec revue (même auto-revue outillée), un CHANGELOG.
- Priorité : moyenne.

**P6.3 — Écrans monolithes** : `LettersScreen.tsx` 71 Ko, `SalonScreen.tsx` 64 Ko, `EditProfileScreen.tsx` 40 Ko. Gravité : Moyenne. Refactorer au fil de l'eau, pas en big-bang.

**P6.4 — Pas d'infra reproductible** : pas de Docker, déploiement Render staging, `.env` frontend pointant sur une IP locale (`192.168.0.40`). Gravité : Élevée si lancement. Solution : builds par environnement, Dockerfile, monitoring (Sentry) — il n'y a actuellement **aucune télémétrie d'erreur ni analytics produit**, donc vous serez aveugle au moment précis où il faudra voir.

**P6.5 — Surface de maintenance disproportionnée**
- Gravité : Élevée
- Impact : 22 modules backend, 30+ écrans, 7 types de salons, 4 économies… pour 0 utilisateur. Chaque feature gelée en UI doit quand même être maintenue, migrée, sécurisée. À développeur solo, c'est le facteur bus maximal.
- Solution : c'est l'argument *technique* du recentrage produit demandé en section 3.

**Scalabilité** : non-problème avant 100 000 utilisateurs. PostgreSQL + Express tiendront. Le risque technique n°1 n'est pas la charge, c'est **vous, seul, sur 53 000 lignes**.

---

## 7. Sécurité

**P7.1 — Aucune vérification d'âge**
- Gravité : **Critique (existentiel)**
- Impact : des mineurs peuvent s'inscrire sur une app de rencontre. En France, avec le durcissement réglementaire sur la vérification d'âge, c'est un risque pénal et médiatique qui peut tuer le projet en un article de presse. La `birthDate` est collectée mais **jamais validée**.
- Solution : blocage strict <18 ans à l'inscription (immédiat, 1 jour), puis vérification renforcée (selfie estimation d'âge) avant la sortie de bêta.
- Priorité : immédiate, non négociable.

**P7.2 — Le paradoxe sécuritaire du concept : les photos cachées protègent les arnaqueurs**
- Gravité : **Critique**
- Impact : les *romance scams* prospèrent précisément sur la construction de confiance **sans photo**. Votre mécanique — semaines d'échanges épistolaires avant de voir un visage — est le terrain de chasse idéal d'un brouteur. Aucune vérification d'identité, aucune modération de contenu des lettres, aucune détection de comptes suspects : le cocktail est dangereux.
- Solution : vérification selfie obligatoire à l'inscription + modération automatique des lettres (détection de patterns d'arnaque : demandes d'argent, redirection WhatsApp/Telegram, liens) + limites de vitesse sur les nouveaux comptes. C'est *la* condition de crédibilité du concept.
- Priorité : avant lancement.

**P7.3 — Modération sans pilote**
- Gravité : Élevée
- Impact : le système report/block est bien codé (table Report, raisons, statuts, rate-limit — sérieux), mais il n'y a **ni interface admin de traitement, ni déclencheurs automatiques** (`isBanned` existe, rien ne le déclenche). Des signalements qui s'empilent sans traitement = responsabilité légale (DSA) et danger réel pour les utilisatrices.
- Solution : back-office minimal de modération + règle automatique (N signalements = suspension en attente de revue) + filtrage de contenu (texte) dans lettres et salons.
- Priorité : avant lancement.

**P7.4 — RGPD incomplet**
- Gravité : Élevée
- Impact : données sensibles (orientation, ville, conversations intimes), pas d'export ni de suppression de données visibles, pas de flux de consentement. La CNIL surveille particulièrement les apps de rencontre.
- Solution : endpoints export/suppression de compte, politique de confidentialité, registre des traitements, durées de rétention.
- Priorité : avant lancement.

**Points sains** : pas d'`innerHTML`/XSS évident, pas de secrets en dur, requêtes paramétrées (Prisma), CORS configurable, rate limiting auth correct. Le socle est bon ; ce sont les couches « humaines » (âge, identité, modération) qui manquent.

---

## 8. Priorisation des fonctionnalités

### Indispensable au lancement
| Fonctionnalité | État actuel |
|---|---|
| Auth + **vérification email + âge 18+** | Auth ✅ / vérifications ❌ |
| Profils + vérification selfie | Profils ✅ / vérif ❌ |
| Sourire/Grimace + match mutuel | ✅ codé et testé |
| Lettres avec alternance | ✅ codé et testé |
| Déblocage progressif des photos (flou dégressif) | ✅ codé (RevealEngine) |
| Anti-ghosting + relance | ✅ codé et testé |
| Report / Block + back-office de modération | Report/Block ✅ / back-office ❌ |
| Notifications push | Infra Expo présente, à câbler sur les événements clés |
| Analytics produit + Sentry | ❌ absent |

### Important mais peut attendre (post-traction)
- Salons thématiques — **réduits à 2-3** (c'est votre meilleur outil de liquidité, mais 7 salons divisent une base vide)
- Premium (après preuve de rétention, à 4,99-7,99 €)
- Paiement (RevenueCat)
- Offrandes simples (1 catégorie)
- Boîte à souvenirs (le backend n'existe pas de toute façon)

### À supprimer (du produit lancé, pas forcément du dépôt)
- **Animaux virtuels** (un tamagotchi dans une app de dating signale une app vide)
- **Mini-jeux / card game** (stub, hors mission)
- **Concours** (fantôme)
- **Journal communautaire** (fantôme, et un risque de modération de plus)
- **Magies** (complexité pure)
- **Boutique de pièces / double économie** (au lancement)

### À repenser complètement
- **Jeu des 3 Questions** : de filtre éliminatoire → brise-glace sans échec (P3.1)
- **Premium** : ne doit jamais toucher aux photos d'autrui (P5.2)
- **Pricing** : 19,90 € → 4,99-7,99 €
- **Salons éphémères** : excellents *si* synchronisés (« le salon ouvre ce soir 21h ») pour concentrer une base faible — repenser comme rendez-vous, pas comme lieux permanents

---

## 9. Analyse concurrentielle

| App | Sa force | JeuTaime fait mieux | JeuTaime fait moins bien |
|---|---|---|---|
| **Tinder** | Liquidité mondiale, marque, simplicité (1 geste) | Profondeur des échanges, anti-ghosting, intentionnalité | Tout le reste : densité, time-to-value, confiance, notoriété |
| **Bumble** | Positionnement femmes-first clair et marketable | Mécanique de conversation plus riche | Sécurité perçue (Bumble a vérification photo et marque safety) — critique pour votre cible féminine |
| **Hinge** | « Designed to be deleted », prompts = personnalité **avec** photos. Votre concurrent conceptuel le plus dangereux | Le masquage force réellement l'échange (Hinge ne force rien) | Hinge prouve qu'on peut vendre la personnalité sans cacher les visages ; sa friction est optionnelle, la vôtre obligatoire |
| **Fruitz** | Française, Gen Z, codes d'intention ludiques, **rachetée par Bumble** | Profondeur (Fruitz reste du swipe) | Simplicité virale, exécution marketing — et c'est le modèle de sortie à étudier, pas un rival à mépriser |
| **Boo** | Matching personnalité MBTI, énorme acquisition organique TikTok | Mécanique relationnelle réelle (Boo = quiz + swipe) | Boo a un *hook* viral partageable ; JeuTaime n'a aucun contenu partageable hors de l'app |
| **Once** | Slow dating, 1 match/jour, prouve l'existence de la niche | Boucle quotidienne plus riche | Once avait des millions d'utilisateurs et a quand même plafonné : leçon sur le plafond de la niche |
| **Loveparadiz** | Niche française assumée | Exécution technique très supérieure | Rien de significatif — mais sa non-traction montre que « français + différent » ne suffit pas |

**Ce que JeuTaime fait objectivement mieux que tous** : la mécanique épistolaire (alternance, anti-ghosting, relance, révélation progressive) est la plus aboutie du marché. Personne n'a ce niveau de design relationnel.

**Ce qui manque face à tous** :
1. **Vérification photo/identité** (standard du marché, doublement critique avec des visages cachés)
2. **La voix** : des messages audio révèlent la personnalité mieux que 500 mots et plus vite — c'est l'angle anti-superficiel que personne n'exploite bien et qui réduirait votre time-to-value
3. Un **hook partageable** (le test de Boo, les fruits de Fruitz) pour l'acquisition organique
4. Un **événement synchronisé** créant de la densité (le « ce soir 21h » d'Once)

---

## 10. Verdict final

### Les 10 plus gros risques
1. **Cold start / liquidité** : une app de rencontre vide est morte, peu importe sa qualité (cause de mort n°1 du secteur).
2. **Préférence déclarée vs révélée** : le concept gagne les sondages et perd la rétention — le cimetière Appetence/S'More/Willow en témoigne.
3. **Mineurs + absence totale de vérification d'âge** : risque légal existentiel.
4. **Photos cachées = paradis des romance scams** sans vérification d'identité ni modération des lettres.
5. **Time-to-value en jours** quand le marché le délivre en minutes.
6. **Le Jeu des 3 Questions détruit des matchs**, l'événement le plus précieux du produit.
7. **Aucune capacité d'encaissement** (Stripe stub, IAP Apple/Google non anticipé).
8. **Équation CAC/LTV qui ne ferme pas** en acquisition payante.
9. **Développeur solo sur 53k lignes et 22 modules** : facteur bus, surface de maintenance, dette de processus (historique git en mode panique).
10. **Endpoints de debug exposés** + RGPD incomplet + modération sans back-office.

### Les 10 meilleures idées
1. **Révélation progressive par le flou** (RevealEngine) : récompense visible à chaque lettre — la meilleure version possible du concept.
2. **Anti-ghosting avec relance** : différenciateur réel, marketable, déjà codé et testé.
3. **Alternance obligatoire des lettres** : friction signature qui crée la symétrie d'investissement.
4. **Sourire/Grimace** : plus humain que like/pass, identité de marque.
5. **Salons thématiques** : le bon outil contre le cold start (à condition de les réduire et de les synchroniser).
6. **Salons éphémères** : la rareté temporelle concentre une base faible — sous-exploité.
7. **Limite de discussions simultanées** : anti-zapping cohérent avec la promesse (et levier premium sain).
8. **Boîte à souvenirs** : excellente idée de rétention émotionnelle (à construire — le backend n'existe pas).
9. **L'architecture technique** : modulaire, testée, CI E2E — un actif réel, rare à ce stade.
10. **Le système report/block** déjà sérieux (raisons typées, rate-limit, statuts) — il ne manque que le pilote.

### Note globale : **42/100**
| Dimension | Note | Commentaire |
|---|---|---|
| Concept / différenciation | 11/20 | Original dans l'exécution, mais créneau historiquement mortel |
| Exécution technique | 14/20 | Très au-dessus de la moyenne, entachée par debug/infra/solo |
| Product-market fit potentiel | 6/20 | Friction empilée, time-to-value, fonctionnalités hors mission |
| Monétisation | 4/20 | Prix incohérent, premium contradictoire, encaissement absent |
| Sécurité / conformité | 7/20 | Bon socle technique, gouffre légal (âge, scams, RGPD) |

### Chances de succès
- **Sans modification** : **< 5 %**. Lancée telle quelle, l'app meurt du cold start et du tunnel de friction avant même que les risques légaux aient le temps de frapper.
- **Après corrections** (recentrage, mono-ville, vérifications, pricing) : **10-15 %** d'atteindre une niche durable (50-200k utilisateurs France, rentabilité modeste ou acquisition à la Fruitz). La probabilité de « remplacer Tinder » reste ~0 % et ce n'est pas grave : ce n'est pas le bon objectif.

---

## « Si j'investissais mon propre argent dans JeuTaime aujourd'hui, voici exactement ce que je ferais pendant les 12 prochains mois. »

**Mois 1-2 — Couper et sécuriser (pas une ligne de feature nouvelle).**
Je gèle animaux, mini-jeux, concours, journal, magies, boutique de pièces — soit ~40 % de l'UI. Je supprime les endpoints debug/test. J'implémente : vérification email, blocage 18+, vérification selfie, export/suppression RGPD, back-office de modération minimal avec suspension automatique à N signalements. Je transforme le Jeu des 3 Questions en brise-glace sans échec. J'installe Sentry et un outil d'analytics produit avec 5 métriques au mur : activation J0, time-to-first-letter, sourires mutuels/utilisateur/semaine, D7, D30.

**Mois 3 — Bêta fermée, une seule ville.**
Une métropole étudiante (Lyon ou Lille). 300-500 utilisateurs recrutés à la main : associations étudiantes, campus, Instagram local. Salons réduits à 2, dont un éphémère synchronisé (« ce soir 21h ») pour concentrer l'activité. Objectif unique : que 80 % des inscrits reçoivent une lettre sous 48 h. Pas de premium, pas de paiement — la monétisation d'une app vide est une perte de temps.

**Mois 4-6 — Itérer sur la boucle cœur, rien d'autre.**
Critère de poursuite explicite, écrit, daté : **D30 ≥ 15-20 % et ≥ 3 lettres envoyées par utilisateur actif/semaine**. Tout le travail porte sur le tunnel : onboarding, première heure, notifications de relance, vitesse de révélation des photos (si 10 lettres tue la rétention, je teste 6). J'ajoute *une* seule innovation : les **lettres audio** — la voix est l'arme anti-superficielle la plus rapide et personne ne l'exploite.

**Mois 7-9 — Si les chiffres tiennent : monétiser et densifier. Sinon : pivoter ou arrêter.**
RevenueCat (IAP + web), premium à 5,99 €/mois : slots supplémentaires, 2e relance, accusés de lecture, salon exclusif — **jamais** les photos d'autrui. Extension à une 2e ville seulement quand la première est dense (objectif : 5 000 actifs/ville). PR nationale sur l'angle « l'app française qui vérifie qui vous êtes mais cache votre visage » — la sécurité comme marketing.

**Mois 10-12 — Décision froide.**
Trois issues, critères écrits dès le mois 1 : (a) les cohortes tiennent et la conversion premium dépasse 3 % → je cherche 300-500 k€ pour 3 villes de plus, avec Fruitz/Once comme comparables de sortie ; (b) la rétention tient mais pas la monétisation → je positionne l'actif pour une acquisition (la mécanique épistolaire et l'anti-ghosting sont vendables à un acteur établi) ; (c) D30 < 10 % malgré les itérations → j'arrête, et je réutilise le meilleur actif du projet — l'architecture et le savoir-faire — sur autre chose. **Le pire scénario n'est aucun de ces trois : c'est de passer 12 mois de plus à ajouter des fonctionnalités à une app que personne n'utilise encore.**
