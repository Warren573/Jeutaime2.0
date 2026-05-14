# Spécification Finale: Photo Reveal System

**Status:** À VALIDER avant implémentation  
**Objectif:** Règles précises + cohérence backend/frontend  
**Principe:** Récompenser engagement + progression relationnelle, pas équilibre mathématique

---

## 1. Logique Globale

### Changement Principal
```
AVANT (Backend):  myLetters >= 10 AND otherLetters >= 10  (asymétrique)
APRÈS (Nouveau):  totalLetters >= seuil  (symétrique, comme frontend)
```

### Why Symétrique?
- ✓ User A très actif (50 lettres) reçoit sa récompense
- ✓ Pas pénalisé pour attendre réponse de User B
- ✓ Progression continue (pas binaire)
- ✓ Aligne avec effet émotionnel "découverte progressive"

---

## 2. Règles FREE Users

### Seuils (Total Lettres = CountA + CountB)

| Niveau | Lettres | Affichage | Variante Servie | Description |
|--------|---------|-----------|-----------------|-------------|
| **0** | 0–2 | Avatar | — | Juste l'avatar de profil |
| **1** | 3–5 | Silhouette/Ultra Flou | blurredPath (90% flou) | Aperçu extrême flou |
| **2** | 6–9 | Flou Léger | blurMediumPath (40% flou) | Révélation progressive |
| **3** | 10+ | Photo Nette | originalPath | Complètement déverrouillée |

### Progression
```
0 lettres  →  Avatar  →  "Commence à écrire pour découvrir"
3 lettres  →  Ultra flou  →  "Aperçu en ultra flou"
6 lettres  →  Flou léger  →  "Photo légèrement floue"
10 lettres →  Clair  →  "Photo complètement révélée"
```

### Points clés
- Niveau 0 très court (2 lettres max) - force action rapide
- Chaque transition visible + récompensante
- Level 2 (6 lettres) crée le "moment wow" intermédiaire
- Level 3 (10 lettres) = déverrouillage complet

---

## 3. Règles PREMIUM Users

### Deux Options Possibles

#### Option 3A: Accès Immédiat Niveau 3
```
PREMIUM user can see photos immediately = Level 3
```
- ✓ Valeur premium claire (pas de progression)
- ✗ Détruit l'effet de découverte pour eux
- ✗ Moins engageant

#### Option 3B: Seuils Réduits (RECOMMANDÉ)
```
Niveau 0: 0 lettres      → Avatar
Niveau 1: 1 lettre       → Silhouette ultra flou
Niveau 2: 2 lettres      → Flou léger
Niveau 3: 3+ lettres     → Photo nette
```

- ✓ Garde la progression (découverte rapide)
- ✓ Fait sentir "premium = accès plus rapide"
- ✓ Toujours gratifiant (progression plus rapide)
- ✓ Préserve UX cohérente

**CHOIX:** Option 3B (seuils réduits, pas suppression)

---

## 4. Variantes Photo Stockées & Servies

### Fichiers Générés en Upload
```
/storage/photos/{userId}/
  ├── {photoId}_original.webp    (complet, 100%)
  ├── {photoId}_blurred.webp     (90% flou, silhouette)
  └── {photoId}_medium.webp      (40% flou, révélation)
```

### Règle de Service
```
GET /api/photos/file/{photoId}/original  → originalPath (si level 3)
GET /api/photos/file/{photoId}/blurred   → blurredPath (si level 0-1)
GET /api/photos/file/{photoId}/medium    → blurMediumPath (si level 2)
```

### API Response: /api/photos/user/:userId
```json
{
  "data": [
    {
      "id": "photo123",
      "url": "/api/photos/file/photo123/original",
      "variant": "original"  // ou "blurred", "medium"
    }
  ],
  "meta": {
    "unlocked": true,
    "level": 3,
    "nextLevel": null,
    "lettersUntilNext": 0
  }
}
```

---

## 5. Détails Techniques

### Backend Changes

**File: `backend/src/policies/photoUnlock.ts`**
```typescript
export interface UnlockContext {
  totalLetters: number;  // CHANGE: was myLetterCount + otherLetterCount
  viewerIsPremium: boolean;
}

export function getPhotoLevel(ctx: UnlockContext): 0 | 1 | 2 | 3 {
  const threshold = ctx.viewerIsPremium ? PREMIUM_THRESHOLDS : FREE_THRESHOLDS;
  
  if (ctx.totalLetters >= threshold.level3) return 3;
  if (ctx.totalLetters >= threshold.level2) return 2;
  if (ctx.totalLetters >= threshold.level1) return 1;
  return 0;
}

export function getPhotoVariant(level: 0 | 1 | 2 | 3): "original" | "blurred" | "medium" {
  switch (level) {
    case 3: return "original";
    case 2: return "medium";
    case 1: return "blurred";
    case 0: return null;  // No photo
  }
}
```

**File: `backend/src/config/constants.ts`**
```typescript
// FREE Users
export const FREE_PHOTO_THRESHOLDS = {
  level1: 3,   // Silhouette
  level2: 6,   // Flou léger
  level3: 10,  // Clair
};

// PREMIUM Users
export const PREMIUM_PHOTO_THRESHOLDS = {
  level1: 1,   // Silhouette
  level2: 2,   // Flou léger
  level3: 3,   // Clair
};
```

