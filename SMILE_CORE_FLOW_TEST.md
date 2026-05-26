# Core Smile Flow Test Plan

## Problem Statement
After clicking Smile on a profile, the profile should:
1. Disappear from the current view (after moving to next profile)
2. NOT reappear after page refresh (F5)
3. NOT reappear when navigating away and back

## Backend Verification

### What the backend does
1. **sendReaction** endpoint creates a SMILE reaction in the database
   - Records: `{ fromId: current_user, toId: target_profile, type: SMILE }`
2. **discoverProfiles** endpoint filters profiles by:
   - Getting all matches (any status) for current user
   - Getting all SMILE reactions FROM current user
   - Excluding both from discovery results

### Test: Backend Logic
Run the test to verify backend filtering:
```bash
cd backend && npm run test -- tests/integration/discovery-filtering-reactions.test.ts
```

Expected output: ✅ All 3 tests pass, confirming filtering logic is correct.

---

## Frontend Test: Smile Mutuel (Mutual Smile) Flow

### Setup
- Open app in browser with DevTools (F12)
- Open browser console to see logs
- Have 2 test accounts ready: User A and User B

### Step 1: User A Smiles User B
1. Log in as User A
2. Go to Profiles (Découvrir)
3. Find User B's profile
4. Click 😊 Sourire button
5. **Expected:**
   - Console log: `[ProfileTwoStepDemo] sendReaction result: {type: "SMILE", matchCreated: false}`
   - Profile advances to next one
   - Profile list is now on next profile
6. **Verify in browser DevTools → Application → LocalStorage:**
   - Search for "jeutaime-storage-v8"
   - It should contain User A's data

### Step 2: Refresh page (F5)
1. Press F5 hard refresh
2. **Expected:**
   - Console logs appear showing load() is called
   - New profile list is fetched
   - User B's profile should NOT appear in list
3. **Console check:**
   - Look for: `[discoverProfiles] ... → {count} total`
   - Look for: `[getExistingMatchUserIds] ... smile reactions ...`

### Step 3: User B Smiles Back
1. In a new window, log in as User B
2. Go to Profiles (Découvrir)
3. Find User A's profile
4. Click 😊 Sourire button
5. **Expected:**
   - Console: `[ProfileTwoStepDemo] sendReaction result: {type: "SMILE", matchCreated: true, matchId: "..."}`
   - Automatically navigates to Lettres (Letters)
   - Match should be visible in Lettres inbox

### Step 4: Both Users Refresh
1. Both A and B refresh page (F5)
2. **Expected for User A:**
   - Lettres screen shows the match with User B
   - Profil screen should NOT show User B (already matched)
3. **Expected for User B:**
   - Lettres screen shows the match with User A
   - Profil screen should NOT show User A (already matched)

---

## Troubleshooting Checklist

### If profiles keep reappearing:

#### 1. Check console logs
- [ ] `[ProfileTwoStepDemo] load() called` appears on refresh?
- [ ] `sendReaction result: {matchCreated: false}` appears after click?
- [ ] `[discoverProfiles] ... smile reactions: {count}` appears?

#### 2. Check localStorage
- [ ] Open DevTools → Application → LocalStorage
- [ ] Find "jeutaime-storage-v8" key
- [ ] Does it contain currentUser data?

#### 3. Check network requests
- [ ] Open DevTools → Network
- [ ] After clicking Smile, look for:
   - POST `/api/discover/react` → Status 200
   - Response should include `"matchCreated": false` (unless mutual)
- [ ] After refresh, look for:
   - GET `/api/profiles?pageSize=50` → Status 200
   - Response should NOT include the smiled profile's userId

#### 4. Database verification (Backend only)
```bash
# Check if reaction was created
psql jeutaime -c "SELECT * FROM Reaction WHERE fromId = '{USER_ID}' AND type = 'SMILE';"

# Should show the reaction you just created
```

---

## Expected Logs After Fix

### Scenario: User A smiles User B, then refreshes

#### When smiling:
```
[ProfileTwoStepDemo] handleReact: SMILE → UserB (user-b-id), currentUser=user-a-id
[sendReaction] fromId=user-a-id, toId=user-b-id, type=SMILE, reactionId=reaction-123
[ProfileTwoStepDemo] sendReaction result: {type: "SMILE", matchCreated: false}
```

#### When refreshing:
```
[ProfileTwoStepDemo] load() called, currentUser=user-a-id
[getExistingMatchUserIds] userId=user-a-id: 0 matches, 1 smile reactions → 1 total
[discoverProfiles] viewerId=user-a-id, excludeCount=1, blocked=0, matched=1
[discoverProfiles] returned 49/50 profiles (page 1)
[ProfileTwoStepDemo] discoverProfiles returned 49 profiles
```

Notice:
- 1 reaction is found ✅
- 1 profile is excluded ✅
- 49 profiles returned (not 50, because 1 was excluded) ✅

---

## Success Criteria

✅ After clicking Smile:
- Next profile appears immediately
- Smile reaction is saved (check console + backend logs)

✅ After refresh (F5):
- Backend excludes the smiled profile (check console logs)
- Smiled profile does NOT reappear in list
- Browser localStorage still contains likedProfiles data

✅ After mutual smile:
- Match is created (matchCreated: true)
- Both users see match in Lettres
- Neither user sees each other in Profils (discovery)

---

## If Still Broken

Check these in order:
1. Is `[sendReaction]` log appearing? (Shows reaction was sent to backend)
2. Is backend reaction actually saved? (Check DB directly)
3. Are console logs showing in refresh? (Shows frontend is calling API)
4. Does network response include the profile? (Shows backend filtering failed)

If YES to all above, then profile reappearing is a frontend caching issue.
If NO to #2, the backend is not saving reactions properly.
If NO to #3, the frontend is not calling the API on refresh.
If NO to #4, the backend is returning profiles that should be excluded.
