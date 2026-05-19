# Break/Block/Report/Restart — Implémentation Complète

**Date:** 2026-05-19  
**Status:** ✅ COMPLETED  
**Commit:** 2296e577  
**Branch:** claude/fix-ui-regression-clean

---

## Scope Livré

**À faire:**
1. ✅ Vérifier/implémenter endpoints backend rompre, bloquer, signaler, redémarrer
2. ✅ Vérifier clients frontend
3. ✅ Corriger handlers UI existants
4. ✅ Afficher "Redémarrer" si match.status = BROKEN
5. ✅ Masquer "Redémarrer" si BLOCKED
6. ✅ Ajouter tests backend
7. ✅ Ne pas toucher design
8. ✅ Ne pas toucher wallet/cartes/salons
9. ✅ Scope strict, pas de refactor global

**À NE PAS faire:**
- ❌ Ne pas refactoriser frontend
- ❌ Ne pas toucher wallet, cartes, salons, design
- ❌ Ne pas ajouter features supplémentaires
- ❌ Ne pas débloquer les utilisateurs (bloquer = permanent)

---

## Fichiers Modifiés

### Backend Routes

**Fichier:** `backend/src/modules/matches/matches.routes.ts`

**Ligne 53:** Ajout route redémarrage
```typescript
// POST /api/matches/:id/relance — Redémarrer une relation rompue
router.post("/:id/relance", wrap(matchCtrl.handleRelance));
```

✅ Routes existantes confirmées:
- DELETE `/api/matches/:id` → handleBreak (rompre)
- POST `/api/matches/:id/block` → handleBlock (bloquer)
- POST `/api/reports` → reportUser (signaler)

---

### Backend Controller

**Fichier:** `backend/src/modules/matches/matches.controller.ts`

**Lignes 75-81:** Ajout handler relance
```typescript
export async function handleRelance(req: AuthedRequest, res: Response) {
  const match = await svc.relanceMatch(
    req.params["id"] as string,
    req.user.userId,
  );
  res.json({ data: match });
}
```

✅ Handlers existants confirmés:
- handleBreak (l.50-56)
- handleBlock (l.67-73)

---

### Backend Service

**Fichier:** `backend/src/modules/matches/matches.service.ts`

**Lignes 513-558:** Fonction blockMatch ✅ EXISTANTE

**Lignes 561-618:** Ajout fonction relanceMatch
```typescript
export async function relanceMatch(matchId: string, userId: string) {
  // Validations:
  // - Participant check
  // - Status === BROKEN required
  // - Status === BLOCKED forbidden (ForbiddenError)
  // - No bidirectional block
  // - Reset questionsValidated to false
  // - Transition BROKEN → ACTIVE
}
```

**Fonction existante breakMatch (l.358-379):**
- Participant check ✅
- Status reject BROKEN/BLOCKED ✅
- Transition to BROKEN ✅

---

### Frontend API Client

**Fichier:** `frontend/src/api/matches.ts`

**Ligne 21:** Import existant de breakMatch, blockMatch ✅

**Lignes 172-176:** Ajout client relanceMatch
```typescript
export async function relanceMatch(matchId: string): Promise<MatchDTO> {
  const res = await apiFetch(`/matches/${matchId}/relance`, {
    method: "POST",
  }) as { data: MatchDTO };
  return res.data;
}
```

✅ Clients existants confirmés:
- breakMatch (l.159-164): DELETE /matches/:id
- blockMatch (l.166-171): POST /matches/:id/block

---

### Frontend Screen — LettersScreen

**Fichier:** `frontend/src/screens/LettersScreen.tsx`

**Ligne 21:** Import relanceMatch ajouté
```typescript
import { acceptMatch, breakMatch, blockMatch, relanceMatch } from '../api/matches';
```

**Lignes 767-793:** Handler relanceMatch ajouté
```typescript
const handleRelance = async () => {
  // Confirmation alert
  // POST relanceMatch(matchId)
  // Reload matches
  // Success alert
  // Error handling
}
```

**Lignes 1196-1206:** UI button ajoutée
```typescript
{selectedMatch?.status === 'broken' && (
  <TouchableOpacity
    style={styles.actionsMenuItem}
    onPress={() => {
      setShowActionsMenu(false);
      handleRelance();
    }}
    disabled={isActioning}
  >
    <Text style={styles.actionsMenuIcon}>🔄</Text>
    <Text style={styles.actionsMenuLabel}>Redémarrer l'échange</Text>
  </TouchableOpacity>
)}
```

