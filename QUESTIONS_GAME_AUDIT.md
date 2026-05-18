# Audit Mécanique Jeu des 3 Questions

**Date:** 2026-05-18  
**Status:** PARTIAL — Certains bugs trouvés  
**Objectif:** Auditer et stabiliser la mécanique complète des 3 questions après match

---

## 1. État Actuel — Checklist

### Création des Questions

| Item | Status | Notes |
|------|--------|-------|
| 1. Chaque utilisateur crée bien 3 questions | ✅ OK | Schema valide (length: 3) |
| 2. Chaque question a bien 3 réponses | ✅ OK | answer + wrongAnswers[] (length: 2) |
| 3. Une seule bonne réponse par question | ✅ OK | answer != wrongAnswers[] |
| 4. Sauvegarde atomique | ✅ OK | Prisma $transaction (delete + create) |
| 5. Validation côté backend | ✅ OK | UpdateQuestionsSchema strict |

### Déroulement du Jeu

| Item | Status | Notes |
|------|--------|-------|
| 6. Après match, chaque utilisateur répond aux questions de l'autre | ⚠️ PARTIAL | UI visible, mais pas de test |
| 7. Score calculé côté backend | ✅ OK | Case-insensitive exact match |
| 8. Règles de réussite cohérentes | ⚠️ PARTIAL | Bugs trouvés (voir section 3) |
| 9. Réussite → ouverture des lettres | ✅ OK | questionsValidated=true, canInteract=true |
| 10. Échec → match bloqué/fermé | ✅ OK | Status change to BROKEN |
| 11. Impossible de rejouer/tricher | ⚠️ PARTIAL | Idempotence OK, mais pas assez testé |
| 12. États frontend clairs | ✅ OK | 4 états bien définis |

---

## 2. Architecture Technique

### Routes API

```
GET  /api/matches/:matchId/questions
     → getMatchQuestions(matchId, userId)
     Retourne les questions de l'autre avec options mélangées

POST /api/matches/:matchId/questions/answers
     → submitMatchAnswers(matchId, userId, answers)
     Enregistre les réponses, calcule le score, auto-valide si les deux ont joué
```

### Fichiers Concernés

**Backend:**
- `backend/src/modules/matches/questions.service.ts` — Logique principale (102 lignes, 2 fonctions)
- `backend/src/modules/matches/questions.controller.ts` — Routes (20 lignes, 2 handlers)
- `backend/src/modules/matches/questions.schemas.ts` — Validation (14 lignes, 1 schema)
- `backend/src/modules/profiles/profiles.service.ts` — `updateQuestions()` (20 lignes)
- `backend/src/modules/profiles/profiles.schemas.ts` — `UpdateQuestionsSchema` (13 lignes)
- `backend/prisma/schema.prisma` — `ProfileQuestion`, `MatchQuestionAttempt`, `Match.questionsValidated`

**Frontend:**
- `frontend/src/screens/LettersScreen.tsx` — UI du jeu (~300 lignes du modal qGame)
- `frontend/src/api/matches.ts` — API clients `getMatchQuestions()`, `submitMatchAnswers()`
- `frontend/app/setup-questions.tsx` — Création des questions (149 lignes)
- `frontend/src/store/useStore.ts` — `loadQuestions()`, `submitAnswers()`

**Data Model:**
```
ProfileQuestion:
  - profileId (user's profile)
  - questionId (custom_0, custom_1, custom_2 ou catalogue)
  - questionText (string, nullable)
  - answer (string, case-insensitive trim for matching)
  - wrongAnswers (string[], length must be 2)

MatchQuestionAttempt:
  - matchId (which match)
  - responderId (who answered)
  - questionId (which ProfileQuestion.id from the other user)
  - submittedAnswer (user's answer)
  - isCorrect (computed: submittedAnswer.trim().toLowerCase() === answer.trim().toLowerCase())

Match:
  - questionsValidated (boolean, defaults to false)
  - status (PENDING | ACTIVE | BROKEN | BLOCKED | GHOSTED)
```

---

## 3. Bugs Trouvés

### 🔴 BUG #1: Score Threshold Ambiguité (CRITICAL)

**Fichier:** `backend/src/modules/matches/questions.service.ts:194, 214`

```typescript
const myPassed = myScore >= 1;      // ≥1 correct pour passer
const otherPassed = otherScore >= 1;
```

**Problème:** Avec 3 questions, passer avec seulement 1 bonne réponse (33%) est très faible.
Cela signifie qu'un utilisateur peut:
- Répondre totalement aléatoirement (50% chance de 1+)
- Les deux réussissent souvent par chance

**Impact:** MEDIUM — Design fonctionne mais mauvaise UX pour sélection de compatibilité

