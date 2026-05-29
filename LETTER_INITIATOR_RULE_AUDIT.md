# Audit: Règle "Première lettre = Initiateur"

## 1. Où la règle a été définie?

**Fichier**: `backend/src/policies/letterAlternation.ts`

**Code** (ligne 22-28):
```typescript
export function assertCanSendLetter(ctx: AlternationContext): void {
  if (ctx.lastLetterBy === null) {
    // Première lettre : seul l'initiateur
    if (ctx.senderId !== ctx.initiatorId) {
      throw new LetterAlternationError();  // ← ICI
    }
    return;
  }
  // ...
}
```

**Commit d'origine**: Introduit dans PR #79 (mai 2026)
- Aucune documentation métier explicite trouvée dans le commit

---

## 2. Tous les usages de `initiatorId` dans le projet

### Backend (6 fichiers)

#### A. `modules/matches/matches.service.ts`
- **Ligne 312** (acceptMatch) : `if (match.initiatorId === userId) throw ForbiddenError`
  - **But** : Empêcher l'initiateur d'accepter sa propre demande
  - **Phase** : PENDING (avant questions)
  - **Dépendance** : OUI, fonctionnalité critique de l'acceptation

- **Ligne 343** (declineMatch) : `if (match.initiatorId === userId) throw ForbiddenError`
  - **But** : Empêcher l'initiateur de refuser sa propre demande
  - **Phase** : PENDING (avant questions)
  - **Dépendance** : OUI, fonctionnalité critique du refus

#### B. `modules/letters/letters.service.ts`
- **Ligne 103** (sendLetter) : `assertCanSendLetter({ ..., initiatorId: match.initiatorId })`
  - **But** : Vérifier que seul l'initiateur peut envoyer la première lettre
  - **Phase** : ACTIVE + questionsValidated
  - **Dépendance** : OUI, mais peut être modifiée

#### C. `modules/matches/matches.service.ts`
- **Ligne 118** (computeCanSend) : `canSendLetter({ ..., initiatorId: match.initiatorId })`
  - **But** : Calculer si on peut envoyer (UI)
  - **Phase** : ACTIVE + questionsValidated
  - **Dépendance** : OUI, mais peut être modifiée

#### D. `events/index.ts`
- Simple type definition (ne dépend pas de la logique)

#### E. `modules/test/test.routes.ts`
- Seulement pour le debug (dépend de ce qui existe)

### Frontend (1 fichier)

#### `screens/LettersScreen.tsx`
- **Ligne N/A** : `isInitiator={match.initiatorId === (currentUser?.id ?? '')}`
  - **But** : Afficher "En attente" pour initiateur, "Accepter" pour non-initiateur
  - **Phase** : PENDING (status avant acceptation)
  - **Rendu** : 
    ```
    if (matchStatus === PENDING)
      isInitiator ? "⏳ En attente" : "✅ Accepter le match"
    ```
  - **Dépendance** : OUI, mais indépendante de la logique lettres

---

## 3. Analyse des dépendances

### ✅ SAFE À MODIFIER

**Les usages pour acceptMatch/declineMatch** :
- Sont dans la phase PENDING (avant questionsValidated)
- Restent inchangés (non affectés par le changement)
- Reste de la responsabilité de initiatorId

**L'UI du PENDING** :
- Reste inchangée (affiche toujours "En attente" pour initiateur)
- Non affectée par une règle post-questions

### ⚠️ IMPACT ATTENDU

**sendLetter + computeCanSend** :
- Utilisent actuellement initiatorId pour la première lettre
- Pourraient être modifiés pour permettre N'IMPORTE QUI après questionsValidated

---

## 4. Document métier existant?

**Recherche** : Tous les fichiers .md du projet

**Résultat** : AUCUN document explicite trouvant la règle "première lettre = initiateur"

**Conclusion** : La règle a été implémentée sans spécification métier documentée

---

## 5. Proposition de changement

### Règle actuelle
```
if (lastLetterBy === null && senderId !== initiatorId)
  → REJECT (seul initiateur peut envoyer première lettre)
```

### Règle proposée
```
if (questionsValidated === true && lastLetterBy === null)
  → ALLOW (n'importe qui peut envoyer)

if (lastLetterBy !== null && lastLetterBy === senderId)
  → REJECT (pas deux fois de suite - alternation stricte)
```

### Bénéfices
- Utilisateur qui accepte (non-initiateur) peut immédiatement parler
- Pas de blocage artificiel après validation des questions
- Alternation stricte reste sauf pour la première lettre

### Impacte
```
acceptMatch/declineMatch : ✅ Pas affecté (phase PENDING)
LettersScreen UI:         ✅ Pas affecté (phase PENDING)
sendLetter:              ⚠️ Changement logique (phase ACTIVE + questionsValidated)
computeCanSend:          ⚠️ Changement logique (phase ACTIVE + questionsValidated)
```

---

## ✅ Conclusion

**Règle est SAFE À MODIFIER car:**

1. ✅ Aucune documentation métier officielle trouvée
2. ✅ Les usages de acceptMatch/declineMatch restent inchangés
3. ✅ L'UI du match en attente reste inchangée
4. ✅ Seule la logique des lettres APRÈS validation est affectée
5. ✅ Alternation stricte reste appliquée après la première lettre

**Recommandation** : Procéder avec la modification proposée
