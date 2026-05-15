# Frontend Integration Report - Photo Reveal System

## Summary
Integration test reveals **4 critical bugs** between backend (new progressive photo reveal system) and frontend (still expecting old binary system).

**Status**: ❌ NOT READY FOR PRODUCTION - Real bugs found, minimal fixes identified

---

## Bug #1: Premium Thresholds Mismatch

**Location**: `frontend/src/engine/RelationEngine.ts` (lines 14-17)

### Current Frontend Code
```typescript
export const RELATION_THRESHOLDS = {
  normal:  { level2: 6,  level3: 10 },
  premium: { level2: 3,  level3: 5 },  // ← WRONG
} as const;
```

### Expected Backend Values
```typescript
// Backend sends:
PREMIUM: level1 @ 1, level2 @ 2, level3 @ 3
```

### Impact
- Premium users see progression at wrong times
- Level 2 expected at 3 letters, backend sends it at 2
- Level 3 expected at 5 letters, backend sends it at 3
- Frontend will show progress bars at incorrect percentages

### Affected Users
Premium users viewing matches will see wrong relation level and progress text.

### Minimal Fix
```typescript
export const RELATION_THRESHOLDS = {
  normal:  { level2: 6,  level3: 10 },
  premium: { level2: 2,  level3: 3 },  // ← CORRECTED
} as const;
```

---

## Bug #2: Missing PhotoUnlock Data Structure

**Locations**:
- `frontend/src/api/matches.ts` (lines 21-26)
- `frontend/src/api/profiles.ts` (lines 41-46)

### Current Frontend Types
```typescript
export interface PhotoUnlockDTO {
  threshold: number;
  myCount: number;
  otherCount: number;
  unlocked: boolean;
}
```

### Expected Backend Response
```typescript
{
  level: 0 | 1 | 2 | 3;
  totalLetters: number;
  nextLevelAt: number | null;
  progressPercent: number;
}
```

### Impact
- Type mismatch causes TypeScript errors
- Components accessing `photoUnlock.unlocked` get `undefined`
- Frontend can't compute photo visibility correctly

### Affected Components
- `ProfileDetailScreen.tsx` (line 216): checks `profileData?.photoUnlock?.unlocked`
- Any match detail view

### Minimal Fix
```typescript
export interface PhotoUnlockDTO {
  level: 0 | 1 | 2 | 3;
  totalLetters: number;
  nextLevelAt: number | null;
  progressPercent: number;
}
```

---

## Bug #3: 3-Level vs 4-Level Photo System

**Location**: `frontend/src/engine/RelationEngine.ts` (lines 10-11, 47-50)

### Current Frontend
```typescript
export type PhotoVisibility = 'avatar' | 'blurred' | 'revealed';
export type RelationLevel = 1 | 2 | 3;

// Only 3 levels (1-3), missing level 0
```

### Expected Backend
```typescript
PhotoLevel = 0 | 1 | 2 | 3
PhotoVariant = "blurred" | "medium" | "original" | null
```

Mapping:
- Level 0: No photos at all (null variant)
- Level 1: Heavy blur (blurred variant)
- Level 2: Light blur (medium variant)
- Level 3: Original (original variant)

### Impact
Frontend doesn't distinguish between:
- No match yet (level 0) vs no photos revealed (level 1)
- Heavy blur (blurred) vs light blur (medium)

### Affected Code
- `RelationEngine.getPhotoVisibility()` (line 47)
- Any photo rendering logic

### Minimal Fix
```typescript
export type PhotoVisibility = 'avatar' | 'blurred' | 'medium' | 'revealed';
export type RelationLevel = 0 | 1 | 2 | 3;

export function getPhotoVisibility(level: RelationLevel): PhotoVisibility {
  if (level === 3) return 'revealed';
  if (level === 2) return 'medium';
  if (level === 1) return 'blurred';
  return 'avatar';
}
```

---

## Bug #4: Wrong photoUnlocked Field Reference

**Location**: `frontend/app/match-profile.tsx` (line 71)

### Current Code
```typescript
const hasUnlockedPhoto = !!match.photoUnlocked && revealLevel >= 3 && !!match.photoUrl;
```