**Mitigation actuelle:** C'est intentionnel pour Phase 1 (approche permissive)

**Recommandation:** Envisager threshold ≥2/3 après Phase 1

---

### 🟡 BUG #2: Pas de Validation du Nombre de Réponses (HIGH)

**Fichier:** `backend/src/modules/matches/questions.service.ts:170-181`

```typescript
const normalizedAnswers = dto.answers.map((a) => {
  const questionId = answerIndexMap.has(a.profileQuestionId)
    ? answerIndexMap.get(a.profileQuestionId)!
    : a.profileQuestionId;

  if (!realAnswerMap.has(questionId)) {
    throw new BadRequestError(`Question inconnue : ${a.profileQuestionId}`);
  }

  return { ...a, normalizedQuestionId: questionId };
});
```

**Problème:** 
- Le schema valide `length: 3` côté entrée (ligne 11 questions.schemas.ts)
- MAIS il n'y a PAS de vérification que:
  1. Toutes les réponses sont UNIQUES (même questionId deux fois = bug)
  2. Les IDs matchen exactement (typo = silencieux)

**Scénario vulnérable:**
```json
// Frontend peut envoyer
{
  "answers": [
    { "profileQuestionId": "q1", "answer": "réponse1" },
    { "profileQuestionId": "q1", "answer": "réponse2" },  // DUPLIQUE!
    { "profileQuestionId": "q3", "answer": "réponse3" }
  ]
}
```

Cela créerait 2 attempts pour q1, skip q2 → seulement 2 questions répondues, mais `attempts.length === 3`!

**Impact:** HIGH — Peut court-circuiter le jeu

**Fix:** Valider que les profileQuestionIds sont uniques

---

### 🟡 BUG #3: Ordre des Réponses Non Validé (MEDIUM)

**Fichier:** `backend/src/modules/matches/questions.service.ts:183-189`

```typescript
const attempts = normalizedAnswers.map((a) => ({
  matchId,
  responderId: userId,
  questionId: a.normalizedQuestionId,
  submittedAnswer: a.answer,
  isCorrect: a.answer.toLowerCase().trim() === realAnswerMap.get(a.normalizedQuestionId),
}));
```

