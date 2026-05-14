# Plan de Test Frontend - Flow Complet Expo

**Objectif:** Valider le flow backend depuis l'app Expo réelle (20/20 étapes TEST_FLOW.sh)

## Configuration Initiale

**API URL:** Vérifier dans `frontend/src/api/client.ts`
- Default: `http://192.168.0.40:3000/api`
- Pour local dev: Changer en `http://localhost:3000/api` ou configurer via env vars

**Backend requis:** Doit être running sur port 3000

**Database:** Doit être clean (TRUNCATE avant test)

**DEV MODE:** Dans `frontend/src/store/useStore.ts` ligne 51
- `DEV_MODE_UNLIMITED_COINS = true` pour faciliter les tests

---

## ÉTAPE 1-2: Register User A & B

### Écran: LoginScreen → RegisterScreen
**Route:** `/login` → `/register`

**Store Zustand:**
- `register(email, password, pseudo, birthDate, gender, city)`
- Sauvegarde: `currentUser`, `accessToken`, `refreshToken`
- Persist dans AsyncStorage

**API Calls:**
```
POST /auth/register
  email: userA@test.com
  password: TestPassword123!
  pseudo: UserA
  birthDate: 1990-01-01
  gender: HOMME
  city: Paris
→ Response: { accessToken, refreshToken, userId }
```

**Comportement UI attendu:**
- ✅ Écran de register accessible
- ✅ Form validation actif (email, password strength)
- ✅ Après submit: redirect vers create-profile
- ✅ Store chargé avec user data

**Points de rupture possibles:**
- ❌ API URL mal configurée → TypeError "fetch failed"
- ❌ Database down → 503 Server Error
- ❌ CORS issue → TypeError
- ❌ AsyncStorage failing → Persist error

**Vérification:**
```
console.log('User A:', store.currentUser)
console.log('Token:', store.accessToken)
```

---

## ÉTAPE 3-4: Create Profiles

### Écran: EditProfileScreen
**Route:** `/edit-profile`

**Store Zustand:**
- `updateProfile(fields)`
- Sauvegarde: profile data complet

**API Calls:**
```
PATCH /profiles/me
  pseudo, bio, city, physicalDesc, interests, 
  lookingFor, interestedIn, height, vibe, quote
→ Response: { data: Profile }
```

**Comportement UI attendu:**
- ✅ Form pré-rempli avec valeurs existantes
- ✅ Validation en temps réel
- ✅ Avatar editor accessible (optional)
- ✅ Après save: confirmation toast/message
- ✅ Retour à l'écran précédent

**Points de rupture possibles:**
- ❌ Token expiré → 401 Unauthorized
- ❌ Profile validation échouée → 400 Bad Request
- ❌ Form submit without required fields → JS error

---

## ÉTAPE 5-6: Setup Questions (3 questions par user)

### Écran: setup-questions.tsx
**Route:** `/setup-questions`

**Store Zustand:**
- `submitProfileQuestions(questions: { questionText, answer, wrongAnswers[] })`

**API Calls:**
```
PUT /profiles/me/questions
  questions: [
    { questionText, answer, wrongAnswers: [3 wrong answers] },
    { ... },
    { ... }
  ]
→ Response: { data: ProfileQuestion[] }
```

**Comportement UI attendu:**
- ✅ Interface pour remplir 3 questions
- ✅ Validation: answer et 3 wrongAnswers requis
- ✅ Affichage des questions saisies
- ✅ Bouton submit visible
- ✅ Après submit: confirmation et redirect

**Points de rupture possibles:**
- ❌ Moins de 3 questions → 400 Bad Request
- ❌ Champ answer/wrongAnswers vide → Validation error
- ❌ API timeout → Spinner infini

**Vérification:**
```
console.log('Questions saved:', store.currentUser?.questions)
// Should be 3 questions with full data
```

---

## ÉTAPE 7: User A Smiles User B (First Smile - No Match)

### Écran: ProfileTwoStepDemo (Discover)
**Route:** `/(tabs)/profiles` → Swipe/Button to smile

**Store Zustand:**
- `sendReaction(toId, 'SMILE')` 
- Stores reaction result but no match yet

