# Match Breaking E2E Test - Audit & Documentation

## Endpoint

**DELETE /api/matches/:id**
- Function: `breakMatch(matchId, userId)`
- Input: matchId (path param), userId (from token)
- Output: Match with `status = BROKEN`
- File: `backend/src/modules/matches/matches.service.ts:358`

## Match Status Flow

```
PENDING ──accept──> ACTIVE
                      │
                    break│
                      │
                      ↓
                   BROKEN
```

Valid statuses:
- `PENDING`: Awaiting acceptance
- `ACTIVE`: Match active, exchange ongoing
- `BROKEN`: Match terminated by one user
- `BLOCKED`: User blocked other user
- `GHOSTED`: Inactivity detected (5+ days)

## Breaking Logic

```typescript
breakMatch(matchId, userId) {
  1. Verify match exists
  2. Verify userId is participant (A or B)
  3. Verify status is not already BROKEN or BLOCKED
  4. Update: match.status = BROKEN
  5. Return enriched match
}
```

## Effects After Breaking

### 1. Letter Sending (BLOCKED)

File: `backend/src/modules/letters/letters.service.ts:69`

```typescript
if (match.status !== MatchStatus.ACTIVE) {
  throw UnprocessableError(
    `Impossible d'envoyer une lettre — le match est en status "${match.status}"`
  )
}
```

**Behavior:**
- Both users blocked from sending
- Error: Status validation fails (BROKEN ≠ ACTIVE)
- Both A and B see same error when attempting POST /api/matches/:id/letters

### 2. Discovery Filtering (PROFILES REMAIN EXCLUDED)

File: `backend/src/modules/profiles/profiles.service.ts:265-282`

```typescript
getExistingMatchUserIds(userId):
  - Find matches where: status IN [ACTIVE, PENDING, BROKEN, BLOCKED, GHOSTED]
  - Return user IDs from those matches
  - BROKEN status is INCLUDED in filter
```

**Critical Finding:**
- Profile of other user remains EXCLUDED from discovery
- Even though match is BROKEN, it's still considered "existing"
- NO rediscovery (users cannot see each other in discovery after breaking)
- This is current behavior - not a bug, but important for test

### 3. Letter History (PRESERVED & READABLE)

File: `backend/src/modules/letters/letters.service.ts:160`

```typescript
listLetters(matchId, userId):
  - No status check
  - Returns all letters in match
  - Read-only access
```

**Behavior:**
- Letters remain accessible
- Can view conversation history
- Cannot send new letters
- GET /api/matches/:id/letters returns all previous messages

### 4. Match Details (VISIBLE AS BROKEN)

File: `backend/src/modules/matches/matches.service.ts:168-232`

```typescript
enrichMatch():
  - Returns match with status=BROKEN
  - photoUnlock still calculated
  - canSend = false (based on status)
  - All metadata preserved
