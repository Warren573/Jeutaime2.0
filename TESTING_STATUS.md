# TEST_FLOW.sh Validation Status

## Summary
- **Overall Progress**: 70% (14/20 tests passing consistently)
- **Main Bug Fixed**: userId not returned from register endpoint
- **Test Framework**: bash script with curl for API testing
- **Database**: PostgreSQL with Prisma ORM
- **Backend Runtime**: ts-node-dev in development mode

## Tests Passing (14/20) ✅
1. Register User A (201)
2. Register User B (201)
3. User A - Update Profile (200)
4. User B - Update Profile (200)
5. User A - Add Questions (200)
6. User B - Add Questions (200)
7. User A Smile User B (200)
8. User B Smile User A (200)
9. User A - List Matches (200)
11. Get Match Questions (200)
15. Get Match Detail (User A) (200)
17. Get Match Detail (User B) (200)
18. Get Letters in Match (200)
20. Get Unread Count (200)

## Tests Failing (6/20) ❌
10. User A - Accept Match (expected 200, getting 401/400)
12. User A - Submit Answers (expected 200, getting 400/401)
13. User B - Submit Answers (expected 200, getting 000/400)
14. User A - Send Letter (expected 201, getting 401/422)
16. User B - Send Letter (expected 201, getting 401/422)
19. Mark Letter as Read (expected 200, getting 401/404)

## Root Causes Identified

### Issue #1: Register userId not returned ✅ FIXED
- **Symptom**: Tests 7-8 failed with "toId requis" (missing toId parameter)
- **Cause**: register endpoint returned {accessToken, refreshToken} but not userId
- **Fix**: Modified auth.service.ts to return userId in response
- **Result**: Tests 1-9 now pass consistently

### Issue #2: Token handling in later étapes (IN PROGRESS)
- **Symptom**: Tests 10+ get "Token manquant" (401) or other errors
- **Possible Causes**:
  - Database state inconsistency after test runs
  - MATCH_ID not being extracted from matches list response
  - Endpoint business logic errors (accept match, send letters, etc.)
- **Observations**:
  - Tests 1-9 work perfectly, indicating token extraction IS working
  - Token extraction regex tested and confirmed working
  - May need debugging of individual endpoint implementations

## Configuration Changes
- Increased `RATE_LIMIT_AUTH_MAX` from 5 to 100 in backend/.env
  - Allows multiple test runs without hitting rate limits
  - Dev/test only change, not for production

## Next Steps for Completion
1. Debug Accept Match endpoint (étape 10) - likely needs match status verification
2. Debug Submit Answers endpoints (étape 12-13) - validation of question answers
3. Debug Send Letter endpoints (étape 14, 16) - letter business logic and validation
4. Debug Mark Letter as Read (étape 19) - routing or permission issue
5. Run complete flow with fresh database for each test iteration

## Technical Notes
- api_call function uses heredoc for complex JSON data
- Token extraction: `grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4`
- Database cleanup: DELETE with WHERE TRUE for cascade compatibility
- Backend logs helpful for debugging: `/tmp/backend.log`