**API Calls:**
```
POST /discover/react
  toId: userBId
  type: SMILE
→ Response: { 
    id, fromId, toId, type, createdAt, 
    matchCreated: false,  // ← Important: false car unilateral
    matchId: undefined    // ← Pas encore de match
  }
```

**Comportement UI attendu:**
- ✅ ProfileTwoStepDemo chargé avec liste de profiles
- ✅ User B visible dans la découverte
- ✅ Bouton smile/react visible
- ✅ Click smile → API call
- ✅ Réaction confirmée (icon feedback, haptic)
- ✅ Profile suivant affiché (swipe)
- ❌ Match NOT created yet (unilateral)

**Points de rupture possibles:**
- ❌ Profiles ne charge pas → setError() → Affiche error message
- ❌ User A himself in the list → Should be filtered out
- ❌ Network error on smile → "Erreur de réaction" toast
- ❌ Rate limit hit → 429 response

**Vérification:**
```
// In store after smile:
// No match should be created
console.log('Match created:', reactionResult.matchCreated) // false
```

---

## ÉTAPE 8: User B Smiles User A → Match Created (PENDING)

### Écran: ProfileTwoStepDemo (User B logged in)

**Store Zustand:**
- `sendReaction(toId, 'SMILE')`
- ✅ **Match IS created** now (mutual smile)
- Status: PENDING (waiting for acceptance)
- `initiatorId = userBId` (User B initiated the mutual smile)

**API Calls:**
```
POST /discover/react (as User B)
  toId: userAId
  type: SMILE
→ Response: { 
    id, fromId: userBId, toId: userAId, 
    matchCreated: true,   // ← Match créé!
    matchId: "cmp59..."   // ← ID du match
  }
```

**Backend Match State:**
```
{
  userAId: userAId,
  userBId: userBId,
  initiatorId: userBId,     // ← User B is initiator
  status: PENDING,           // ← NOT ACTIVE yet
  questionsValidated: false,
  ...
}
```

**Comportement UI attendu:**
- ✅ Smile sent
- ✅ Toast: "Match créé!" or notification
- ✅ Match appears in matches list for both users
- ✅ Status shown as "En attente d'acceptation" or "PENDING"

**Points de rupture possibles:**
- ❌ Match created en ACTIVE au lieu de PENDING → Jeu des questions échoue (backend bug?)
- ❌ matchId not returned → Cannot proceed to step 9
- ❌ Notification not sent → User A doesn't see match

---

## ÉTAPE 9: Verify Match Created

### Écran: LettersScreen ou MatchesListScreen  
**Route:** `/(tabs)/letters` ou accès via bottom tab

**Store Zustand:**
- `loadMatches()` → fetch depuis API
- Stores: `matches: MatchDTO[]`

**API Calls:**
```
GET /matches?page=1&perPage=50
→ Response: { 
    data: [
      {
        id: matchId,
        userAId, userBId, initiatorId: userBId,
        status: PENDING,
        questionsValidated: false,
        canSend: false,    // ← Can't send letters yet
        canSendReason: "MATCH_NOT_ACTIVE",
        ...
      }
    ],
    meta: {...}
  }
```

**Comportement UI attendu:**
- ✅ Match visible dans la liste
- ✅ Status affiché: "PENDING" ou "En attente"
- ✅ Profile de l'autre user visible
- ✅ Bouton accept visible pour User A (car lui a été invité)
- ✅ Bouton pour jouer les questions grisé (step 10 requis)

**Points de rupture possibles:**
- ❌ Matches ne load pas → listMatches() error
- ❌ Match status ACTIVE au lieu de PENDING → Flow breakdown
- ❌ Status not shown in UI → UX confuse

---

## ÉTAPE 10: User A Accepts Match (PENDING → ACTIVE)

### Écran: Match Detail / Accept Button
**Route:** `/match-profile?id=matchId` ou dans LettersScreen

**Store Zustand:**
- `acceptMatch(matchId)`
- Updates match status to ACTIVE

**API Calls:**
```
POST /matches/{matchId}/accept
  body: {}
→ Response: { 
    data: {
      id: matchId,
      status: ACTIVE,  // ← Changed from PENDING!
      questionsValidated: false,
      canSend: false,
      canSendReason: "QUESTIONS_NOT_VALIDATED",
      ...
    }
  }
```