```

**Behavior:**
- Match appears in GET /api/matches list with status=BROKEN
- Match accessible via GET /api/matches/:id
- Frontend can show "Match Broken" UI
- Timestamp when broken is preserved

## Workflow Test Coverage

### Phase 1: Setup (Steps 0-8)
1. Version check (staging verification)
2. Cleanup staging data
3. Reset mutual smile (2 test accounts)
4. Login A & B
5. Mutual smile exchange
6. Match acceptance
7. Questions validation (both users)
8. Send first letter (verify working before break)

### Phase 2: Breaking (Steps 9-15)

#### Step 9: Pre-Breaking State Verification
- Check: `match.status == ACTIVE`
- Check: `canSend == true`
- Assertion: Both conditions true before breaking

#### Step 10: Execute Breaking
- Call: `DELETE /api/matches/:id` as user A
- Check: Response contains `status = BROKEN`
- Assertion: Status changed from ACTIVE to BROKEN

#### Step 11: Post-Breaking State Verification
- Call: `GET /api/matches/:id` after break
- Check: `match.status == BROKEN` (persisted)
- Check: `canSend == false` (calculated)
- Assertion: Status remains BROKEN

#### Step 12: Letter Sending Blocked (User A)
- Call: `POST /api/matches/:id/letters` as user A
- Expected: Error response (status mismatch)
- Assertion: Must fail with error about status

#### Step 13: Letter Sending Blocked (User B)
- Call: `POST /api/matches/:id/letters` as user B
- Expected: Error response
- Assertion: Both users equally blocked

#### Step 14: Letter History Preserved
- Call: `GET /api/matches/:id/letters`
- Expected: Original letters still present
- Assertion: At least 1 letter in response

#### Step 15: Discovery Exclusion
- Call: `GET /api/profiles?pageSize=50` as user A
- Expected: User B NOT in results
- Assertion: Profile remains excluded (BROKEN matches still excluded)

## Failure Conditions

Workflow **FAILS** (exit 1) if:

1. **Break operation fails** (Step 10)
   - Status not BROKEN after DELETE
   - Response parsing fails
   - Match not accessible

2. **Status persistence fails** (Step 11)
   - Status changes from BROKEN
   - canSend = true after break

3. **Letter blocking fails** (Steps 12-13)
   - User can send letter after breaking
   - No error response
   - Letter created successfully

4. **History loss** (Step 14)
   - Letters disappear after breaking
   - Cannot access conversation

5. **Discovery reappears** (Step 15)
   - Profile visible in discovery after breaking
   - (Warning only - may be design change)

## Success Criteria

Workflow **PASSES** if:
- ✅ Match status transitions ACTIVE → BROKEN
- ✅ Both users blocked from sending after break
- ✅ Error response on letter send attempt
- ✅ Letters remain readable as history
- ✅ Profiles excluded from discovery (expected behavior)
- ✅ GET /api/matches/:id shows BROKEN status

## Endpoints Called

| Endpoint | Purpose | Key Variable |
|----------|---------|--------------|
| POST /test/cleanup-staging-debug-data | Setup | - |
| POST /test/reset-mutual-smile | Create accounts | accountA, accountB |
| POST /auth/login | Get tokens | TOKEN_A, TOKEN_B |
| POST /discover/react | Mutual smile | MATCH_ID |
| POST /matches/:id/accept | Accept match | - |
| GET /test/match-questions | Get questions | - |
| POST /matches/:id/questions/answers | Validate | - |
| POST /matches/:id/letters | Send letter | LETTER_ID (before break) |
| **DELETE /matches/:id** | **BREAK MATCH** | **status=BROKEN** |
| GET /matches/:id | Get match details | status (after break) |
| POST /matches/:id/letters | Try send (blocked) | error response |
| GET /matches/:id/letters | Get history | letters count |
| GET /profiles | Discovery check | DISCOVERY_HAS_B |

## Edge Cases NOT Tested (Future)

- Can BROKEN match be "relanced" (BROKEN → ACTIVE)?
- Behavior if match is PENDING when broken?
- Simultaneous break by both users?
- GHOSTED → BROKEN flow?
- Letter deletion or modification?
- Match breaking notifications?
- Premium user behavior (same rules)?
- Block after break (idempotence)?

## Important Notes

### "NO REDISCOVERY" Finding
Unlike the name suggests, breaking a match does NOT cause profile rediscovery.
The implementation includes BROKEN status in `getExistingMatchUserIds()` filter,
meaning profiles remain hidden from discovery permanently after breaking.

This is the **current behavior** and tests verify it - not a bug.

### Letter Access Philosophy
Broken matches preserve message history for conversation context.
Users can review what was said, but cannot continue the conversation.
This is similar to email with blocked contacts - history visible, new messages blocked.

### Status Persistence
Once BROKEN, match remains BROKEN permanently.
There is no auto-recovery or status change unless explicitly relanced.