**File: `backend/src/modules/photos/photos.service.ts`**
```typescript
// listPhotosForViewer CHANGE:
// - Toujours retourner photos (jamais [])
// - Ajouter variant basé sur level
// - Ajouter meta: { level, nextLevel, lettersUntilNext }

// resolvePhotoForStream CHANGE:
// - Utiliser variant parameter (actuellement ignoré)
// - Retourner variant appropriée (original/blurred/medium)
// - Si level=0, retourner 403 "Avatar only at this stage"
```

**File: `backend/src/modules/photos/photos.urls.ts`**
```typescript
export type PhotoVariant = "original" | "blurred" | "medium";
// CHANGE: was just "original"
```

### Frontend: NO CHANGES NEEDED
- RelationEngine.ts déjà bon
- match-profile.tsx déjà bon
- API responses correctement gérées

---

## 6. Cas d'Usage Validés

### Cas 1: User Passif (Free)
```
A: 50 lettres
B: 1 lettre
Total: 51
→ Frontend: Level 3 (10+)
→ Backend: getPhotoLevel(51, false) = 3
→ Serve: originalPath ✅
```

### Cas 2: Progression Visible (Free)
```
0 lettres → Avatar
3 lettres → "Hmm, une silhouette apparaît"
6 lettres → "Oh, je vois mieux maintenant!"
10 lettres → "Voilà la photo claire"
```

### Cas 3: Premium Accès Rapide
```
1 lettre → Premium user
→ Level 1 (silhouette visible)
→ User sent 1 letter → gets silhouette immediately
→ Feels like premium benefit ✅
```

### Cas 4: Blocked User (Remains Same)
```
Même si 100 lettres totales:
- Si blocked = forbidden
- Photos jamais visibles
```

---

## 7. Database Migration (Optional)

**Si optimisation future:**
```sql
-- Add index pour photo lookups rapides
CREATE INDEX idx_photo_userid ON Photo(userId);
CREATE INDEX idx_match_lettercount ON Match(letterCountA, letterCountB);
```

**Migration SQL** (if data reset needed):
```sql
-- Pas de changement de schéma
-- Juste reset des compteurs si nécessaire
UPDATE Match SET letterCountA = 0, letterCountB = 0;
```

---

## 8. Test Plan (Avant Déploiement)

### Unit Tests à Ajouter
```
✓ getPhotoLevel(0, false) = 0
✓ getPhotoLevel(3, false) = 1
✓ getPhotoLevel(6, false) = 2
✓ getPhotoLevel(10, false) = 3
✓ getPhotoLevel(1, true) = 1
✓ getPhotoLevel(3, true) = 3
✓ getPhotoVariant(0) = null
✓ getPhotoVariant(3) = "original"
✓ Variant changes as letters increase
```

### Integration Tests
```
✓ POST /auth/register → User created
✓ POST /discover/react (User A smile User B) → No photo access yet
✓ POST /discover/react (User B smile) → Match created (1+1=2 lettres)
✓ GET /api/photos/user/B (from A) → Level 0, no photos
✓ POST /letters (User A to B) → letterCountA = 1
✓ GET /api/photos/user/B (from A) → Level 1, blurred variant
✓ POST /letters (3 more times) → Total = 4
✓ GET /api/photos/user/B (from A) → Level 2, medium variant
✓ POST /letters (6 more times) → Total = 10
✓ GET /api/photos/user/B (from A) → Level 3, original variant
```

### Manual Testing (Frontend Web)
1. Create 2 users
2. Exchange 0 letters → Avatar only
3. Exchange 3 letters → Ultra blurred photo visible
4. Exchange 6 letters → Lighter blur
5. Exchange 10 letters → Clear photo
6. Verify progress indicator shows "X more letters needed"

---

## 9. Rollout Timeline

### Phase 1: Code & Test (2-3 days)
- [ ] Modify photoUnlock.ts, constants.ts, photos.service.ts
- [ ] Write unit tests
- [ ] Run integration tests

### Phase 2: Staging Deploy (1 day)
- [ ] Deploy to staging environment
- [ ] Manual testing on staging
- [ ] Verify progression works end-to-end

### Phase 3: Production Deploy (1 day)
- [ ] Deploy to production
- [ ] Monitor logs for errors
- [ ] Verify live data (sample matches)

### Phase 4: Monitor & Adjust (Ongoing)
- [ ] Track engagement metrics
- [ ] Check if progression feels natural
- [ ] Adjust thresholds if needed

---

## 10. Risk Mitigation

### Risk: Current Matches "Suddenly" Unlock
**Impact:** Users with 20+ letters suddenly see level 3  
**Mitigation:** Expected + desired (they earned it)

### Risk: Storage Space (3 variants per photo)
**Impact:** 3x storage vs 1x before  
**Mitigation:** WebP compression + set max 5MB per original

### Risk: Variant Mismatch (User sees medium but photo is original)
**Impact:** User confused by quality change  
**Mitigation:** Consistent variant serving + test thoroughly

### Rollback Plan
```bash
# If critical issue:
git revert <commit>
Deploy previous version
Reset letterCount if data corrupted
```

---

## 11. Validation Gate

**BEFORE implementing, confirm:**

- [ ] FREE thresholds correct? (3, 6, 10)
- [ ] PREMIUM thresholds correct? (1, 2, 3)
- [ ] Variant serving strategy clear? (original/medium/blurred)
- [ ] No photo at level 0? (Avatar only)
- [ ] Premium logic acceptable? (Reduced thresholds, not instant)
- [ ] Test plan feasible?
- [ ] Storage concerns addressed?

---

**STATUS:** Règles verrouillées, en attente de validation finale avant implémentation.