**Comportement UI attendu:**
- ✅ Accept button visible on match
- ✅ Click → API call with loading spinner
- ✅ Status changes: PENDING → ACTIVE
- ✅ UI updates to show "Jeu des questions" or "Answer questions"
- ✅ New button to start questions game appears

**Points de rupture possibles:**
- ❌ Match still PENDING after accept → Backend didn't update
- ❌ Button not disappearing → UI not synced with store
- ❌ Status: BROKEN after accept → Both users passed questions (check step 12-13)
- ❌ Network error → Spinner spins forever

**Vérification:**
```
console.log('Match status:', store.matches[0].status) // Should be ACTIVE
console.log('canSend:', store.matches[0].canSend)     // false
console.log('canSendReason:', ...)                    // QUESTIONS_NOT_VALIDATED
```

---

## ÉTAPE 11: Load Match Questions

### Écran: Match Questions Screen
**Route:** Accessed from match detail or button

**Store Zustand:**
- `getMatchQuestions(matchId)`
- Stores: `matchQuestions: MatchQuestionsDTO`

**API Calls:**
```
GET /matches/{matchId}/questions
→ Response: {
    data: {
      matchId,
      questionsValidated: false,
      myStatus: "pending",
      myScore: null,
      questions: [
        {
          profileQuestionId: "cmp59...",  // ← Real UUID from DB
          questionId: "custom_0",
          questionText: "Quel est ton rêve le plus fou?",
          options: ["Créer...", "Devenir...", "Vivre..."]  // ← Shuffled
        },
        // 2 more questions
      ]
    }
  }
```

**Comportement UI attendu:**
- ✅ 3 questions from OTHER user loaded
- ✅ Each question shows with options (shuffled)
- ✅ Some questions may have NULL options (no wrong answers)
- ✅ Multiple choice buttons visible
- ✅ Progress indicator (1/3, 2/3, 3/3)

**Points de rupture possibles:**
- ❌ Questions ne load pas → getMatchQuestions() error
- ❌ Questions are from OWN user au lieu de other → Logic bug
- ❌ Options not shuffled → UX issue
- ❌ Options are NULL → Can't display (should show text input?)

---

## ÉTAPE 12: User A Submits Answers

### Écran: Match Questions Screen
**Action:** Select answers for 3 questions, submit

**Store Zustand:**
- `submitMatchAnswers(matchId, answers: { profileQuestionId, answer }[])`

**API Calls:**
```
POST /matches/{matchId}/questions/answers
  answers: [
    { profileQuestionId: "cmp59...", answer: "Créer une galerie d'art" },
    { profileQuestionId: "cmp59...", answer: "Au musée ou en nature" },
    { profileQuestionId: "cmp59...", answer: "L'humour intelligent..." }
  ]
→ Response: {
    data: {
      myScore: 3,              // ← User A got all 3 correct!
      passed: true,
      questionsValidated: false,  // ← Still false, waiting for User B
      waitingForOther: true,       // ← User B hasn't answered yet
      matchBroken: false
    }
  }
```

**Comportement UI attendu:**
- ✅ Answers validated (must match exactly backend answers)
- ✅ Submit button enabled after 3 answers
- ✅ Loading spinner during submit
- ✅ Score shown: "3/3 correct!"
- ✅ Message: "En attente de la réponse de l'autre joueur"
- ✅ Match NOT broken (both users must pass)
- ✅ Cannot edit answers again

**Points de rupture possibles:**
- ❌ Answer mismatch → myScore: 0 → User A thinks they're wrong
- ❌ questionsValidated: true prematurely → Questions locked before User B answers
- ❌ matchBroken: true → One user failed → Can't send letters (step 14 fails)
- ❌ waitingForOther still true → Correct (should show waiting state in UI)

**Critical:** Answers must match EXACTLY (case-sensitive, spaces, accents):
- "Créer une galerie d art" ≠ "Créer une galerie d'art" (apostrophe!)
- "L humour..." ≠ "L'humour..." (apostrophe!)

---

## ÉTAPE 13: User B Submits Answers

### Écran: Match Questions Screen (User B logged in)
**API Calls:**
```
POST /matches/{matchId}/questions/answers (as User B)
  answers: [
    { profileQuestionId: "cmp59...", answer: "Voyager autour du monde" },
    ...
  ]
→ Response: {
    data: {
      myScore: 3,
      passed: true,
      questionsValidated: true,     // ← NOW TRUE (both users passed)!
      waitingForOther: false,
      matchBroken: false
    }
  }
```

