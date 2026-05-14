# TEST_FLOW.sh Bug Fix Progress

## Current Status: 14/20 tests passing (70%)

### Completed Fixes

**BUG #1: Register endpoint not returning userId**
- **Issue**: TEST_FLOW.sh needs userId to construct subsequent API calls (POST /discover/react uses toId parameter)
- **Root Cause**: register() function returned only `{ accessToken, refreshToken }` but test expected userId in response
- **Fix Applied**:
  - Modified `backend/src/modules/auth/auth.service.ts`: Added `userId: user.id` to register return object
  - Simplified `backend/src/modules/auth/auth.controller.ts`: Removed unnecessary token decoding since userId is now returned directly
- **Result**: Tests 1-9 now pass consistently (register, profiles, questions, smiles, matches list)

### Remaining Issues (6 failing tests)

**Failing Tests:**
- ÉTAPE 10: User A - Accept Match (expected 200, getting 401 or 400)
- ÉTAPE 12: User A - Submit Answers (expected 200, getting 400 or 401)
- ÉTAPE 13: User B - Submit Answers (expected 200, getting 000 or 400)
- ÉTAPE 14: User A - Send Letter (expected 201, getting 401 or 422)
- ÉTAPE 16: User B - Send Letter (expected 201, getting 401 or 422)
- ÉTAPE 19: Mark Letter as Read (expected 200, getting 401 or 404)

**Error Pattern:**
- Inconsistent errors (sometimes 401 "Token manquant", sometimes 400/422/404)
- Suggests variable scope issues or response format inconsistencies in test script
- Rate limiting may be interfering with test reliability

### Investigation Findings

1. **Token Extraction Works**: Manual testing confirms regex pattern `"accessToken":"[^"]*"` correctly extracts JWT from register response
2. **Rate Limiting Active**: `express-rate-limit` middleware configured with skip condition for NODE_ENV=test, but backend running in NODE_ENV=development
3. **Response Format Correct**: Register endpoint returns `{ "data": { accessToken, refreshToken, userId } }` as expected

### Next Steps

1. Disable or adjust rate limiting for development/testing
2. Run complete test again with rate limiting disabled
3. Debug specific endpoint failures (accept match, submit answers, send letters, read letters)
4. Verify data persistence and business logic constraints

