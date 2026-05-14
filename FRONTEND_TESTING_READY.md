# Frontend Testing - Ready to Start

**Status:** ✅ Backend: 20/20 tests passing
**Next:** Frontend: Execute same flow in Expo app

---

## What Was Done

### 1. **Backend Validation** ✅
- All 20 TEST_FLOW.sh tests passing (100%)
- Database fully validated
- API endpoints working correctly

### 2. **Frontend Analysis** ✅
- Code reviewed for critical paths
- Test plan created (FRONTEND_TEST_PLAN.md)
- Bug analysis done (FRONTEND_BUGS_ANALYSIS.md)
- Race condition fixed (questions loading)

### 3. **Bugs Fixed**
| Bug | Status | Fix |
|-----|--------|-----|
| Questions modal loading blank | ✅ Fixed | Added `await loadQuestions()` |
| No visual loading state on accept | ⚠️ Minor | Will add if needed during testing |
| Letter alternation not validated in UI | ℹ️ Note | Backend handles it via `canSend` flag |

---

## How to Run Tests

### Option A: Web Browser (Easiest for testing)

```bash
# Terminal 1: Start backend
cd /home/user/Jeutaime2.0
pkill -f ts-node  # Kill any old backend
cd backend
npm run dev
# Wait for: "Listening on port 3000"

# Terminal 2: Start frontend web
cd /home/user/Jeutaime2.0/frontend
export EXPO_PUBLIC_API_URL="http://localhost:3000/api"
npm start --web
# Browser opens at http://localhost:8081
```

**Tools Needed:**
- Browser (Chrome recommended for DevTools)
- F12 for Network tab, Console, etc.

### Option B: iOS/Android Simulator

```bash
cd /home/user/Jeutaime2.0/frontend
export EXPO_PUBLIC_API_URL="http://localhost:3000/api"
npm start
# Follow on-screen instructions for iOS/Android
```

### Option C: Physical Device

```bash
# Download Expo Go app on your phone
cd /home/user/Jeutaime2.0/frontend
export EXPO_PUBLIC_API_URL="http://192.168.0.40:3000/api"  # ← Your dev machine IP
npm start
# Scan QR code with Expo Go
```

---

## Testing Checklist

Follow **FRONTEND_BUGS_ANALYSIS.md** → **Test Execution Plan** section

### Quick Summary

```
ÉTAPE 1-2:   Register User A & B              [ ] [ ] [ ]
ÉTAPE 3-4:   Complete Profiles                [ ] [ ] [ ]
ÉTAPE 5-6:   Setup 3 Questions                [ ] [ ] [ ]
ÉTAPE 7:     User A Smiles (no match yet)     [ ] [ ] [ ]
ÉTAPE 8:     User B Smiles → Match created    [ ] [ ] [ ]
ÉTAPE 9:     Verify Match visible             [ ] [ ] [ ]
ÉTAPE 10:    Accept Match PENDING → ACTIVE    [ ] [ ] [ ]
ÉTAPE 11:    Load Questions                   [ ] [ ] [ ]
ÉTAPE 12:    User A Submit Answers (3/3 ok)   [ ] [ ] [ ]
ÉTAPE 13:    User B Submit Answers (validated)[ ] [ ] [ ]
ÉTAPE 14:    User B Send Letter (initiator)   [ ] [ ] [ ]
ÉTAPE 15:    Verify User B canSend = false    [ ] [ ] [ ]
ÉTAPE 16:    User A Reply                     [ ] [ ] [ ]
ÉTAPE 17:    Verify User A canSend = false    [ ] [ ] [ ]
ÉTAPE 18:    Get Letters List (2 letters)     [ ] [ ] [ ]
ÉTAPE 19:    Mark Letter as Read              [ ] [ ] [ ]
ÉTAPE 20:    Check Unread Count Updated       [ ] [ ] [ ]
```

---

## Network Debugging

### What to Monitor in Chrome DevTools

**Network Tab:**
```
Filter: /api/
Watch for:
- ✅ 200/201 responses (success)
- ❌ 400/401/403/404/422 (errors)
- ❌ 0 (timeout or blocked)
- ⚠️ 500 (server error)
```

