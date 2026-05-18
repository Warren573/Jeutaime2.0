# Staging Validation Checklist — Phase 1 Security

**PR:** #72 (feat: Phase 1 Security — break, block, report + enforcement)
**Deploy to staging:** After manual merge to main
**Test environment:** staging.jeutaime.dev (or local staging build)
**Estimated time:** 45-60 minutes

---

## Pre-Test Verification

- [ ] PR #72 merged to main
- [ ] Backend deployed to staging
- [ ] Frontend deployed to staging
- [ ] Database migrations applied (if any) — **Note:** none required
- [ ] API endpoints accessible (test with curl/Postman)
- [ ] No deployment errors in logs

---

## Feature 1: Rompre Relation (Break Match)

### 1.1 Break Flow — Happy Path
**Objective:** User can break an active match

**Steps:**
1. Create 2 test users (user-a, user-b)
2. Create active match between them (userAId < userBId)
3. Both users accept match
4. Both answer questions (questionsValidated = true)
5. User-a calls: `DELETE /api/matches/{matchId}` with auth header

**Expected:**
- [ ] HTTP 200 response
- [ ] Match.status = BROKEN
- [ ] Match.updatedAt = now
- [ ] Response includes updated match object

**Verify in database:**
```sql
SELECT status, updatedAt FROM matches WHERE id = '{matchId}';
-- Expected: BROKEN, recent timestamp
```

### 1.2 Break — Non-Participant Error
**Objective:** Only participants can break

**Steps:**
1. Create match between user-a and user-b
2. User-c (third party) calls: `DELETE /api/matches/{matchId}`

**Expected:**
- [ ] HTTP 403 Forbidden
- [ ] Error: "Tu ne fais pas partie de ce match"
- [ ] Match status unchanged

### 1.3 Break — Already Broken Error
**Objective:** Cannot double-break

**Steps:**
1. Break match successfully (see 1.1)
2. User-a tries to break same match again

**Expected:**
- [ ] HTTP 400 Bad Request
- [ ] Error: "Ce match est déjà rompu ou bloqué"
- [ ] No change to match

### 1.4 Break — Already Blocked Error
**Objective:** Cannot break already-blocked match

**Steps:**
1. Create active match
2. User-a blocks match: `POST /api/matches/{matchId}/block`
3. User-a tries to break: `DELETE /api/matches/{matchId}`

**Expected:**
- [ ] HTTP 400 Bad Request
- [ ] Error: "Ce match est déjà rompu ou bloqué"

---

## Feature 2: Bloquer Utilisateur (Block User)

### 2.1 Block Flow — Happy Path
**Objective:** User can block another user

**Steps:**
1. Create active match (user-a, user-b)
2. Both accept and validate questions
3. User-a calls: `POST /api/matches/{matchId}/block` with auth header

**Expected:**
- [ ] HTTP 200 response
- [ ] Match.status = BLOCKED
- [ ] Block record created in database

**Verify in database:**
```sql
SELECT id, fromId, toId, createdAt FROM blocks 
WHERE fromId = 'user-a-id' AND toId = 'user-b-id';
-- Expected: 1 record with recent createdAt
```

### 2.2 Block — Non-Participant Error
**Objective:** Only participants can block

**Steps:**
1. Create match (user-a, user-b)
2. User-c calls: `POST /api/matches/{matchId}/block`

**Expected:**
- [ ] HTTP 403 Forbidden
- [ ] Match.status unchanged
- [ ] No Block record created

### 2.3 Block — Already Blocked Error
**Objective:** Cannot double-block

**Steps:**
1. Block successfully (see 2.1)
2. User-a tries to block same match again

**Expected:**
- [ ] HTTP 409 Conflict
- [ ] Error: "Un blocage existe déjà"
- [ ] No new Block record

### 2.4 Block — Unidirectional Verification
**Objective:** Block is from→to, not bidirectional

**Steps:**
1. User-a blocks user-b (see 2.1)
2. User-b tries to interact with user-a (if applicable)

**Note:** At Phase 1, only letters are restricted. 
Discovery/profile visibility not yet implemented.

**Verify in database:**
```sql
SELECT fromId, toId FROM blocks WHERE id = '{blockId}';
-- Expected: fromId = user-a, toId = user-b (not reversed)
```

---

## Feature 3: Signaler Profil (Report User)

### 3.1 Report Flow — Happy Path
**Objective:** User can report another user

**Steps:**
1. User-a calls: `POST /api/reports`
```json
{
  "targetId": "user-b-id",
  "reason": "HARASSMENT",
  "details": "User sent inappropriate messages"
}
```

**Expected:**
- [ ] HTTP 201 Created
- [ ] Response includes reportId, status: OPEN
- [ ] Report created in database

**Verify in database:**
```sql
SELECT id, reporterId, targetId, reason, status, createdAt 
FROM reports WHERE id = '{reportId}';
-- Expected: reporterId=user-a, targetId=user-b, reason=HARASSMENT, status=OPEN
```