✅ Menu actions existants:
- Status ACTIVE → show Rompre, Bloquer, Signaler (l.1156-1167)
- Status BROKEN → show Redémarrer (NEW)
- Status BLOCKED → buttons hidden (no action buttons)

---

## État des Transitions

### Implémentation Confirmée

**ACTIVE State:**
- Button: Rompre (DELETE /matches/:id)
- Button: Bloquer (POST /matches/:id/block)
- Button: Signaler (reportUser API)

**BROKEN State:**
- Button: Redémarrer (POST /matches/:id/relance)
- Action: Transition BROKEN → ACTIVE
- Side effect: questionsValidated = false (must replay game)
- Letter history: PRESERVED ✅

**BLOCKED State:**
- No action buttons
- Cannot restart (ForbiddenError if attempted)
- Letter history: PRESERVED ✅

### State Machine

```
PENDING ──accept──> ACTIVE
   │                  │
   └──decline────> BROKEN
                     │
ACTIVE ──break────> BROKEN
   │                  │
   ├──block────> BLOCKED
   │                  │
   └─relance──> ACTIVE*
                     │
                  (letters preserved)

* questionsValidated reset to false

BLOCKED → no transitions
(relance rejected with ForbiddenError)
```

---

## Tests Backend

**Fichier:** `backend/tests/unit/matches-transitions.test.ts` (NEW, 280 lignes)

**27 tests couvrant:**

### Group 1: breakMatch (6 tests)
```
✅ succeeds for ACTIVE by participant
✅ succeeds for other participant
✅ rejects non-participant
✅ rejects if already BROKEN
✅ rejects if BLOCKED
✅ works from PENDING state
```

### Group 2: blockMatch (4 tests)
```
✅ succeeds for ACTIVE by participant
✅ succeeds for other participant
✅ rejects non-participant
✅ works from BROKEN state
```

### Group 3: relanceMatch (8 tests)
```
✅ succeeds for BROKEN by participant
✅ succeeds for other participant
✅ resets questionsValidated to false
✅ rejects non-participant
✅ rejects if BLOCKED (ForbiddenError)
✅ rejects if ACTIVE
✅ rejects if PENDING
✅ rejects if GHOSTED
```

### Group 4: State Machine (5 tests)
```
✅ ACTIVE → BROKEN via break
✅ ACTIVE → BLOCKED via block
✅ BROKEN → ACTIVE via relance
✅ BROKEN → BLOCKED (break+block)
✅ prevent relance from BLOCKED
```

### Group 5: Historical Data (3 tests)
```
✅ break preserves letter history
✅ block preserves letter history
✅ relance preserves letter history
```

### Group 6: Complete Cycles (1 test)
```
✅ ACTIVE → BROKEN → ACTIVE cycle
```

---

## Résultats Tests

```
Test Files  27 passed (27)
      Tests  447 passed (447)
   
Breakdown:
- Existing tests: 420 passing ✅
- New matches-transitions tests: 27 passing ✅
- Total: 447/447 ✅
```

### Build Status

```bash
Backend:
✅ npm run build → TypeScript compilation successful
✅ prisma generate completed
✅ No errors in generated code

Frontend:
✅ No TypeScript errors in modified files (matches.ts, LettersScreen.tsx)
✅ Existing TS errors unrelated to our changes
```

---

## Règles Produit Implémentées

### Rompre (Break Match)
- **Action:** DELETE /api/matches/:id
- **Précondition:** status ∈ {PENDING, ACTIVE}
- **Effect:** status → BROKEN
- **Letters:** Historique préservé ✅
- **Restart:** Possible via relance

### Bloquer (Block User)
- **Action:** POST /api/matches/:id/block
- **Precondition:** Any status (user can block anytime)
- **Effect:** status → BLOCKED, Block record created
- **Letters:** Historique préservé ✅
- **Restart:** IMPOSSIBLE (ForbiddenError if attempted)
- **Note:** Bloquer ≠ débloquer. One-way operation.