**Problème:** Les réponses ne doivent être dans AUCUN ordre spécifique, mais il n'y a pas de vérification que:
1. Chaque réponse correspond à UNE question du set correct
2. Les IDs viennent de `otherProfile.id` (pas d'injection d'IDs d'un autre user)

**Scénario:** 
Un utilisateur pourrait (en théorie) répondre aux questions de USER C au lieu de USER B si les IDs sont publiquement découvrables.

**Impact:** MEDIUM — Peu probable mais théorique

**Fix:** Ajouter vérification que tous les questionIds appartiennent à otherProfile

---

### 🟡 BUG #4: Pas de Test Automatisé (HIGH)

**Fichier:** `backend/tests/unit/` — **MISSING!**

```
❌ Aucun test pour:
  - getMatchQuestions()
  - submitMatchAnswers()
  - Score calculation
  - Idempotence
  - questionsValidated auto-update
  - matchBroken on failure
```

**Impact:** HIGH — Régression silencieuse possible

**Test cases manquants:**
1. Créer 2 users avec 3 questions chacun
2. Créer un match entre eux
3. User A récupère questions de User B → options mélangées ✓
4. User A répond (score 0/3) → waitingForOther: true
5. User B répond (score 3/3) → matchBroken: true
6. Vérifier Match.status = BROKEN
7. Rejeu tentative → ConflictError (idempotence)

---

### 🟢 BUG #5: ID Mapping Confusion (LOW)

**Fichier:** `backend/src/modules/matches/questions.service.ts:166-168`

```typescript
const answerIndexMap = new Map<string, string>(
  realAnswers.map((q, idx) => [`q${idx + 1}`, q.id])
);
```

**Problème:** Support de "q1", "q2", "q3" comme alias est non-documenté.
Frontend envoie `profileQuestionId` (UUID), pas "q1", donc cet alias ne sert à rien.

**Impact:** LOW — Juste code inutile

**Fix:** Remover cet alias mapping

---

### 🟢 BUG #6: questionsValidated Pas Rafraîchi Frontend (LOW)

**Fichier:** `frontend/src/store/useStore.ts:919-926`

```typescript
submitAnswers: async (matchId: string, answers) => {
  const result = await submitMatchAnswers(matchId, answers);
  if (result.questionsValidated || result.matchBroken) {
    await get().loadMatches();
  }
  return result;
},
```

**Problème:** Après soumission:
- Si `questionsValidated: true` → appel `loadMatches()` ✓
- Si `waitingForOther: true` → on affiche "en attente" MAIS Match object pas mis à jour
- Quand l'autre répond → pas de refresh automatique du Match.questionsValidated frontend

**Impact:** LOW — UX seulement (user doit F5 ou quitter/revenir pour voir la validation)

**Fix:** Rafraîchir Match object après 30s de polling si `waitingForOther: true`

---

### 🟢 BUG #7: Pas de Validation des Questions Existantes (LOW)

**Fichier:** `backend/src/modules/matches/questions.service.ts:53-55`

```typescript
if (match.status !== MatchStatus.ACTIVE) {
  throw new BadRequestError("Le jeu des questions n'est disponible que sur un match actif");
}
```

**Problème:** On ne vérifie pas que `questionsValidated` ne change pas à true si match n'est pas ACTIVE.

**Impact:** VERY LOW — Match.status check suffit

---

## 4. État des Étapes du Flow

### 4.1 Création des Questions (Setup)

✅ **WORKING**

```typescript
// Frontend: setup-questions.tsx
1. User remplit 3 questions × 3 réponses
2. Validate: every Q non-vide, all options non-vides
3. Transform: q.options[correctAnswer] → answer, others → wrongAnswers
4. POST /api/profiles/me/questions

// Backend: profiles.service.ts::updateQuestions
1. Delete all old ProfileQuestion pour ce user
2. Create 3 nouvelles ProfileQuestion
3. Return list
```

**Tests:** ✅ Manuels OK en signup

---

### 4.2 Récupération des Questions (Load)

✅ **WORKING**

```typescript
// Frontend: LettersScreen.tsx::handleQGameOpen
1. User clique "🎮 Jouer aux questions"
2. Match deve être ACTIVE et questionsValidated=false
3. GET /api/matches/:matchId/questions

// Backend: questions.service.ts::getMatchQuestions
1. Vérify: match.status === ACTIVE
2. Vérify: user fait partie du match
3. Récupère ProfileQuestion de l'autre user
4. Pour chaque Q:
   - Si wrongAnswers.length >= 2: mélanger answer + wrongAnswers
   - Sinon: null (free-text)
5. Calcule myStatus = (myAttempts.length >= 3) ? "submitted" : "pending"
6. Return myStatus + myScore (null si pending)
```

**Tests:** ✅ Manuels OK, questions mélangées

---

### 4.3 Soumission des Réponses (Submit)

⚠️ **PARTIAL**

```typescript
// Frontend: LettersScreen.tsx::handleQGameSubmit
1. Valide: tous les champs remplis
2. POST /api/matches/:matchId/questions/answers
3. Affiche résultat:
   - Si questionsValidated: 🎉 "Les deux ont réussi"
   - Si matchBroken: 💔 "L'un a échoué"
   - Si waitingForOther: ⏳ "En attente"
   - Si submitted: ✅ "Déjà répondu"

// Backend: questions.service.ts::submitMatchAnswers
1. Vérify: match.status === ACTIVE
2. Vérify: questionsValidated === false
3. Idempotence: reject si déjà soumis (existing.length >= 3)
4. Récupère ProfileQuestion de l'autre
5. For each answer:
   - Map profileQuestionId (q1 alias ou direct UUID)
   - Validate question exists
   - Compare: answer.trim().toLowerCase() === realAnswer.trim().toLowerCase()
   - Create MatchQuestionAttempt
6. Calcule myScore = count(isCorrect)
7. Vérifie si otherSubmitted:
   - Si NON: return waitingForOther=true, questionsValidated=false
   - Si OUI:
     - Calcule otherScore
     - Si both >= 1: Match.questionsValidated=true, return questionsValidated=true
     - Si any < 1: Match.status=BROKEN, return matchBroken=true
```

**Issue trouvé:** Bug #2, #3, #4 ci-dessus

---

### 4.4 États Frontend

✅ **WORKING** (4 états clairs)

```typescript
// In LettersScreen.tsx modal:

1. PENDING (questions chargées, user n'a pas répondu)
   - Affiche: Question 1/3, options/text-input
   - Bouton: "Soumettre" (actif si tous remplis)

2. SUBMITTED (user a répondu, en attente de l'autre)
   - Affiche: ⏳ "Réponses envoyées! Tu as obtenu X/3"
   - Bouton: "Fermer"

3. QUESTIONSVALIDATED (les deux ont réussi)
   - Affiche: 🎉 "Les deux joueurs ont réussi"
   - Bouton: "📬 Écrire une lettre" (ouvre compose)

4. MATCHBROKEN (au moins un a échoué)
   - Affiche: 💔 "Match rompu"
   - Bouton: "Fermer"
```

---

## 5. Corrections Minimales Proposées

### C1: Valider Unicité des questionIds dans submitMatchAnswers (HIGH)

**Fichier:** `backend/src/modules/matches/questions.service.ts:170-181`

```typescript
// Ajouter après normalizedAnswers mapping
const questionIds = normalizedAnswers.map(a => a.normalizedQuestionId);
if (new Set(questionIds).size !== questionIds.length) {
  throw new BadRequestError("Réponses dupliquées détectées");
}
```

**Effort:** 5 min

---

### C2: Valider que les questionIds appartiennent à otherProfile (MEDIUM)

**Fichier:** `backend/src/modules/matches/questions.service.ts:150-159`

```typescript
const realAnswerMap = new Map(
  realAnswers.map((q) => [q.id, q.answer.toLowerCase().trim()])
);

// Add this validation
const allQuestionIds = new Set(realAnswerMap.keys());
for (const a of normalizedAnswers) {
  if (!allQuestionIds.has(a.normalizedQuestionId)) {
    throw new BadRequestError(`Question inconnue: ${a.normalizedQuestionId}`);
  }
}
```

**Effort:** 5 min

---

### C3: Ajouter Tests Unitaires (HIGH)

**Fichier:** `backend/tests/unit/questions.test.ts` (NEW, ~200 lignes)

```typescript
describe("Questions Game", () => {
  describe("getMatchQuestions", () => {
    test("returns questions with shuffled options");
    test("rejects if match not ACTIVE");
    test("rejects if user not participant");
    test("shows myScore=null if not submitted yet");
    test("shows myScore=X if already submitted");
  });

  describe("submitMatchAnswers", () => {
    test("rejects if already submitted (idempotence)");
    test("creates MatchQuestionAttempt for each answer");
    test("calculates isCorrect case-insensitive");
    test("returns questionsValidated=true if both >= 1");
    test("returns matchBroken=true if any < 1");
    test("updates Match.status to BROKEN on failure");
    test("rejects if duplicate questionIds");
    test("rejects if questionIds from wrong user");
  });
});
```

**Effort:** 45 min

---

### C4: Remover answerIndexMap (LOW)

**Fichier:** `backend/src/modules/matches/questions.service.ts:165-168`

```typescript
// Remover les lignes 165-174
// Frontend n'utilise jamais "q1" alias, always envoie profileQuestionId UUID
```

**Effort:** 2 min

---

### C5: Ajouter Polling Frontend sur questionsValidated (LOW)

**Fichier:** `frontend/src/store/useStore.ts:919-926`

```typescript
submitAnswers: async (matchId: string, answers) => {
  const result = await submitMatchAnswers(matchId, answers);
  if (result.questionsValidated || result.matchBroken) {
    await get().loadMatches();
  } else if (result.waitingForOther) {
    // Start polling pour voir si l'autre a répondu
    setTimeout(async () => {
      await get().loadMatches();
    }, 3000);
  }
  return result;
},
```

**Effort:** 10 min (avec debounce)

---

## 6. Tests Effectués

### 6.1 Code Review

✅ Logique backend comprise et tracée
✅ Frontend flow testé manuellement
❌ Pas de tests unitaires trouvés
❌ Pas de tests d'intégration

### 6.2 Validation Schema

✅ UpdateQuestionsSchema: strict (length: 3, answer min 1, wrongAnswers length 2)
❌ SubmitAnswersSchema: PAS de validation de unicité

---

## 7. Résumé Final

| Aspect | Status | Severity |
|--------|--------|----------|
| **Création questions** | ✅ WORKING | — |
| **Load questions** | ✅ WORKING | — |
| **Soumission réponses** | ⚠️ PARTIAL | HIGH (bugs #2, #3) |
| **Calcul score** | ✅ WORKING | — |
| **Auto-validation match** | ✅ WORKING | — |
| **Règles succès/échec** | ✅ WORKING | — (design permissif OK) |
| **Blocage rejeu** | ✅ WORKING | — |
| **États frontend** | ✅ WORKING | — |
| **Tests** | ❌ MISSING | HIGH |
| **Sécurité** | ⚠️ PARTIAL | MEDIUM (ID injection) |

### Livrable

**État Actuel:** PARTIAL — Fonctionne en nominal, mais manquent des validations critiques et des tests

**Actions Bloquantes:** 
1. ✅ C1: Valider unicité questionIds (5 min)
2. ✅ C2: Valider ownership des questions (5 min)
3. ✅ C3: Ajouter tests (45 min)

**Actions Optionnelles:**
4. C4: Remover alias inutile (2 min)
5. C5: Ajouter polling frontend (10 min)

**Durée Estimée Corrections:** 60 min

---

**RECOMMANDATION:** Implémenter C1 + C2 + C3 avant production