**Common Issues:**
| HTTP Code | Meaning | Check |
|-----------|---------|-------|
| 200/201 | ✅ Success | Continue |
| 400 | Bad request data | Check JSON format |
| 401 | Token expired | Re-login |
| 403 | Permission denied | Wrong user, blocked, etc |
| 404 | Not found | Wrong ID, route missing |
| 422 | Validation error | Data doesn't match backend schema |
| 429 | Rate limited | Wait or increase limit |
| 500 | Server error | Check backend logs |
| 0 | Network error | Backend down, CORS issue, timeout |

---

## Store State Inspection

### In Browser Console

```javascript
// Import the store
import { useStore } from './src/store/useStore.ts'

// Get current state
const state = useStore.getState()
console.log('currentUser:', state.currentUser)
console.log('matches:', state.matches)
console.log('accessToken:', state.accessToken)

// Subscribe to changes
const unsubscribe = useStore.subscribe(
  (state) => console.log('Store updated:', state)
)
```

### Key Store Fields to Check

```javascript
state.currentUser          // User info, questions
state.matches             // All matches: status, canSend, etc
state.letters             // All letters in conversations
state.accessToken         // JWT token for API calls
state.notifications       // Unread count, etc
```

---

## Debugging Flow

**When a step fails:**

1. **Check Network Tab**
   - Was request sent?
   - What status code?
   - What error message in response body?

2. **Check Console**
   - Any JS errors?
   - Check `useStore.getState()` to verify state

3. **Check UI**
   - What does the screen show?
   - Does it match expected behavior?
   - Are buttons disabled/enabled correctly?

4. **Identify Root Cause**
   - Backend error? → Fix backend
   - State not updated? → Check store action
   - UI not reflecting state? → Check component

---

## Expected Results

### After All 20 Steps

✅ Both users created and authenticated
✅ Profiles filled with data  
✅ 3 questions per user set up
✅ Mutual smile detected (match created in PENDING)
✅ Match accepted (status: ACTIVE)
✅ Questions played and validated (questionsValidated: true)
✅ Both users can send letters
✅ Letter alternation enforced (initiator sends first)
✅ Letter conversation with 2 messages
✅ Letters can be marked as read
✅ Unread count properly tracked

**Success Metric:** Same flow as TEST_FLOW.sh works in Expo UI

---

## Files Generated

| File | Purpose |
|------|---------|
| FRONTEND_TEST_PLAN.md | Detailed 20-step plan |
| FRONTEND_BUGS_ANALYSIS.md | Bug analysis + test checklist |
| frontend-validate.sh | Config validation script |
| RUN_FRONTEND_TEST.sh | One-command startup script |
| FRONTEND_TESTING_READY.md | This file - quick reference |

---

## Quick Git Status

```bash
# Check current branch
git branch
# → claude/fix-app-regression-ZZCFt

# View recent commits
git log --oneline -5
# → a96aba1 Fix questions loading race condition
#   9944b86 Add frontend validation plan
#   a13d4df Fix TEST_FLOW.sh to pass all 20 tests
```

---

## Important Notes

1. **API URL:** Make sure to export EXPO_PUBLIC_API_URL before npm start
   ```bash
   export EXPO_PUBLIC_API_URL="http://localhost:3000/api"
   ```

2. **Backend must be running** on port 3000
   ```bash
   cd backend && npm run dev
   ```

3. **Clear AsyncStorage if stuck** (localStorage in web)
   - Browser DevTools → Application → Clear Storage
   - Or restart browser

4. **Database persistence** between tests
   - Don't truncate between ÉTAPE 1-6 (registration/profile)
   - Only reset between full flow runs

5. **Two separate browser instances** for User A and User B
   - Incognito window recommended to avoid token conflicts
   - Or use different browsers

---

## Next Steps

1. ✅ Read FRONTEND_TEST_PLAN.md
2. ✅ Setup environment (API URL, backend running)
3. ✅ Open http://localhost:8081
4. ✅ Follow ÉTAPE 1-20 in FRONTEND_BUGS_ANALYSIS.md test checklist
5. ✅ Report any failures with:
   - Step number
   - Expected vs actual
   - Network response
   - Store state
   - Screenshot if possible

---

## Contact/Help

If testing fails, check:
- Backend logs: `tail -f /tmp/backend.log`
- Frontend console: F12 → Console
- Network tab: F12 → Network (filter /api/)
- Store state: `useStore.getState()` in console

