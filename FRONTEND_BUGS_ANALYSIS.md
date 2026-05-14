# Analyse des Bugs Potentiels - Frontend

Basée sur l'analyse du code, voici les problèmes potentiels à vérifier lors du test.

---

## ❌ BUG POTENTIEL #1: Accept Match - Pas de refresh auto

**Fichier:** `frontend/src/screens/LettersScreen.tsx`

**Code:**
```typescript
const handleAccept = async (match: Match) => {
  try {
    await acceptMatch(match.id);
    await loadMatches();  // ← Force reload
  } catch (err: any) {
    Alert.alert('Erreur', err?.message ?? "Impossible d'accepter le match");
  }
};
```

**Analyse:**
- ✅ handleAccept appelle loadMatches() pour refresh
- ✅ Error handling en place
- **MAIS:** Pas de loading spinner visible pendant l'appel API
- **Impact:** User voit le bouton disparaître après click, mais pas de visual feedback que c'est en cours

**Test:** 
- [ ] Click "Accepter le match"
- [ ] Vérifier qu'un spinner ou loading state s'affiche
- [ ] Après 1-2s, le match passe à ACTIVE
- [ ] Le bouton "Jouer aux questions" apparaît

**Correction si bug:**
- Ajouter un state `[acceptingMatchId, setAcceptingMatchId]`
- Afficher spinner durante l'appel

---

## ❌ BUG POTENTIEL #2: Questions - État persistance problème

**Fichier:** `frontend/src/screens/LettersScreen.tsx`

**Code:**
```typescript
const handleQGameOpen = async (match: Match) => {
  setQGameMatch(match);
  setQSelectedAnswers({});      // ← Reset answers
  setQCurrentStep(0);            // ← Reset step
  setQResult(null);
  setShowQGame(true);
  loadQuestions(match.id);       // ← Async, but no await
};
```

**Analyse:**
- **PROBLÈME:** `loadQuestions(match.id)` est appelé sans await
- `setShowQGame(true)` s'exécute immédiatement
- Le modal s'affiche, mais les questions ne sont pas encore chargées
- User voit l'écran de questions vide pendant 1-2 secondes

**Test:**
- [ ] Click "Jouer aux questions"
- [ ] Vérifier: Questions chargées instantanément ou blank?
- [ ] Y a-t-il un spinner pendant le chargement?

**Correction si bug:**
```typescript
const handleQGameOpen = async (match: Match) => {
  setQGameMatch(match);
  setQSelectedAnswers({});
  setQCurrentStep(0);
  setQResult(null);
  setShowQGame(true);
  await loadQuestions(match.id);  // ← Add await
};
```

---

## ❌ BUG POTENTIEL #3: Answer Validation - Case Sensitivity

**Fichier:** `frontend/src/screens/LettersScreen.tsx` + backend `questions.service.ts`

**Backend trim/lowercase:**
```typescript
// backend/src/modules/matches/questions.service.ts line 162
const realAnswerMap = new Map(
  realAnswers.map((q) => [q.id, q.answer.toLowerCase().trim()])
);
```

```typescript
// line 188
isCorrect: a.answer.toLowerCase().trim() === realAnswerMap.get(a.normalizedQuestionId)
```

**Frontend:**
```typescript
// LettersScreen - When submitting
const answers = questions.map(q => ({
  profileQuestionId: q.profileQuestionId,
  answer: qSelectedAnswers[q.profileQuestionId] ?? '',  // ← Raw input
}));
```

**Analyse:**
- Backend does `.toLowerCase().trim()`
- Frontend sends raw text
- Backend will handle case-insensitivity ✅
- **BUT:** If user inputs "L'humour" and correct is "L humour" (no apostrophe), it will fail
- Backend has same text validation, so this should work if backend is correct

**Test:**
- [ ] Submit answers with exact text from step 5-6
- [ ] All 3 answers should be correct (myScore: 3)
- [ ] If myScore: 0, check backend answer storage

**Critical:** Must match backend answers EXACTLY (minus case/trim)

---

## ❌ BUG POTENTIEL #4: Questions Validated Status Not Synced

**Fichier:** `frontend/src/store/useStore.ts`

**Analyse:**
- After submitting answers, `questionsValidated` flag should update
- This flag gates the "Send Letters" button
- If not synced properly, user sees "Jouer aux questions" forever

