# Audit du Système de Révélation Progressive des Photos

**Date:** 2026-05-14  
**Status:** Analyse complète — DÉSALIGNEMENT MAJEUR DÉTECTÉ  
**Scope:** Backend photo unlock + Frontend reveal progressive

---

## 1. Comportement Actuel — Backend

### 1.1 Règles de Déverrouillage Photos (photos.access.ts)

**Logique binaire (tout-ou-rien):**
```
photo.allowed = (myLetterCount >= threshold) AND (otherLetterCount >= threshold)
```

**Seuils par statut premium:**
- **FREE users:** `PHOTO_UNLOCK_LETTERS_FREE = 10`
  - Besoin: ≥10 lettres des DEUX côtés (minimum 20 lettres totales)
  - Tous les thresholds égaux (pas de progression)
  
- **PREMIUM users:** `PHOTO_UNLOCK_LETTERS_PREMIUM = 3`
  - Besoin: ≥3 lettres des DEUX côtés (minimum 6 lettres totales)
  - Tous les thresholds égaux (pas de progression)

**Variantes photo disponibles en storage:**
- `originalPath` — Photo complète (non floutée)
- `blurredPath` — Photo avec flou (ignorée par API)
- `blurMediumPath` — Révélation progressive (ignorée par API)

**Problème clé:** `resolvePhotoForStream()` retourne TOUJOURS `originalPath` (ligne 386), jamais les variantes blurred/medium.

### 1.2 Affichage API

