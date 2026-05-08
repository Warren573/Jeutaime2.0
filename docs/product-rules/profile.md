# Règles produit — Profil utilisateur

## 1. Bio (élément principal)

- La bio est la **première chose visible** sur le profil
- Minimum : **50 mots obligatoires** (pas 50 caractères)
- Si < 50 mots → `canMatch = false` + avertissement visible dans l'éditeur
- Mise en avant visuellement : zone principale, lisible immédiatement, avant l'avatar
- Pas de profil vide ou pauvre accepté

## 2. Jeu des 3 questions (obligatoire)

Les questions **ne sont PAS prédéfinies**. Chaque utilisateur écrit les siennes.

Structure :
```
question: string          (texte libre, min 5 caractères)
answers: [A, B, C]        (3 réponses possibles)
correctAnswer: 0 | 1 | 2  (index de la bonne réponse)
```

Backend : stocké dans `ProfileQuestion` avec `questionText String?`.
- Catalog legacy : `questionId = "q_XX"`, `questionText = null` → fallback sur le catalogue
- Questions perso : `questionId = "custom_0/1/2"`, `questionText = "..."` → utilisé directement

Sans 3 questions complètes :
- `canMatch = false`
- Impossible de sourire

## 3. Sections supprimées

Ces sections n'existent plus dans l'éditeur de profil :

| Section supprimée | Raison |
|---|---|
| "Mes petits + et mes petits −" (qualités/défauts) | Ne correspond pas au produit |
| "Mes tags" (identityTags + vibe) | Données de matching invisible, pas pertinentes pour l'édition |

Les champs `identityTags`, `qualities`, `defaults` restent en base mais ne sont plus éditables ni affichés.

## 4. Centres d'intérêt (à garder)

- Section standalone "CENTRES D'INTÉRÊT"
- Format : liste de chips sélectionnables
- Max 8 centres d'intérêt
- Affiché dans le profil public

## 5. Enfants (champ fun)

Question : **"Souhaites-tu avoir des enfants ?"**

Réponses (mappées sur les champs booléens `hasChildren` + `wantsChildren`) :
- "Oui, je veux des enfants 🍼" → wantsChildren = true
- "Non, ça ne changera pas 🙅" → wantsChildren = false
- "Peut-être… on verra 🤷" → wantsChildren = null
- "Je compte me lancer dans l'élevage de pingouins 🐧" → wantsChildren = true (ton fun)
- "Déjà fait ! 😄" → hasChildren = true (via `hasChildren` boolean)

La combinaison `hasChildren` + `wantsChildren` génère le texte affiché dans le profil.

## 6. Compétences (3 exactement)

Champ obligatoire : **exactement 3 compétences**.

Structure :
```
label:  string    (nom, ex: "Cuisine")
emoji:  string    (ex: "🍝")
detail: string    (commentaire fun, max 100 chars)
score:  number    (0-100, par palier de 10)
```

Exemple :
- Cuisine 🍝 — 80% — "Je fais des pâtes, mais avec du style"
- Survie — 40% — "Je sais ouvrir un paquet de chips sans le déchirer"
- Danse — 10% — "Mais avec confiance"

Contraintes :
- Exactement 3 (ni plus, ni moins)
- `detail` obligatoire (commentaire fun)
- `canMatch = false` si < 3 compétences complètes

## 7. Structure du profil (ordre d'affichage)

Ordre **strict** dans le profil public :

1. Bio (mise en avant, première section)
2. Avatar + infos principales (nom, âge, ville, vibe)
3. Centres d'intérêt
4. Compétences (3)
5. Questions (textes des questions, sans les réponses)
6. Enfants / préférences
7. Reste éventuel (journée idéale, progression, lettres si matché)

## 8. Conditions de profil complet (`canMatch = true`)

| Condition | Champ vérifié |
|---|---|
| Bio ≥ 50 mots | `bio.split(' ').filter(Boolean).length >= 50` |
| 3 questions complètes | `apiQuestions.length === 3` |
| Centres d'intérêt remplis | `interests.length > 0` |
| 3 compétences renseignées | `skills.length === 3 && skills.every(s => s.detail.trim())` |

Si non complet :
- `canMatch = false`
- Avertissement dans l'éditeur listant les champs manquants

## 9. UX

- Le profil doit ressembler à un **CV / journal**, pas à un formulaire
- Lecture fluide de haut en bas
- Pas de blocs vides
- Pas de sections inutiles
- Chaque section doit apporter de la personnalité

## 10. Photos — Dévoilement par lettres (sans flou)

### Principe
- Par défaut : seul l'avatar est visible
- La vraie photo est **cachée** (pas floutée)
- Elle se débloque uniquement après échange réel de lettres

### Déblocage standard
- **10 lettres échangées mutuellement** (aller-retour réel)
- Condition : interaction MUTUELLE obligatoire
- Un seul utilisateur ne peut pas débloquer seul

### Déblocage premium
- À définir (premium voit toutes les photos OU seulement ses matchs)
- Ne pas improviser — décision produit à prendre

### Affichage UI
- Photo au même endroit que l'avatar
- Avant déblocage : avatar uniquement + message "Échange encore X lettres pour découvrir sa photo"
- Après déblocage : swipe avatar | photo 1 | photo 2
- Animation légère au moment du déblocage (fade/slide)

### Données nécessaires (MatchDTO / ProfileDTO)
- `lettersExchangedCount`
- `photoUnlocked` (boolean)
- `isPremium`
- `photos[]` (si débloqué)

### Règles
- Pas de flou
- Pas de preview partielle
- Pas de bouton "voir photo" sans avoir les lettres requises
- La photo est une **récompense sociale**, pas un filtre de sélection

## Objectif final

Un profil doit donner envie de :
- Lire
- Répondre
- Jouer aux questions
- Écrire une lettre

Pas juste "matcher".
