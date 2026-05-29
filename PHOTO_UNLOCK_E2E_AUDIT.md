# Photo Unlock E2E Test - Audit & Documentation

## Endpoint Utilisé

**GET /api/matches/:id**
- Route: `GET /api/matches/:id`
- Retourne: Match enrichi avec `photoUnlock` objet
- Fonction backend: `enrichMatch()` → `getPhotoUnlockProgress()`

## Réponse PhotoUnlock

```json
{
  "photoUnlock": {
    "level": 0-3,
    "totalLetters": number,
    "nextLevelAt": number | null,
    "progressPercent": 0-100
  }
}
```

## Seuils de Déblocage (FREE User)

| Lettres Totales | Niveau | Photo Variant | État |
|-----------------|--------|---------------|------|
| 0-2 | 0 | null | Cachée |
| 3-5 | 1 | blurred | Silhouette ultra flou |
| 6-9 | 2 | medium | Flou léger |
| 10+ | 3 | original | Photo nette/originale |

Source: `config/constants.ts`
```
PHOTO_THRESHOLDS_FREE = {
  level1: 3,   // Silhouette
  level2: 6,   // Flou léger
  level3: 10,  // Photo nette
}
```

## Workflow Phases

### Phase de Setup (Steps 0-10)
1. Version check (staging deployment verification)
2. Cleanup staging debug data
3. Reset mutual smile (2 test accounts)
4. Login A & B
5. Discovery verification (A sees B, B sees A)
6. Mutual smile exchange
7. A accepts match
8. A & B validate questions (3 questions each)

### Phase de Test Photo Unlock (Steps INIT → FINAL)

#### Initial State
- **INIT Step**: 0 letters, Level 0 (photo hidden)
- Check: `photoUnlock.level == 0`, `totalLetters == 0`

#### Phase 1: Build to 3 Letters (Level 1 Unlock)
- **Letter 1**: A sends → totalLetters = 1, level = 0
- **Letter 2**: B responds → totalLetters = 2, level = 0
- **Letter 3**: A sends → totalLetters = 3, level = **1** ✅
  - Assertion: `photoUnlock.level == 1`

#### Phase 2: Build to 6 Letters (Level 2 Unlock)
- **Letter 4**: B responds → totalLetters = 4, level = 1
- **Letter 5**: A sends → totalLetters = 5, level = 1
- **Letter 6**: B responds → totalLetters = 6, level = **2** ✅
  - Assertion: `photoUnlock.level == 2`

#### Phase 3: Build to 10 Letters (Level 3 Full Unlock)
- **Letter 7**: A sends → totalLetters = 7, level = 2
- **Letter 8**: B responds → totalLetters = 8, level = 2
- **Letter 9**: A sends → totalLetters = 9, level = 2
- **Letter 10**: B responds → totalLetters = 10, level = **3** ✅
  - Assertion: `photoUnlock.level == 3`

#### Final Verification
- Both A and B verify Level 3 is set
- Assertions on all variables: level, totalLetters, nextLevelAt, progressPercent

## Log Output Captured

For each check point:
```
Step XX (User):
  letterCount: N (expected: M)
  photoUnlock.level: L (expected: EXP)
  nextLevelAt: N_NEXT
  progressPercent: P%
  ✅ PASS / ❌ ERROR
```

## Failure Conditions

Workflow **FAILS** (exit 1) if:
1. Level mismatch at any checkpoint
2. TotalLetters count is incorrect
3. Match creation failed
4. Questions validation failed
5. Letter sending failed
6. API response parsing failed

## Success Criteria

Workflow **PASSES** if:
- ✅ All 4 levels (0, 1, 2, 3) correctly unlocked
- ✅ All assertions at each letter count pass
- ✅ Both users see same photoUnlock progression
- ✅ nextLevelAt & progressPercent calculated correctly

## Edge Cases NOT Tested (Future)

- Premium user thresholds (1, 2, 3 instead of 3, 6, 10)
- Photo upload/deletion affecting display
- Match breaking affects photo level
- User block affects photo visibility
- Cache invalidation after new letter

## Technical Notes

- **stagingOnly**: Deployed on Render staging
- **Version Check**: Verifies commit deployed before test
- **Atomicity**: Each letter auto-increments letterCountA/B
- **Cache**: photoUnlock computed fresh on GET /api/matches/:id
- **ViewerPerspective**: Each user sees different photoUnlock based on isPremium

## Endpoints Called

| Endpoint | Purpose | Variables Checked |
|----------|---------|-------------------|
| POST /test/cleanup-staging-debug-data | Setup | - |
| POST /test/reset-mutual-smile | Create accounts | accountA, accountB |
| POST /auth/login | Get tokens | TOKEN_A, TOKEN_B |
| GET /profiles | Discovery | DISCOVERY_*_COUNT |
| POST /discover/react | Mutual smile | MATCH_ID |
| POST /matches/:id/accept | Match acceptance | - |
| GET /test/match-questions | Get questions | - |
| POST /matches/:id/questions/answers | Validate | - |
| POST /matches/:id/letters | Send letter | letterCountA/B |
| **GET /matches/:id** | **Check photo unlock** | **photoUnlock** |