**Test:**
- [ ] User A submits answers
- [ ] Check: Still shows "Jouer aux questions" (User B hasn't answered yet)
- [ ] User B submits answers  
- [ ] Check: Now shows "📬 Lettres" button
- [ ] Check: `questionsValidated` should be true

**Likely Flow:**
```
User A answers → waitingForOther: true → can't send letters yet ✅
User B answers → questionsValidated: true → can send letters ✅
```

---

## ❌ BUG POTENTIEL #5: Letter Alternation - initiator Confusion

**Fichier:** `frontend/src/screens/LettersScreen.tsx`

**Backend Policy:**
```typescript
// backend/src/policies/letterAlternation.ts
if (ctx.lastLetterBy === null) {
  if (ctx.senderId !== ctx.initiatorId) {
    throw new LetterAlternationError();  // ← Only initiator can send first
  }
}
```

**Frontend:**
- Does NOT explicitly check `isInitiator` before allowing send
- User B (initiator) can send
- User A (non-initiator) would get 422 error if trying first

**Test:**
- [ ] ÉTAPE 14: User B sends letter → ✅ Works
- [ ] ÉTAPE 16: User A replies → ✅ Works  
- [ ] Check error message if non-initiator tries first

**Issue:** Frontend doesn't prevent User A from clicking "Send" if they're not initiator
- UX issue: User A would see error after click
- Should disable button or show message: "Only initiator can send first"

**Fix Needed?**
```typescript
// In EnvelopeCard or compose modal:
const canSendLetter = myTurn || isInitiator;  // ← Prevent first-send by non-initiator

// Or show message:
if (!myTurn && letterCount === 0 && !isInitiator) {
  return <Text>L'autre joueur doit envoyer la première lettre</Text>;
}
```

---

## ⚠️  BUG POTENTIEL #6: Letter Markup Read - Status not updated in UI

**Fichier:** `frontend/src/screens/LettersScreen.tsx`

**Code:**
```typescript
// Mark letter as read
await markLetterRead(letterId);
// But then what? Does state refresh?
```

**Analyse:**
- When user marks letter as read, backend updates
- Frontend should refetch letters or update local state
- If not done, UI still shows as "unread"

**Test:**
- [ ] Receive a letter (status: SENT, unread)
- [ ] Click to read
- [ ] Check: Status changes to READ, readAt populated
- [ ] Check: Unread badge disappears

---

## ⚠️  BUG POTENTIEL #7: API URL Config - Dev vs Prod

**Fichier:** `frontend/src/api/client.ts` line 3-6

**Code:**
```typescript
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://192.168.0.40:3000/api";
```

**Issue:**
- Default is 192.168.0.40 (old dev machine IP)
- For local testing on localhost:3000, need to change
- Environment variables might not be set in Expo

**Fix:**
```bash
# Option 1: Set env var
export EXPO_PUBLIC_API_URL="http://localhost:3000/api"
npm start --web

# Option 2: Edit client.ts directly
// "http://localhost:3000/api" (for local dev)
```

**Current Status:** ✅ Backend IS running on localhost:3000 per validation

---

## ✅ VALIDATION: Key Store Functions

Checked in `frontend/src/store/useStore.ts`:

| Function | Status | Notes |
|----------|--------|-------|
| `register()` | ✅ | Calls API, saves tokens to AsyncStorage |
| `updateProfile()` | ✅ | PATCH /profiles/me |
| `submitProfileQuestions()` | ✅ | PUT /profiles/me/questions |
| `sendReaction()` | ✅ | POST /discover/react |
| `loadMatches()` | ✅ | GET /matches, updates store |
| `acceptMatch()` | ✅ | POST /matches/:id/accept |
| `getMatchQuestions()` | ✅ | GET /matches/:id/questions |
| `submitMatchAnswers()` | ✅ | POST /matches/:id/questions/answers |
| `sendLetter()` | ✅ | POST /matches/:id/letters |
| `markLetterRead()` | ✅ | PATCH /letters/:id/read |

---

## 🧪 Test Execution Plan

### Prerequisites
```bash
# Terminal 1: Backend
cd backend
npm run dev
# Wait for "Listening on 3000"

# Terminal 2: Frontend web
cd frontend
export EXPO_PUBLIC_API_URL="http://localhost:3000/api"  # ← IMPORTANT
npm start --web
# Opens http://localhost:8081 in browser
```

### Chrome DevTools Setup
```
F12 → Network tab → XHR filter
Watch all /api/* calls and responses
Console for logs: console.log('Store state:', useStore.getState())
```

### Test Checklist

**PHASE 1: Registration (5 min)**
- [ ] ÉTAPE 1: Register User A
  - [ ] Form visible
  - [ ] Validation works
  - [ ] API call: POST /auth/register
  - [ ] Response: 201, has userId & tokens
  - [ ] Redirect to create-profile

- [ ] ÉTAPE 2: Register User B  
  - [ ] Same checks as User A

**PHASE 2: Profiles (10 min)**
- [ ] ÉTAPE 3-4: Complete Profiles
  - [ ] Form fills with default values
  - [ ] Can edit all fields
  - [ ] Submit: PATCH /profiles/me returns 200
  
**PHASE 3: Questions (15 min)**
- [ ] ÉTAPE 5-6: Setup Questions
  - [ ] Interface loads
  - [ ] Can enter 3 questions + answers + wrong answers
  - [ ] Submit: PUT /profiles/me/questions returns 200

**PHASE 4: Matching (15 min)**
- [ ] ÉTAPE 7: User A Smiles User B
  - [ ] Discover screen loads with profiles
  - [ ] Can click smile button
  - [ ] API: POST /discover/react → matchCreated: false ✅
  
- [ ] ÉTAPE 8: User B Smiles User A
  - [ ] Switch to User B
  - [ ] Send smile
  - [ ] API: POST /discover/react → matchCreated: true ✅
  - [ ] Should see notification/match created
  
- [ ] ÉTAPE 9: Verify Match
  - [ ] Go to Letters tab
  - [ ] Match visible with status PENDING
  
- [ ] ÉTAPE 10: Accept Match
  - [ ] Click "Accepter le match" button
  - [ ] Status changes to ACTIVE
  - [ ] New button appears: "Jouer aux questions"

**PHASE 5: Questions Game (20 min)**
- [ ] ÉTAPE 11: Load Questions
  - [ ] Click "Jouer aux questions"
  - [ ] Modal opens with 3 questions
  - [ ] Questions are from OTHER user
  - [ ] Options are shuffled (or NULL)
  
- [ ] ÉTAPE 12: User A Answers
  - [ ] Select answers (must match backend)
  - [ ] Click Submit
  - [ ] Response: myScore: 3, waitingForOther: true ✅
  - [ ] Can't send letters yet
  
- [ ] ÉTAPE 13: User B Answers
  - [ ] Switch to User B
  - [ ] Play questions
  - [ ] Submit answers (3/3 correct again)
  - [ ] Response: questionsValidated: true ✅
  - [ ] "Envoyer une lettre" button NOW visible

**PHASE 6: Letters (20 min)**
- [ ] ÉTAPE 14: User B Sends First Letter
  - [ ] Click "Envoyer une lettre"
  - [ ] Modal opens with text input
  - [ ] Type message
  - [ ] Submit: POST /matches/:id/letters → 201
  - [ ] Letter appears in conversation
  - [ ] canSend: false (User B must wait)
  
- [ ] ÉTAPE 15: Verify canSend false for User B ✅

- [ ] ÉTAPE 16: User A Replies
  - [ ] Switch to User A
  - [ ] Can now click "Envoyer une lettre"
  - [ ] Send reply
  - [ ] Letters appear in conversation
  - [ ] canSend: false for User A
  
- [ ] ÉTAPE 17: Verify canSend false for User A ✅

- [ ] ÉTAPE 18: Get Letters List  
  - [ ] Both letters visible
  - [ ] Correct order (by date)
  - [ ] Correct senders
  
- [ ] ÉTAPE 19: Mark as Read
  - [ ] Click unread letter
  - [ ] Status changes to READ
  - [ ] readAt populated

- [ ] ÉTAPE 20: Unread Count
  - [ ] Badge on Letters tab updates
  - [ ] Count decreases as letters are read

---

## 📋 Issue Logging

When a test fails:

```
**Issue:** [Name]
**Step:** ÉTAPE X
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Network:** POST /endpoint → [HTTP code] [error message]
**Store State:** [Relevant store values]
**Console Errors:** [Any errors in console]
**Reproducible:** [Yes/No] [Steps to reproduce]
```