**Comportement UI attendu:**
- ✅ Same as ÉTAPE 12
- ✅ After submit: "Jeu des questions validé!"
- ✅ Notification sent (both users should see update)
- ✅ canSend should now be true in match detail

**Stores Updated:**
- Both User A and User B can now see `questionsValidated: true`
- `canSend` changes from false to true (both can send letters)
- Match is still ACTIVE (not BROKEN)

**Points de rupture possibles:**
- ❌ questionsValidated remains false → Letters can't be sent
- ❌ matchBroken: true → Questions were failed by one user
- ❌ Score not matching → Check answer text exactly

---

## ÉTAPE 14: User B Sends First Letter (Initiator sends first)

### Écran: Match Detail / Send Letter Modal
**Route:** `/match-profile` → "Envoyer une lettre" button

**Store Zustand:**
- `sendLetter(matchId, content)`

**API Calls:**
```
POST /matches/{matchId}/letters
  content: "Salut! J'ai adoré tes réponses..."
→ Response: {
    data: {
      id: letterId_B,
      matchId,
      fromUserId: userBId,
      toUserId: userAId,
      content: "...",
      status: SENT,
      sentAt: "...",
      readAt: null
    }
  }
```

**Backend Logic - Letter Alternation:**
```
Match.initiatorId = userBId
First letter sender must be initiatorId
→ Only User B can send first letter
→ User A would get 403: "Tu dois attendre..." error if trying first
```

**Comportement UI attendu:**
- ✅ User B can send letter (is initiator)
- ✅ Modal/input for letter content
- ✅ Send button with validation
- ✅ Letter appears in match letters list
- ✅ Status shows "SENT"
- ✅ User B's canSend becomes false (must wait for reply)

**Points de rupture possibles:**
- ❌ User A tries to send first → 422 "Tu dois attendre..." (correct, but UI should prevent this)
- ❌ Content validation fails → 400 Bad Request (empty or too long?)
- ❌ Letter appears for sender but not for recipient → Sync issue
- ❌ canSend not updated after sending → UI not synced

**Critical:** Only initiator (User B) can send FIRST letter
- If User A tries first → Backend rejects with letter alternation error

---

## ÉTAPE 15: Verify User B canSend = false

### Écran: Match Detail (User B perspective)
**Verification:**
```
GET /matches/{matchId}
→ Check: canSend: false
→ Check: canSendReason: "AWAITING_REPLY"
```

**Comportement UI attendu:**
- ✅ Send button disabled or hidden
- ✅ Message: "En attente de la réponse de l'autre"
- ✅ Spinner/indicator showing waiting state

---

## ÉTAPE 16: User A Replies with Letter

### Écran: Match Detail / Send Letter Modal (User A)

**API Calls:**
```
POST /matches/{matchId}/letters (as User A)
  content: "Bonjour! Moi aussi..."
→ Response: { data: { id: letterId_A, ... } }
```

**Letter Alternation Logic:**
```
lastLetterBy = userBId (from ÉTAPE 14)
Current sender = userAId
→ Different users = OK, can send
```

**Comportement UI attendu:**
- ✅ User A can send (different from last sender)
- ✅ Letter created and visible
- ✅ User A's canSend becomes false (must wait)
- ✅ User B sees notification of new letter

---

## ÉTAPE 17: Verify User A canSend = false

### Écran: Match Detail (User A perspective)
**Verification:**
```
canSend: false
canSendReason: "AWAITING_REPLY"
```

---

## ÉTAPE 18: Get Letters List

### Écran: Match Letters View
**API Calls:**
```
GET /matches/{matchId}/letters
→ Response: {
    data: [
      { id: letterId_B, fromUserId: userBId, ... },
      { id: letterId_A, fromUserId: userAId, ... }
    ],
    meta: {...}
  }
```

**Comportement UI attendu:**
- ✅ Both letters visible (chronological order)
- ✅ Sender info shown
- ✅ Status shown (SENT, READ, etc.)
- ✅ Read/unread indicator

**Points de rupture possibles:**
- ❌ Letters in wrong order (should be by sentAt)
- ❌ Some letters missing (sync issue)
- ❌ Status not shown

