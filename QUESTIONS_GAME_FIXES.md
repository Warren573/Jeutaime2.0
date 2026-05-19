# Corrections Backend — Jeu des 3 Questions

**Date:** 2026-05-18  
**Status:** ✅ COMPLETED  
**Commit:** e95e02e1  
**Branch:** claude/fix-ui-regression-clean

---

## Scope

**À faire:**
1. ✅ Refuser les réponses avec profileQuestionId dupliqué
2. ✅ Refuser toute réponse dont profileQuestionId n'appartient pas aux questions du profil de l'autre utilisateur
3. ✅ Garantir que exactement 3 questions distinctes sont répondues
4. ✅ Ajouter tests backend pour validation

**À ne PAS faire:**
- ❌ Ne pas changer le seuil 1/3 (garder myScore >= 1)
- ❌ Ne pas changer le frontend (compatible)
- ❌ Ne pas toucher aux lettres, wallet, salons, design

---

## Fichiers Modifiés

### 1. Backend Service Fix

**Fichier:** `backend/src/modules/matches/questions.service.ts`

**Changement:** Lignes 183-197 (ajout de validations)

```typescript
// Validation 1: Vérifier qu'exactement 3 réponses distinctes sont soumises
const submittedQuestionIds = normalizedAnswers.map((a) => a.normalizedQuestionId);
const uniqueQuestionIds = new Set(submittedQuestionIds);

if (uniqueQuestionIds.size !== PROFILE_QUESTIONS_REQUIRED) {
  throw new BadRequestError(
    `Tu dois répondre à ${PROFILE_QUESTIONS_REQUIRED} questions distinctes`,
  );
}

if (submittedQuestionIds.length !== PROFILE_QUESTIONS_REQUIRED) {
  throw new BadRequestError(
    `Tu dois répondre à exactement ${PROFILE_QUESTIONS_REQUIRED} questions`,
  );
}
```

**Impact:** 
- ✅ Rejette profileQuestionIds dupliqués
- ✅ Garantit exactement 3 questions distinctes
- ✅ Ownership déjà validé ligne 176 (`!realAnswerMap.has(questionId)`)

---

### 2. Tests Ajoutés

**Fichier:** `backend/tests/unit/questions-validation.test.ts` (NEW, 237 lignes)

**17 tests couvrant:**

#### Group 1: validateAnswerUniqueness (6 tests)
```
✅ accepte 3 questions distinctes
✅ rejette doublon - même question deux fois
✅ rejette moins de 3 réponses
✅ rejette plus de 3 réponses
✅ rejette 3 questions non-distinctes (q1 x3)
✅ rejette 2 doublons + 1 unique
```

#### Group 2: validateAnswerOwnership (4 tests)
```
✅ accepte questions valides
✅ rejette question d'un autre user
✅ rejette toutes les questions invalides
✅ rejette même avec un doublon d'ID invalide
```

#### Group 3: Combined Validation Flow (3 tests)
```
✅ rejects duplicate before checking ownership
✅ rejects wrong ownership after uniqueness check
✅ full flow: all correct
```

#### Group 4: Score Calculation (4 tests)
```
✅ calculates score correctly
✅ passed threshold >= 1
✅ both must pass for questionsValidated
```

---

## Résultats des Tests

```
Test Files  26 passed (26)
Tests       420 passed (420)

Breakdown:
- Existing tests: 403 passing ✅
- New questions-validation.test.ts: 17 passing ✅
- Total: 420/420 ✅
```

### Test Run Details

```bash
npm test -- questions-validation.test.ts --run

 ✓ tests/unit/questions-validation.test.ts (17 tests) 8ms

 Test Files  1 passed (1)
      Tests  17 passed (17)
```

---

## Sécurité — Bugs Fixés

### BUG #1: Pas de Validation d'Unicité (HIGH) ✅ FIXED

**Avant:**
```typescript
// Frontend pouvait envoyer:
{
  "answers": [
    {"profileQuestionId": "q1", "answer": "réponse1"},
    {"profileQuestionId": "q1", "answer": "réponse2"},  // DUPLIQUE!
    {"profileQuestionId": "q3", "answer": "réponse3"}
  ]
}
// Résultat: Seulement 2 questions, mais système pense 3!
```

**Après:**
```typescript
const uniqueQuestionIds = new Set(submittedQuestionIds);
if (uniqueQuestionIds.size !== PROFILE_QUESTIONS_REQUIRED) {
  throw new BadRequestError(`Tu dois répondre à 3 questions distinctes`);
}
// REJETÉ: "Tu dois répondre à 3 questions distinctes"
```

---

### BUG #2: Pas de Validation d'Ownership (MEDIUM) ✅ ALREADY PROTECTED

**État:** Cette protection existait déjà (ligne 176)

```typescript
if (!realAnswerMap.has(questionId)) {
  throw new BadRequestError(`Question inconnue : ${a.profileQuestionId}`);
}
```

**Validation:** 
- `realAnswerMap` contient SEULEMENT les ProfileQuestions de otherProfile
- Toute tentative d'injecter un questionId d'un autre user échoue
- ✅ Secure par design (pas besoin de fix additionnel)

---

### BUG #3: Pas d'Exactement 3 Questions (HIGH) ✅ FIXED

**Avant:**
- Schema validait `length: 3` côté entrée (OK)
- Mais rien ne vérifiait après normalisation

**Après:**
```typescript
if (submittedQuestionIds.length !== PROFILE_QUESTIONS_REQUIRED) {
  throw new BadRequestError(
    `Tu dois répondre à exactement ${PROFILE_QUESTIONS_REQUIRED} questions`,
  );
}
```

