# Règles produit — Jeu des 3 questions

## 1. Principe général

Le jeu des 3 questions est **obligatoire après un match**.

Objectif :

- vérifier l'attention portée au profil
- créer une interaction ludique
- éviter les discussions superficielles immédiates
- filtrer les gens qui ne lisent pas

---

## 2. Déclenchement

Le jeu se lance depuis la carte match :

```
Sourire mutuel → Match créé → Jeu des 3 questions
```

Conditions :

- `match.status = ACTIVE`
- `questionsValidated = false`

Sur la carte match : bouton **"🎮 Jouer aux questions"** visible si `!questionsValidated`.

---

## 3. Fonctionnement

Chaque utilisateur répond aux **3 questions écrites par l'autre** :

- A répond aux questions de B
- B répond aux questions de A

---

## 4. Structure d'une question

Chaque question contient :

- texte libre (écrit par l'auteur du profil)
- 3 options (1 bonne réponse + 2 mauvaises, mélangées côté backend)
- 1 bonne réponse définie par l'auteur

> Implémentation : les options sont mélangées par le backend (`shuffle([answer, ...wrongAnswers])`).  
> Si moins de 2 mauvaises réponses → saisie libre (TextInput).

---

## 5. Règle de validation

Pour valider :

- chaque utilisateur répond aux 3 questions de l'autre
- chaque utilisateur doit avoir **au moins 1 bonne réponse sur 3**

```
A ≥ 1 bonne réponse
ET
B ≥ 1 bonne réponse
→ VALIDATION OK → questionsValidated = true
```

---

## 6. Cas d'échec

Si un utilisateur fait 0/3 :

- match cassé (`status: BROKEN`)
- impossible d'écrire des lettres
- message affiché : "L'un de vous n'a pas obtenu au moins 1 bonne réponse. Ce match est terminé."

---

## 7. Accès aux lettres

Les lettres sont débloquées uniquement si `questionsValidated = true`.

Sinon :

- bouton lettres bloqué
- message : **"Joue aux questions pour débloquer les lettres"**

---

## 8. UX du jeu

### Accès

Depuis la carte match → bouton **"🎮 Jouer aux questions"**.

---

### Interface

- afficher **1 question à la fois** avec indicateur de progression (`Question X/3`)
- bouton **Suivant** pour passer à la question suivante (questions 1 et 2)
- bouton **Envoyer mes réponses** uniquement sur la question 3 (ou après avoir répondu aux 3)
- choix A / B / C (ou saisie libre si pas d'options)
- pas de retour en arrière possible

---

### Fin du jeu

Une fois les 3 réponses envoyées :

- afficher : **"Tu as X/3 bonnes réponses"**
- si attente de l'autre : **"En attente de l'autre joueur…"**
- si les deux ont joué et validé : **"🎉 Validé ! Vous pouvez maintenant vous écrire"** + bouton "📬 Écrire une lettre"
- si match cassé : **"💔 Match rompu"**

---

### Règles UX

- pas de correction immédiate de la bonne réponse
- pas de retour sur une question déjà répondue
- garder un peu de mystère jusqu'au résultat final

---

## 9. Synchronisation

| État | Affichage |
|---|---|
| `myStatus = 'submitted'` et autre pas encore | "✅ Déjà répondu — En attente de l'autre joueur…" |
| `waitingForOther = true` (après soumission) | "⏳ En attente de ses réponses" |
| `questionsValidated = true` | "🎉 Validé !" + accès lettres |
| `matchBroken = true` | "💔 Match rompu" |

---

## 10. Données nécessaires

Le frontend reçoit via `GET /matches/:id/questions` :

| Champ | Usage |
|---|---|
| `matchId` | Identifier le match |
| `questions[]` | Questions de l'autre (`questionText`, `options`, `profileQuestionId`) |
| `myStatus` | `"pending"` ou `"submitted"` |
| `myScore` | Score si `"submitted"` |
| `questionsValidated` | Questions déjà validées pour ce match |

Après soumission (`POST /matches/:id/answers`) :

| Champ | Usage |
|---|---|
| `myScore` | Score obtenu |
| `passed` | A réussi (≥1/3) |
| `questionsValidated` | Les deux ont validé |
| `waitingForOther` | L'autre n'a pas encore joué |
| `matchBroken` | Match cassé (un 0/3) |

---

## 11. Règles importantes

- pas de skip — toutes les questions doivent être répondues avant envoi
- pas de modification après soumission
- pas de triche — la bonne réponse n'est jamais exposée côté frontend
- pas d'accès aux lettres avant validation

---

## 12. Objectif produit

Créer :

- une première interaction intelligente
- une validation de compatibilité légère
- une transition naturelle vers les lettres

---

## 13. Tonalité

Le jeu doit être :

- fun
- léger
- pas scolaire
- pas trop long

---

## 14. Flow global

```
Match
→ Jeu des 3 questions (1 question à la fois)
→ Validation (≥1/3 pour chacun)
→ Lettres débloquées
→ Photo débloquée après X lettres
```

---

## Résumé

Le jeu des 3 questions est :

- un filtre doux
- un brise-glace
- un test d'attention

Pas un quiz académique.