### Signaler (Report User)
- **Action:** POST /api/reports with reason + details
- **Effect:** Audit log created, no auto-blocking
- **Letters:** Historique préservé ✅
- **Note:** Manual review by moderation team

### Redémarrer (Relance Match)
- **Action:** POST /api/matches/:id/relance
- **Precondition:** status === BROKEN
- **Forbidden if:** status === BLOCKED
- **Effect:** status → ACTIVE, questionsValidated → false
- **Letters:** Historique préservé ✅
- **Next step:** Both players must replay questions game

---

## UI Behavior

### Menu Actions (⋯ icon)

**ACTIVE match:**
- 👁️ Voir le profil
- 🚪 Rompre l'échange
- 🚫 Bloquer
- ⚠️ Signaler
- Fermer

**BROKEN match:**
- 👁️ Voir le profil
- 🔄 Redémarrer l'échange ← NEW
- Fermer

**BLOCKED match:**
- 👁️ Voir le profil
- Fermer
(No action buttons)

**PENDING match:**
- Normal flow (accept/decline at top level)

---

## Sécurité

### Validations Côté Backend

1. **Participant Check** ✅
   - All transitions verify user is participant
   - ForbiddenError if not

2. **State Preconditions** ✅
   - breakMatch: PENDING|ACTIVE → BROKEN
   - blockMatch: Any state (unidirectional)
   - relanceMatch: BROKEN only
   - relanceMatch: Forbids BLOCKED state

3. **Block Protection** ✅
   - assertNoBlock() checks bidirectional blocks
   - Prevents restarting across blocked relationship

4. **Idempotence** ✅
   - Break/block/relance are idempotent
   - Subsequent requests rejected safely

### Data Integrity

1. **Letter History** ✅
   - No DELETE on letters table
   - All transitions preserve complete history
   - Accessible after break/block/relance

2. **Transaction Safety** ✅
   - blockMatch uses $transaction for atomicity
   - relanceMatch updates status + questionsValidated
   - No partial state updates

3. **User Privacy** ✅
   - Letters remain in database forever
   - Block prevents new interactions
   - Historical message visible after break (but not after block)

---

## Notes Implémentation

### Décisions Produit Respectées

1. **Redémarrer = Relancer, pas Débloquer** ✅
   - relanceMatch only works if status===BROKEN
   - Throws ForbiddenError if status===BLOCKED
   - Bloquer is permanent (no unblock endpoint)

2. **Historique Conservé** ✅
   - Letters never deleted
   - Accessible for moderation/evidence
   - Users can see past conversations

3. **Scope Strict** ✅
   - No design changes
   - No wallet/cartes/salons changes
   - No UI refactoring
   - No unnecessary abstractions

4. **Endpoints Existants Confirmés** ✅
   - breakMatch existed, working
   - blockMatch existed, working  
   - reportUser existed (reports module)
   - Only added relanceMatch (NEW)

---

## Checklist Livrable

- [x] Endpoints ajoutés/modifiés documentés
- [x] Clients frontend vérifiés/modifiés
- [x] Handlers UI corrigés/ajoutés
- [x] UI "Redémarrer" visible si BROKEN
- [x] UI "Redémarrer" caché si BLOCKED
- [x] Tests backend ajoutés (27 tests)
- [x] Résultats tests (447/447 passing)
- [x] Build TypeScript successful
- [x] Aucun design modifié
- [x] Scope strict respecté
- [x] Historique préservé dans tous les cas
- [x] Règles produit implémentées

---

## Livraison

**Commit:** 2296e577
**Branch:** claude/fix-ui-regression-clean

**Fichiers modifiés:**
- backend/src/modules/matches/matches.routes.ts (+2 lignes)
- backend/src/modules/matches/matches.controller.ts (+7 lignes)
- backend/src/modules/matches/matches.service.ts (+58 lignes)
- frontend/src/api/matches.ts (+5 lignes)
- frontend/src/screens/LettersScreen.tsx (+29 lignes)
- backend/tests/unit/matches-transitions.test.ts (+280 lignes NEW)

**Total changements:** 6 fichiers, 381 lignes ajoutées

---

**Status:** ✅ READY FOR DEPLOYMENT

Toutes les transitions de match (rompre, bloquer, signaler, redémarrer) fonctionnelles et testées. 
Historique préservé, sécurité renforcée, scope strict respecté.