---

## ÉTAPE 19: Mark Letter as Read

### Écran: Match Detail / Letters List
**Action:** Click/tap on unread letter

**Store Zustand:**
- `markLetterRead(letterId)`

**API Calls:**
```
PATCH /letters/{letterId}/read
  body: {}
→ Response: {
    data: {
      id: letterId,
      status: READ,
      readAt: "2026-05-14T09:19:57.286Z"
    }
  }
```

**Comportement UI attendu:**
- ✅ Letter status changes: SENT → READ
- ✅ Read timestamp shown
- ✅ Unread indicator disappears
- ✅ UI updates immediately

**Points de rupture possibles:**
- ❌ Status doesn't change → markLetterRead() failed silently
- ❌ readAt is null → Backend didn't save timestamp

---

## ÉTAPE 20: Check Unread Count

### Store / Notification Badge

**Store Zustand:**
- `getUnreadCount()` → Should decrease as letters are read

**API Calls:**
```
GET /notifications/unread-count
→ Response: { data: { count: 1 } }  // 1 unread letter left
```

**Comportement UI attendu:**
- ✅ Badge on letters tab shows count
- ✅ Count decreases as letters are read
- ✅ Count updates in real-time or after refresh

**Points de rupture possibles:**
- ❌ Count doesn't update → Cache issue
- ❌ Still shows 2 when 1 is marked read → API not called
- ❌ Badge not visible → UI issue

---

## Matrice de Dépendances - Stores Zustand

| Étape | Function Appelée | Store Key Updated | Impact si erreur |
|-------|-----------------|------------------|------------------|
| 1-2 | `register()` | currentUser, accessToken | Pas d'accès API (401) |
| 3-4 | `updateProfile()` | currentUser.profile | Profil incomplet |
| 5-6 | `submitProfileQuestions()` | currentUser.questions | Questions non sauvegardes |
| 7 | `sendReaction()` | - (no store update) | Reaction sent but UI not updated |
| 8 | `sendReaction()` | matches (add) | Match appear in list? |
| 9 | `loadMatches()` | matches | Empty matches list |
| 10 | `acceptMatch()` | matches[].status | Match stays PENDING |
| 11 | `getMatchQuestions()` | matchQuestions | Questions ne chargent |
| 12 | `submitMatchAnswers()` | - | Can't play game |
| 13 | `submitMatchAnswers()` | - | questionsValidated stays false |
| 14 | `sendLetter()` | - | Letters don't appear |
| 16 | `sendLetter()` | - | Reply fails |
| 19 | `markLetterRead()` | - | Status doesn't update |
| 20 | `getUnreadCount()` | notifications | Badge wrong |

---

## Checklist de Debug

### Pour chaque étape:
- [ ] Network tab: Vérifier request/response correcte
- [ ] Console: Pas d'erreur JS
- [ ] Store state: Vérifier store.currentUser, store.matches, etc.
- [ ] UI: Verify visual changes
- [ ] Haptic feedback: Si implémenté, vérifier
- [ ] Toast/Notifications: Messages affichés

### Red flags:
- ❌ HTTP error codes (400, 401, 403, 404, 422, 500)
- ❌ Network timeout (> 30s)
- ❌ Store state not updated
- ❌ UI not reflecting store changes
- ❌ Token expired (401 after some time)
- ❌ Console errors/warnings
- ❌ Crash or white screen

---

## How to Test

### Option 1: Physical Device or Simulator
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend  
cd frontend
npm start -- --web  # ou iOS/Android
# Scan QR code with Expo Go app
```

### Option 2: Web Browser (Expo Web)
```bash
cd frontend
npm run web
# Opens http://localhost:8081 in browser
# Full dev tools available in Chrome DevTools
```

### Option 3: Automated E2E Testing
```bash
# Would need Detox or similar setup (not done in this scope)
# See Detox docs for app testing
```

---

## Expected Full Flow Results

**Backend (TEST_FLOW.sh):** 20/20 ✅
**Frontend UI:** Should mirror backend flow perfectly

**Failure scenarios to investigate:**
1. Step N fails → Check API response in Network tab
2. Store not updated → Check console.log for action dispatch
3. UI not reflecting change → Check store subscription in component
4. Network error → Check API URL, backend running, CORS
5. Crash → Check console for stack trace