### Problem
- `match.photoUnlocked` is a BOOLEAN field (doesn't exist in new structure)
- New structure has `match.photoUnlock` OBJECT with `{level, ...}`
- Field name AND type are wrong

### Impact
- Photo rendering always uses fallback (avatar)
- High-quality photos never shown to users
- Users don't see relation progress visually

### Affected Component
- Match profile card header
- Impact: Breaking display of partner photos

### Minimal Fix
```typescript
const hasUnlockedPhoto = !!match.photoUnlock?.level === 3 && revealLevel >= 3 && !!match.photoUrl;
```

---

## Bug #5: Hardcoded Unlock Message

**Location**: `frontend/app/match-profile.tsx` (line 139)

### Current Code
```typescript
<Text style={styles.photoHint}>🔒 Révélé après 10 lettres chacun</Text>
```

### Problem
- Says "10 letters each" (10 per side = 20 total in old system)
- New system uses 10 total letters (combined)
- Plus message doesn't match the new threshold messaging system

### Impact
- Users misunderstand unlock requirements
- Wrong for premium users (should be 3 total, not 10 each)

### Minimal Fix
```typescript
const nextThreshold = match.photoUnlock?.nextLevelAt;
const unlockText = nextThreshold 
  ? `🔒 Révélé après ${nextThreshold} lettres`
  : '🔓 Photo révélée';

<Text style={styles.photoHint}>{unlockText}</Text>
```

---

## Bug #6: Missing Photo Variants in Frontend

**Location**: `frontend/src/api/profiles.ts` (lines 34-39)

### Current Frontend
```typescript
export interface PublicPhotoDto {
  id: string;
  url: string;
  position: number;
  isPrimary: boolean;
  // Missing variant field
}
```

### Backend Now Sends
```typescript
{
  id: string;
  url: string;
  position: number;
  isPrimary: boolean;
  variant: "blurred" | "medium" | "original";  // ← NEW
}
```

### Impact
- Frontend renders wrong photo variants
- May display URLs to blurred images with wrong content
- No way to distinguish between blur levels visually

### Minimal Fix
```typescript
export interface PublicPhotoDto {
  id: string;
  url: string;
  position: number;
  isPrimary: boolean;
  variant: "blurred" | "medium" | "original";  // ← ADD
}
```

---

## Testing Evidence

### Code Inspection Results

1. **Threshold Mismatch**:
   - Frontend expects: Premium level 2 @ 3, level 3 @ 5
   - Backend sends: Premium level 1 @ 1, level 2 @ 2, level 3 @ 3
   - Difference: Off by 1-2 letters per tier

2. **API Type Mismatch**:
   - Frontend PhotoUnlockDTO expects: `{threshold, myCount, otherCount, unlocked: boolean}`
   - Backend sends: `{level: 0-3, totalLetters, nextLevelAt, progressPercent}`
   - These are completely different structures

3. **Missing Photo Variants**:
   - Backend response includes `variant: "blurred" | "medium" | "original"`
   - Frontend PublicPhotoDto doesn't have variant field
   - Frontend can't render correct blur level

4. **Component Logic**:
   - ProfileDetailScreen uses `photoUnlock.unlocked` (boolean) - will be undefined
   - MatchProfileScreen uses `photoUnlocked` (field) instead of `photoUnlock.level` (object)
   - Both will fail at runtime

---

## Severity Assessment

| Bug | Severity | Impact | Users Affected |
|-----|----------|--------|-----------------|
| #1: Premium thresholds | HIGH | Wrong level progression | Premium users |
| #2: PhotoUnlock structure | CRITICAL | API type mismatch, TypeScript errors | All users |
| #3: 4-level system | HIGH | Can't distinguish blur levels | All users (photos) |
| #4: photoUnlocked field | CRITICAL | Photos never displayed | All users (photos) |
| #5: Unlock message | MEDIUM | Confusing UX | All users |
| #6: Missing variants | HIGH | Wrong blur rendering | All users (photos) |

---

## Recommended Action

**STOP**: Do not deploy frontend without fixes.

All 6 issues are real bugs found by code inspection. The most critical are:
1. **#2**: PhotoUnlock API structure mismatch (prevents match loading)
2. **#4**: photoUnlocked field doesn't exist (prevents photo display)
3. **#1**: Premium threshold wrong (wrong progression for paid users)

### Minimal Fixes Required
- Update PhotoUnlockDTO type in both api files
- Fix threshold values in RelationEngine
- Add variant field to PhotoPhotoDto
- Fix field references in components
- Update hardcoded messages

Estimated fix time: 15-20 minutes for all 6 issues (straightforward type and logic updates, no refactoring).

---

Report Date: 2026-05-14  
Status: CRITICAL ISSUES FOUND ❌  
Recommendation: Merge #64 to main but DO NOT DEPLOY without frontend fixes