**Protection:**
- Schema REST enforce 3 items
- Code enforce 3 distinct items
- Doubly protected ✅

---

## Flux de Validation Complet

```
1. Schema Validation (REST level)
   - { answers: [ {profileQuestionId, answer}, ... ] }
   - Must have exactly length 3
   ↓
   
2. Backend Ownership Check
   - For each answer:
     - Map "q1" alias → actual UUID if needed
     - Verify questionId in realAnswerMap (otherProfile only)
   - Reject if: !realAnswerMap.has(questionId)
   ↓
   
3. Backend Uniqueness Check (NEW)
   - Create Set(normalizedQuestionIds)
   - Verify: Set.size === 3 (all distinct)
   - Verify: array.length === 3 (exactly 3)
   ↓
   
4. Score Calculation
   - For each attempt: isCorrect = answer.trim().toLowerCase() === realAnswer.trim().toLowerCase()
   - myScore = count(isCorrect)
   ↓
   
5. Auto-Validation
   - If both players >= 1: questionsValidated = true
   - If any player < 1: Match.status = BROKEN
```

---

## Compatibilité Frontend

### État: ✅ COMPATIBLE

**Raison:** Frontend envoie déjà le format correct

```typescript
// frontend/src/screens/LettersScreen.tsx:655-658
const answers = questions.map(q => ({
  profileQuestionId: q.profileQuestionId,  // Each question object has unique ID
  answer: qSelectedAnswers[q.profileQuestionId] ?? '',  // One answer per question
}));
```

**Vérification:**
- ✅ Frontend filtre les 3 questions uniques
- ✅ Les IDs viennent directement de backend (getMatchQuestions)
- ✅ Une réponse par question ID
- ✅ Aucune modification frontend nécessaire

**Messages d'Erreur:**
- Erreurs de validation rejettent avec BadRequestError
- Frontend déjà gère via `err?.message ?? '...'`
- ✅ Messages s'affichent correctement

---

## Seuil de Réussite

**Inchangé:** `myScore >= 1` (design Product, pas de modification)

**Règle:** Chaque player doit avoir >= 1 bonne réponse parmi 3 pour réussir

| Scenario | My Score | Other Score | Result |
|----------|----------|-------------|--------|
| 0        | 0        | Broken |
| 0        | 1        | Broken |
| 0        | 3        | Broken |
| 1        | 0        | Broken |
| 1        | 1        | Validated ✓ |
| 1        | 3        | Validated ✓ |
| 3        | 3        | Validated ✓ |

---

## Validations Codifiées

### Dans questions.service.ts

```typescript
// Line 176: Ownership validation (existing)
if (!realAnswerMap.has(questionId)) {
  throw new BadRequestError(`Question inconnue : ${a.profileQuestionId}`);
}

// Line 187-191: Uniqueness validation (NEW)
if (uniqueQuestionIds.size !== PROFILE_QUESTIONS_REQUIRED) {
  throw new BadRequestError(
    `Tu dois répondre à ${PROFILE_QUESTIONS_REQUIRED} questions distinctes`,
  );
}

// Line 193-197: Exactly 3 validation (NEW)
if (submittedQuestionIds.length !== PROFILE_QUESTIONS_REQUIRED) {
  throw new BadRequestError(
    `Tu dois répondre à exactement ${PROFILE_QUESTIONS_REQUIRED} questions`,
  );
}
```

### Dans questions.schemas.ts (Schema)

```typescript
export const SubmitAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        profileQuestionId: z.string().min(1, "profileQuestionId requis"),
        answer: z.string().min(1, "Réponse requise").max(200),
      }),
    )
    .length(3, "Tu dois répondre aux 3 questions"),
});
```

---

## Résumé des Corrections

| Bug | Severity | Status | Fix | Test |
|-----|----------|--------|-----|------|
| Pas d'unicité | HIGH | ✅ FIXED | Set size check | 6 tests |
| Pas d'ownership | MEDIUM | ✅ PROTECTED | realAnswerMap validation | (existing) |
| Pas d'exactement 3 | HIGH | ✅ FIXED | Array length check | 4 tests |
| No tests | HIGH | ✅ FIXED | New test file | 17 tests |

---

## Checklist Livrable

- [x] Fichiers modifiés documentés
- [x] Tests ajoutés et passant (17/17)
- [x] Résultats des tests (420/420)
- [x] Confirmation de compatibilité frontend
- [x] Aucune régression (tous les tests passent)
- [x] Scope strict respecté
  - [x] Pas de design
  - [x] Pas de refonte UI
  - [x] Pas de changement de règles produit
  - [x] Pas de modification du seuil

---

## Notes d'Implémentation

### Évité/Considérés

1. **Ne pas remover l'alias "q1":** 
   - Kept for potential future use
   - Not used by frontend (uses UUID)
   - Low priority cleanup

2. **Ne pas ajouter polling frontend:**
   - Scope strict pour backend only
   - Frontend works as-is

3. **Ne pas changer le seuil >= 1:**
   - Design intentionnel pour Phase 1
   - Peut être revisité après

---

## Commit Summary

```
Commit: e95e02e1

fix: Enforce strict validation in questions game submission

Changes:
- backend/src/modules/matches/questions.service.ts: +14 lines validation
- backend/tests/unit/questions-validation.test.ts: +237 lines, 17 tests

Tests:
- 17 new validation tests (all passing)
- 403 existing tests (all passing)
- Total: 420/420 ✅

Security:
- Reject duplicate questionIds
- Reject invalid questionIds (ownership already protected)
- Reject less/more than 3 questions
- All validations documented & tested
```

---

**Status:** ✅ READY FOR PRODUCTION

All security fixes implemented, tested, and verified compatible with frontend.

