# Audit complet — Système Profil / Découverte / Match

Date: 2026-05-11

## 1) Cartographie réelle des écrans/route actifs

### Découverte (tab profiles)
- Route Expo: `frontend/app/(tabs)/profiles.tsx`
- Composant réellement monté: `ProfileTwoStepDemo` (`frontend/src/screens/ProfileTwoStepDemo.tsx`)
- Donc la découverte active passe par le flow « carte courte + bouton voir plus » implémenté dans `ProfileTwoStepDemo`.

### Profil complet (voir plus)
- `ProfileTwoStepDemo` pousse vers `/profile/[id]`.
- Route: `frontend/app/profile/[id].tsx`
- Composant réellement monté: `ProfileDetailScreen` (`frontend/src/screens/ProfileDetailScreen.tsx`).

### Espace match / lettres
- Route match: `frontend/app/match-profile.tsx`.
- Accessible depuis `LettersScreen`.
- Cet écran réintroduit un ancien flow progressif (niveaux + sections verrouillées) en parallèle du profil complet.

### Onboarding questions
- Route: `frontend/app/setup-questions.tsx`.
- Création de 3 questions utilisateur + 3 options par question + bonne réponse.
- Persisté via `PUT /profiles/me/questions`.

## 2) Composants/flows legacy encore présents et en conflit

## A. Ancien profil journal “en mode découverte” encore présent
- `frontend/src/screens/ProfilesScreen.tsx` contient:
  - un gros dataset mock local `const profiles`;
  - une mise en page « journal complet »;
  - des sections game/letters/progression non alignées avec la carte courte officielle.
- Ce composant n’est plus la route tab active, mais reste dans le repo et peut être réutilisé par erreur (tech debt + ambiguïté).

## B. Ancien profil progressif / sections verrouillées encore affiché
- `frontend/app/match-profile.tsx` affiche explicitement:
  - `LockedSection`;
  - textes: « Débloqué au niveau 2 », « Continuez à échanger des lettres », « Révélé après 10 lettres chacun »;
  - gating conditionnel par `revealLevel` sur sections entières (questions, journée idéale, qualités/défauts, anecdote).
- C’est exactement le comportement interdit par la logique produit officielle pour le profil complet.

## C. Anciennes “questions prédéfinies” encore dans le backend
- `backend/src/config/questions.ts` expose `QUESTION_CATALOG` (questions statiques prédéfinies).
- Le commentaire de mapping dans `ProfileDetailScreen` indique encore un mélange possible « user-written ou catalogue ».
- Conséquence: risque de réapparition d’anciennes questions si une voie backend continue de résoudre `questionId` via catalogue.

## 3) Pourquoi plusieurs profils différents s’affichent

Cause principale: coexistence de **3 représentations UI** du profil.

1. `ProfileTwoStepDemo` (découverte courte officielle)
2. `ProfileDetailScreen` (profil complet journal)
3. `match-profile.tsx` (profil progressif relationnel avec locks)

En plus, `ProfilesScreen.tsx` (legacy) maintient un 4e modèle visuel et de données (mock + journal-like découverte), ce qui multiplie les divergences quand il est testé/localement réactivé.

## 4) Pourquoi les anciennes questions réapparaissent

- Backend garde `QUESTION_CATALOG` prédéfini.
- Frontend match-profile affiche bloc « SES 3 QUESTIONS » avec fallback statique `Question à venir…`.
- `ProfileDetailScreen` consomme `p.questions` sans imposer explicitement “user-authored only”.

Donc selon la source (`matchPartners`, `public profile`, seeds/migrations, ou fallback), on peut voir:
- questions utilisateur,
- placeholders,
- ou anciennes questions cataloguées.

## 5) Pourquoi des sections verrouillées apparaissent encore

- `match-profile.tsx` fait du gating volontaire via:
  - `revealLevel >= 2` / `>= 3`;
  - `hasUnlockedPhoto`;
  - rendu alternatif `LockedSection`.
- `RelationEngine` + progression lettres servent à piloter ce rendu.

Ce mécanisme est cohérent avec un ancien design RPG/progressif, mais en conflit avec la règle officielle “profil complet consultable directement”.

## 6) Routes / imports / conditions à nettoyer

### Routes qui entraînent l’ancien flow
- `/match-profile` → `frontend/app/match-profile.tsx` (legacy progressif)

### Imports/composants à risque (legacy non source de vérité)
- `frontend/src/screens/ProfilesScreen.tsx` (mock + ancien design découverte journal complet)
- `backend/src/config/questions.ts` (catalogue prédéfini)

### Conditions/flags legacy identifiés
- `revealLevel` gating sections dans `match-profile.tsx`
- `LockedSection` rendu conditionnel
- placeholders questions `Question à venir…`

### Données mock encore présentes
- `const profiles` hardcodé dans `ProfilesScreen.tsx`
- avatars mock associés (`MOCK_PROFILE_AVATARS`) dans ce flux legacy

## 7) Source unique de vérité recommandée

### Source unique UI
- Découverte: `ProfileTwoStepDemo`
- Profil complet: `ProfileDetailScreen`

### Source unique Questions
- Questions écrites par les utilisateurs uniquement (via `setup-questions` + API match questions), sans fallback catalogue prédéfini côté affichage.

### Route cible
- Le bouton “Voir plus” doit continuer d’ouvrir `/profile/[id]` (`ProfileDetailScreen`) et **pas** l’écran `match-profile` pour lire le profil.

## 8) Plan de nettoyage minimal (sans réinventer la logique produit)

1. **Isoler legacy sans casser prod**
   - Marquer `ProfilesScreen.tsx` comme deprecated (ou déplacer dossier legacy).
   - Vérifier qu’aucune route active n’importe ce composant.

2. **Retirer les locks du profil consultable**
   - Sur `match-profile.tsx`, supprimer/neutraliser `LockedSection` et conditions `revealLevel` pour les sections profil.
   - Conserver uniquement les règles lettres/photo qui sont explicitement métier (ex: reveal photo après 10 lettres chacun), sans bloquer le texte du profil.

3. **Éliminer le risque de questions prédéfinies**
   - Débrancher l’usage runtime de `QUESTION_CATALOG` pour le produit principal.
   - Afficher uniquement les questions user-authored récupérées via endpoints match/profile pertinents.

4. **Unifier les modèles de données profil**
   - Alignement `matchPartners` / `PublicProfileResponse` sur les mêmes champs de rendu journal.
   - Supprimer fallback placeholder non produit (“Question à venir…”).

5. **Validation de non-régression**
   - Parcours manuel: découverte → voir plus → profil complet (sans lock)
   - Parcours match mutuel: jeu des 3 questions **avant** lettres
   - Parcours lettres: alternance + reveal photo après 10/10.

## 9) Liste concise “supprimer / fusionner / garder”

### À supprimer (ou désactiver)
- Affichage lockés du profil dans `match-profile.tsx`
- Fallbacks questions placeholder côté profil
- Catalogue questions prédéfinies en usage produit

### À fusionner / unifier
- Modèles de rendu profil entre `match-profile` et `ProfileDetailScreen`
- Source des questions autour d’un seul flux user-authored

### À garder comme source de vérité
- `ProfileTwoStepDemo` pour découverte
- `ProfileDetailScreen` pour profil complet journal
- `setup-questions` + endpoints match questions pour la phase post-match