**Endpoint `/api/photos/user/:userId`:**
- Si `access.allowed = true` → Retourne liste complète de photos originales
- Si `access.allowed = false` → Retourne liste VIDE (pas d'aperçu flou)

**Code (photos.service.ts:141-144):**
```typescript
if (!access.allowed) {
  return { photos: [], unlocked: false };
}
// Sinon retourne originalPath pour toutes les photos
```

### 1.3 Compteurs de Lettres

**Source:** `Match.letterCountA` et `Match.letterCountB`
- Incrémentés à chaque lettre envoyée
- Utilisés ASYMÉTRIQUEMENT pour déblocage (les DEUX doivent atteindre seuil)

**Structure Match (schema.prisma):**
```
match {
  userAId: string
  userBId: string
  letterCountA: number  ← Lettres envoyées par User A
  letterCountB: number  ← Lettres envoyées par User B
  ...
}
```

---

## 2. Comportement Attendu — Frontend

### 2.1 Système de Révélation Progressive (RelationEngine.ts)

**Logique à 3 niveaux basée sur TOTAL de lettres:**

**RELATION_THRESHOLDS:**
- **FREE users:**
  - Level 1 (Découverte): 0-5 lettres → Avatar uniquement
  - Level 2 (Connexion): 6-9 lettres → Photo floutée (blurred)
  - Level 3 (Révélation): 10+ lettres → Photo nette (revealed)

- **PREMIUM users:**
  - Level 2: 3+ lettres → Photo floutée
  - Level 3: 5+ lettres → Photo nette

**Calcul:** `totalLetters = letterCountA + letterCountB`

### 2.2 Visibilité Photos (getPhotoVisibility)

```
Level 1 → 'avatar'    (avatar de profil, pas de photos)
Level 2 → 'blurred'   (photo floutée, aperçu progressif)
Level 3 → 'revealed'  (photo complète, nette)
```

### 2.3 Fonctionnalités Débloquées

```
Level 1: [ 'letters' ]
Level 2: [ 'letters', 'photo_blur' ]
Level 3: [ 'letters', 'photo_reveal', 'avatar_toggle' ]
```

### 2.4 Affichage Frontend (match-profile.tsx:58-75)

```typescript
const rel = getRelationInfo(apiLetterCount, currentUser?.isPremium);
const revealLevel = Math.max(1, Math.min(3, rel.level));

const hasUnlockedPhoto = !!match.photoUnlocked && revealLevel >= 3;
const introText = revealLevel === 1 ? truncateTo110chars : fullBio;
const visibleInterests = revealLevel === 1 ? first2 : all;
```

**Comportement attendu:**
- Level 1: Bio tronquée (110 chars), 2 intérêts max, pas de photo
- Level 2: Bio complète, photo floutée (révélation progressive)
- Level 3: Tout débloqué, photo nette

---

## 3. DÉSALIGNEMENT MAJEUR

### 3.1 Différences de Seuils

| Aspect | Backend | Frontend | Écart |
|--------|---------|----------|-------|
| **Unité de compte** | Lettres par côté (asymétrique) | Total des deux côtés (symétrique) | ❌ INCOMPATIBLE |
| **FREE - Déblocage** | 10+10 (min 20 totales) | 10 totales | ❌ Backend x2 trop strict |
| **PREMIUM - Déblocage** | 3+3 (min 6 totales) | 3-5 totales | ❌ Backend x2 trop strict |
| **Progression** | 0 transitions (binaire) | 3 niveaux progressifs | ❌ COMPLÈTEMENT DIFFÉRENT |
| **Blurred/Medium** | Générées, jamais utilisées | Attendues en Level 2 | ❌ Backend ne les sert pas |

### 3.2 Cas d'Usage Concret

**Scénario:** User A envoie 10 lettres, User B envoie 1 lettre

**Backend:** 
```
letterCountA = 10, letterCountB = 1
→ access.allowed = (10 >= 10) AND (1 >= 10) = FALSE
→ API retourne photos: []
```

**Frontend:**
```
totalLetters = 10 + 1 = 11
→ Level 3 (FREE: 10+)
→ Affiche photo nette (revealed)
```

**Résultat:** Frontend montre une photo que le backend refuse de servir! 💥

---

## 4. Fichiers Concernés

### Backend

| Fichier | Rôle | Problème |
|---------|------|---------|
| `backend/src/policies/photoUnlock.ts` | Règles de déblocage | Asymétrique (BOTH côtés) |
| `backend/src/modules/photos/photos.service.ts` | Logique de visibilité | Ne retourne jamais blurred/medium |
| `backend/src/modules/photos/photos.urls.ts` | Builder URL photos | Que "original", pas variantes |
| `backend/src/modules/photos/photos.access.ts` | Résolution accès | Context asymétrique |
| `backend/src/config/constants.ts` | Seuils PHOTO_UNLOCK | Valeurs hardcodées |
| `backend/prisma/schema.prisma` | Model Photo | blurMediumPath jamais utilisé |

### Frontend

| Fichier | Rôle | Problème |
|---------|------|---------|
| `frontend/src/engine/RelationEngine.ts` | Source de vérité relation | Seuils incompatibles avec backend |
| `frontend/app/match-profile.tsx` | Affichage profil match | Affiche basé sur revealLevel |
| `frontend/src/engine/RevealEngine.ts` | Animations reveal | Inutilisé (duplicate?) |
| `frontend/src/store/useStore.ts` | État match + letters | Dépend de letterCount total |

### Tests

| Fichier | Statut |
|---------|--------|
| `backend/tests/unit/photosAccess.test.ts` | Teste backend uniquement |
| Pas de test intégration frontend ↔ backend | ❌ MANQUANT |

---

## 5. Problèmes Identifiés

### 🔴 Critique: Incompatibilité Asymétrique/Symétrique

**Backend:** Exige lettres des DEUX côtés (asymétrique)
```
access = (countA >= 10) AND (countB >= 10)
```

**Frontend:** Compte TOTAL (symétrique)
```
level = count => 10 ? 3 : count >= 6 ? 2 : 1
```

**Exemple échoué:**
- User A: 15 lettres
- User B: 2 lettres
- Total: 17 (Frontend → Level 3 = "revealed")
- Backend: countB (2) < 10 → access denied → API retourne []

### 🔴 Critique: Variantes Photo Ignorées

**Backend génère 3 variantes:**
- `originalPath` (complet)
- `blurredPath` (50% flou)
- `blurMediumPath` (progression?)

**Mais:**
- `resolvePhotoForStream()` ignore les variantes, retourne toujours original
- `listPhotosForViewer()` retourne soit tout, soit rien (pas d'intermédiaire)

### 🟠 Important: PhotoVariant Type Incomplet

**photos.urls.ts:**
```typescript
export type PhotoVariant = "original";  // Que original!
```

Devrait être:
```typescript
export type PhotoVariant = "original" | "blurred" | "medium";
```

### 🟠 Important: Logique Binaire au Backend

**Pas de progression:**
- FREE: 0-9 lettres → rien, 10+ lettres → tout
- PREMIUM: 0-2 lettres → rien, 3+ lettres → tout

**Attendu:**
- Progression par étapes (reveal progressif)
- Affichage blurred en niveau intermédiaire

### 🟡 Mineure: RevealEngine Dupliquée?

**Deux systèmes de révélation:**
1. `RevealEngine.ts` (letterThread: hidden→blurred→revealed)
2. `RelationEngine.ts` (levels 1→2→3)

Semble que RelationEngine soit la vraie implémentation, RevealEngine inutilisée.

---

## 6. Comportement Réel vs Attendu

### Cas 1: Match Jeune (peu de lettres)

**Attendu:** Affichage progressif:
```
0 lettres   → Avatar uniquement
6 lettres   → Photo avec flou 50%
10 lettres  → Photo nette
```

**Réel:**
```
0-9 lettres → Pas d'accès (API []... ou 403?)
10+ lettres → Photo complète originale
```

### Cas 2: Premium vs Free

**Attendu:**
- Free: 10 lettres pour révélation
- Premium: 5 lettres pour révélation

**Réel:**
- Free: 20 lettres (10 des DEUX côtés)
- Premium: 6 lettres (3 des DEUX côtés)

### Cas 3: Asymétrie (User A très actif, User B passif)

**Cas: A envoie 50 lettres, B envoie 1 lettre**

**Attendu (Frontend):**
```
Total = 51 → Level 3 → Affiche photo nette
```

**Réel (Backend):**
```
countB = 1 < 10 → access denied → 403 ou []
```

**Résultat:** Frontend affiche la photo, backend refuse de la servir.

---

## 7. Corrections Minimales Proposées

### Option A: Aligner Backend sur Frontend (Recommandé)

**Logique:** Compter TOTAL des lettres, pas par côté.

**Changements:**

1. **photoUnlock.ts** — Modifier logique
```typescript
export function isPhotoUnlocked(ctx: UnlockContext): boolean {
  const threshold = ctx.viewerIsPremium ? PHOTO_UNLOCK_LETTERS_PREMIUM : PHOTO_UNLOCK_LETTERS_FREE;
  const totalLetters = ctx.myLetterCount + ctx.otherLetterCount;
  return totalLetters >= threshold;
}
```

2. **constants.ts** — Réviser seuils
```typescript
export const PHOTO_UNLOCK_LETTERS_FREE = 10;    // Pas 20 (10+10)
export const PHOTO_UNLOCK_LETTERS_PREMIUM = 5;  // Pas 6 (3+3)
```

3. **photos.service.ts** — Ajouter variantes
```typescript
// Ajouter logique pour sélectionner blurred/medium selon contexte
if (!fullyUnlocked && partiallyUnlocked) {
  // Retourner blurredPath au lieu d'originalPath
}
```

4. **photos.urls.ts** — Étendre types
```typescript
export type PhotoVariant = "original" | "blurred" | "medium";
```

### Option B: Aligner Frontend sur Backend

**Logique:** Exiger lettres des DEUX côtés (moins user-friendly).

**Changements:**

1. **RelationEngine.ts** — Utiliser min() des deux côtés
```typescript
export function getRelationLevel(
  letterCountA: number,
  letterCountB: number,
  isPremium = false,
): RelationLevel {
  const minLetters = Math.min(letterCountA, letterCountB);
  // Puis appliquer seuils...
}
```

2. **match-profile.tsx** — Passer deux compteurs
```typescript
const rel = getRelationInfo(
  match.letterCountA,
  match.letterCountB,
  currentUser?.isPremium
);
```

**Problème:** Pénalise utilisateur qui attend réponse (ne voit rien tant que l'autre n'a pas écrit).

---

## 8. Recommandation

### ✅ Aligner Backend sur Frontend (Option A)

**Justification:**
1. **UX meilleure:** Récompense rapidement qui engage
2. **Symétrie:** Total des lettres plus intuitif
3. **Progression:** Frontend déjà dessine 3 niveaux (backend fait binaire)
4. **Moins de code:** Juste modifier photoUnlock.ts

**Impact minimal:**
- 1 fonction critique
- Constants ajustés
- Services restent structurellement pareils

**Test:** Vérifier photosAccess.test.ts après changement

---

## 9. Prochaines Étapes

1. **Valider avec l'équipe** l'Option A (aligner backend)
2. **Ne pas modifier** tant que décision pas prise
3. **Si approuvé:** Corriger dans nouvel audit code

---

## Résumé Exécutif

**Trouvé:** Système de révélation photo complètement désaligné

- ✅ Backend: Logique binaire, asymétrique, ignore variantes blurred/medium
- ✅ Frontend: Logique progressive 3-niveaux, symétrique, attendu blurred
- ❌ Résultat: Parfois frontend affiche photo que backend refuse de servir

**Corrections proposées:** Aligner backend sur frontend (minimal, 1 fichier critique)

**Risque si non-corrigé:** 
- User frustration (voit photo mais ne peut pas la récupérer)
- Taux engagement bas
- Système "premium" inefficace