### 3.2 Report — All Reasons
**Objective:** All reason types accepted

**Reasons to test:**
- [ ] HARASSMENT
- [ ] SPAM
- [ ] FAKE
- [ ] INAPPROPRIATE_CONTENT
- [ ] MINOR
- [ ] OTHER

**For each:**
1. Create report with that reason
2. Verify HTTP 201
3. Verify reason stored correctly

### 3.3 Report — Optional Details
**Objective:** Details field optional but captured

**Steps:**
1. Report WITHOUT details:
```json
{
  "targetId": "user-b-id",
  "reason": "SPAM"
}
```

**Expected:**
- [ ] HTTP 201
- [ ] details = null in database

**Steps:**
2. Report WITH details:
```json
{
  "targetId": "user-c-id",
  "reason": "HARASSMENT",
  "details": "This is a detailed description of the issue"
}
```

**Expected:**
- [ ] HTTP 201
- [ ] details captured correctly

### 3.4 Report — Self-Report Prevention
**Objective:** User cannot report themselves

**Steps:**
1. User-a calls: `POST /api/reports`
```json
{
  "targetId": "user-a-id",
  "reason": "SPAM"
}
```

**Expected:**
- [ ] HTTP 400 Bad Request
- [ ] Error: "Tu ne peux pas te signaler toi-même" (or similar)
- [ ] No report created

### 3.5 Report — Duplicate Prevention
**Objective:** Max 1 OPEN/REVIEWING report per couple

**Steps:**
1. User-a reports user-b (reason: HARASSMENT)
2. User-a tries to report user-b again (reason: SPAM)

**Expected:**
- [ ] First report: HTTP 201 ✅
- [ ] Second report: HTTP 400 or 409
- [ ] Error: "Un signalement ouvert existe déjà"
- [ ] Only 1 report in database

---

## Feature 4: Signaler depuis Lettres

### 4.1 Report from Letters — API Endpoint Exists
**Objective:** Verify `POST /api/reports` works (already tested in Feature 3)

This is same endpoint as Feature 3, so tests already cover it.

**Note:** At Phase 1, no UI for this. Endpoint is backend-only.
Frontend implementation deferred to Phase 2+.

---

## Feature 5: Vérifier Interdiction d'Envoyer Lettre Après Rupture/Blocage

### 5.1 Letter Send After Break — Rejected
**Objective:** sendLetter() rejects if match.status = BROKEN

**Setup:**
1. Create active match (user-a, user-b)
2. Both validate questions
3. User-a sends letter (works)
4. User-a breaks match: `DELETE /api/matches/{matchId}`
5. User-a tries to send another letter: `POST /api/matches/{matchId}/letters`

**Expected:**
- [ ] First letter: HTTP 201 ✅
- [ ] After break, sendLetter: HTTP 422 Unprocessable Entity
- [ ] Error: "Impossible d'envoyer une lettre — le match est en status 'BROKEN'"
- [ ] No letter created

### 5.2 Letter Send After Block — Rejected
**Objective:** sendLetter() rejects if match.status = BLOCKED

**Setup:**
1. Create active match (user-a, user-b)
2. User-a blocks match: `POST /api/matches/{matchId}/block`
3. User-a tries to send letter: `POST /api/matches/{matchId}/letters`

**Expected:**
- [ ] sendLetter: HTTP 422 Unprocessable Entity
- [ ] Error: "Impossible d'envoyer une lettre — le match est en status 'BLOCKED'"
- [ ] No letter created

### 5.3 Letter Send After Break — Match List Reflects Status
**Objective:** Match list shows BROKEN status

**Steps:**
1. Break match (from 5.1)
2. User-a calls: `GET /api/matches`

**Expected:**
- [ ] Match included in response
- [ ] Match.status = BROKEN
- [ ] Match.canSend = false
- [ ] Match.canSendReason = MATCH_NOT_ACTIVE (or similar)

---

## Feature 6: Discovery/Profil Respect Blocage (if already implemented)

**Note:** This is Phase 2 scope. Documenting here if already partially implemented.

### 6.1 Block Prevents Profile View (if implemented)
**Steps:**
1. User-a blocks user-b
2. User-b tries to view user-a's profile: `GET /profiles/{user-a-id}`

**Expected (if implemented):**
- [ ] HTTP 403 Forbidden
- [ ] Error: "Accès refusé" (or "Blocked by user")

**If not implemented:**
- [ ] Note: "Deferred to Phase 2"
- [ ] Not blocking

### 6.2 Block Prevents Discovery (if implemented)
**Steps:**
1. User-a blocks user-b
2. User-b tries to discover user-a: `GET /discover?skip=0&limit=50`

**Expected (if implemented):**
- [ ] User-a NOT in discovery results

**If not implemented:**
- [ ] Note: "Deferred to Phase 2"

### 6.3 Block Prevents Photo Access (if implemented)
**Steps:**
1. User-a blocks user-b
2. User-b tries to access user-a photo: `GET /photos/{photoId}`

**Expected (if implemented):**
- [ ] HTTP 403 Forbidden
- [ ] Photo not served

**If not implemented:**
- [ ] Note: "Deferred to Phase 2"
- [ ] Does not block

---

## Regression Testing

### R.1 Existing Letter Flows Still Work
**Objective:** Breaking/blocking doesn't break normal letter operations

**Steps:**
1. Create 2 active matches (not broken/blocked)
2. Send letters normally between them
3. Verify alternation still works
4. Verify photo reveal not affected

**Expected:**
- [ ] Letters send/receive normally
- [ ] Alternation enforced
- [ ] Photo unlock progresses correctly

### R.2 Questions Still Validated
**Objective:** Block/break doesn't affect questions

**Steps:**
1. Create match
2. Send question answers
3. Verify questions marked validated
4. Break match
5. Create new match (different partner)
6. Questions should still be validated

**Expected:**
- [ ] Questions work independently
- [ ] Break doesn't clear validation state

### R.3 Profile Access Unaffected
**Objective:** Breaking/blocking doesn't prevent profile access (Phase 1)

**Steps:**
1. User-a breaks match with user-b
2. User-a tries to view own profile: `GET /profiles/me`
3. User-a tries to view user-b profile: `GET /profiles/{user-b-id}`

**Expected:**
- [ ] Own profile: HTTP 200 ✅
- [ ] Other profile: HTTP 200 ✅ (Phase 1 doesn't restrict)

### R.4 Discover Unaffected
**Objective:** Breaking/blocking doesn't affect discovery (Phase 1)

**Steps:**
1. User-a breaks match with user-b
2. User-a calls: `GET /discover?skip=0&limit=10`

**Expected:**
- [ ] HTTP 200 ✅
- [ ] User-b may still appear (Phase 1 doesn't filter)

---

## Database Integrity Checks

### D.1 Block Constraints
```sql
-- Verify unique (fromId, toId)
SELECT COUNT(*), fromId, toId FROM blocks 
GROUP BY fromId, toId 
HAVING COUNT(*) > 1;
-- Expected: 0 rows (no duplicates)
```

### D.2 Match Status Consistency
```sql
-- Verify no match has invalid status
SELECT COUNT(*) FROM matches 
WHERE status NOT IN ('PENDING', 'ACTIVE', 'BROKEN', 'BLOCKED', 'GHOSTED');
-- Expected: 0 rows
```

### D.3 Report Status Valid
```sql
-- Verify all reports have valid status
SELECT COUNT(*) FROM reports 
WHERE status NOT IN ('OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED');
-- Expected: 0 rows
```

### D.4 Foreign Key Integrity
```sql
-- Verify all Block.fromId and Block.toId exist in users
SELECT COUNT(*) FROM blocks b 
WHERE b.fromId NOT IN (SELECT id FROM users) 
  OR b.toId NOT IN (SELECT id FROM users);
-- Expected: 0 rows
```

---

## Performance Checks

### P.1 Letter Send Latency
- [ ] `POST /api/matches/{matchId}/letters` completes in < 500ms (after break/block rejection)

### P.2 Block Creation Latency
- [ ] `POST /api/matches/{matchId}/block` completes in < 300ms

### P.3 Report Creation Latency
- [ ] `POST /api/reports` completes in < 200ms

---

## Security Validation

### S.1 Participant Verification
- [ ] Non-participants cannot break/block/report
- [ ] All endpoints verify ownership/participant

### S.2 No Information Leakage
- [ ] Breaking doesn't expose other user's data
- [ ] Blocking doesn't reveal match to public
- [ ] Report details only visible to mods (if implemented)

### S.3 Constraint Enforcement
- [ ] Cannot send letter after break: ✅ (see 5.1)
- [ ] Cannot send letter after block: ✅ (see 5.2)
- [ ] Cannot double-break: ✅ (see 1.3)
- [ ] Cannot double-block: ✅ (see 2.3)
- [ ] Cannot self-report: ✅ (see 3.4)

---

## Sign-Off

**Test Date:** _______________
**Tester:** _______________
**Environment:** staging

**Results:**
- [ ] All tests passed
- [ ] All regressions passed
- [ ] Database integrity verified
- [ ] Performance acceptable
- [ ] Security validated

**Issues Found (if any):**
```
(list here)
```

**Approval:** _______________

**Ready for production?**
- [ ] Yes — no blocking issues
- [ ] No — issues must be fixed before main merge

---

## Notes

- Test with real data (use staging database)
- Clear test data between runs if needed
- Document any unexpected behavior
- Reference PR #72 in any bug reports
- Phase 2 features (Phase 2 will restrict discovery/profiles)

---

**Checklist created:** 2026-05-18
**Duration estimate:** 45-60 minutes
