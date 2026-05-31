# Photo Management E2E Audit

## I. Modèles Prisma Concernés

### Photo
```prisma
model Photo {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  originalPath  String   // Chemin disque fichier original
  blurredPath   String   // Version ultra-floutée (level 1)
  blurMediumPath String? // Version flou moyen (level 2)
  position      Int      @default(0)  // Ordre de tri (0-N)
  isPrimary     Boolean  @default(false)
  createdAt     DateTime @default(now())
  
  @@index([userId])
}
```

**Limites :** MAX_PHOTOS_PER_USER = 6 (constant.ts)

**Variants de fichier :**
- `original` : image nette complète
- `blurred` : ultra-flou (blurSigma=25)
- `blurMedium` : flou moyen (blurSigma=6)

---

## II. Endpoints

### `GET /api/photos/me`
**Authentification :** OUI

**Réponse :**
```json
{
  "data": [
    {
      "id": "photo_001",
      "userId": "user123",
      "position": 0,
      "isPrimary": true,
      "createdAt": "2026-05-29T14:23:45.000Z",
      "url": "/api/photos/file/photo_001/original",
      "variant": "original"
    }
  ]
}
```

**Filtrage :**
- Toutes mes photos (propriétaire)
- Variant : toujours "original" (propriétaire voit tout)
- Triées : isPrimary DESC, position ASC, createdAt ASC, id ASC

---

### `POST /api/photos/me`
**Authentification :** OUI  
**Rate Limit :** 10/heure par user

**Request :**
- `multipart/form-data` avec champ `photo` (image)
- Limites : max 5 MB, JPEG/PNG/WebP

**Réponse (201) :**
```json
{
  "data": {
    "id": "photo_001",
    "userId": "user123",
    "position": 0,
    "isPrimary": true,  // true si 1ère photo
    "createdAt": "2026-05-29T14:23:45.000Z",
    "url": "/api/photos/file/photo_001/original",
    "variant": "original"
  }
}
```

**Erreurs :**
- `400 BadRequestError` : fichier vide
- `400 BadRequestError` : fichier > 5 MB
- `400 BadRequestError` : mimetype invalide
- `422 UnprocessableError` : limit atteinte (6 photos)

**Atomicité :** Transactionnelle
1. Créer row avec paths "__pending__"
2. Sharp process+write (original + blurred + blurMedium)
3. Update row avec vrais paths
4. Rollback si step 2-3 échoue

---

### `GET /api/photos/user/:userId`
**Authentification :** OUI

**Réponse :**
```json
{
  "data": {
    "photos": [
      {
        "id": "photo_001",
        "userId": "user456",
        "position": 0,
        "isPrimary": true,
        "createdAt": "2026-05-29T14:23:45.000Z",
        "url": "/api/photos/file/photo_001/blurred",
        "variant": "blurred"  // Dépend du level d'accès
      }
    ],
    "level": 1,
    "unlocked": false
  }
}
```

**Access Logic :**
```
if viewer === owner
  → level 3, variant "original"
if hasBlock(viewer, owner)
  → level 0 (forbidden)
if no match
  → level 0 (no photos shown)
if match exists
  → level = getPhotoLevel(totalLetters, isPremium)
  → variant = getPhotoVariant(level)
```

**Levels (voir photoUnlock policy) :**
- Level 0 : Photos hidden
- Level 1 : blurred variant (ultra-flou)
- Level 2 : blurMedium variant (flou moyen)
- Level 3 : original variant

---

### `PATCH /api/photos/:id`
**Authentification :** OUI

**Payload :**
```json
{
  "position": 1,      // optional, 0-20
  "isPrimary": true   // optional
}
```

**Réponse :**
```json
{
  "data": {
    "id": "photo_001",
    "userId": "user123",
    "position": 1,
    "isPrimary": true,
    "createdAt": "2026-05-29T14:23:45.000Z",
    "url": "/api/photos/file/photo_001/original",
    "variant": "original"
  }
}
```

**Erreurs :**
- `404 NotFoundError` : photo inexistante
- `403 ForbiddenError` : cette photo ne t'appartient pas
- `400 BadRequestError` : au moins un champ requis

**Atomicité :** $transaction Prisma
- Si isPrimary=true : demote l'ancienne primary, promote celle-ci
- Si position fourni : update position
- Tout ensemble ou rien

---

### `DELETE /api/photos/:id`
**Authentification :** OUI

**Réponse :** 200 OK (pas de body)

**Erreurs :**
- `404 NotFoundError` : photo inexistante
- `403 ForbiddenError` : cette photo ne t'appartient pas

**Atomicité :** $transaction Prisma
1. Delete photo row
2. Si isPrimary=true : promouvoir la photo suivante
   - pickNextPrimary() : sort par position, createdAt, id
   - Update next avec isPrimary=true
3. Fire-and-forget : Delete fichiers disque (original, blurred, blurMedium)

---

### `GET /api/photos/file/:id/:variant`
**Authentification :** OUI

**Réponse :** Binary file stream

**Variants :**
- `original` : nette complète
- (seulement `original` accepté actuellement)

**Access Checks :**
- Appelle resolvePhotoAccess()
- Vérifie hasBlock, match, level
- Retourne variant appropriée selon access level
- 403 si accès refusé

---

## III. Règles Métier

### Upload (POST /api/photos/me)
- **Max par user** : 6 photos
- **Position** : auto-assignée (append à la fin)
- **Primary** : si 1ère photo du user, isPrimary=true
- **Rate limit** : 10/heure/user

### Ordering
- **position** : 0-N (user-controllable via PATCH)
- **Tri affiché** : isPrimary DESC, position ASC, createdAt ASC, id ASC

### Primary Photo
- **Un seul** isPrimary=true par user à tout moment
- **PATCH isPrimary=true** : demote l'ancienne, promote celle-ci (atomic)
- **DELETE primary** : promote la suivante via pickNextPrimary()
  - Sort order : position ASC, createdAt ASC, id ASC
  - La "prochaine" logique prend le relais

### Visibility (photoUnlock)
- **Owner** : voir original toujours
- **Blocked** : zéro accès
- **No match** : zéro accès
- **Match exists** : level selon totalLetters + isPremium
  - FREE : level1=3, level2=6, level3=10
  - PREMIUM : level1=1, level2=2, level3=3

### Ownership
- **Update/Delete** : seulement propriétaire (403 sinon)
- **List own** : GET /photos/me → toutes
- **List other** : GET /photos/user/:id → filtered par access

### File Storage
- **Atomicity** : row + files commit ensemble ou rollback
- **Cleanup** : fire-and-forget après delete (async)
- **Paths** : originalPath, blurredPath, blurMediumPath

---

## IV. Workflow E2E Minimal Proposé

### Phase 0: Setup
1. Version check
2. Cleanup staging
3. Reset mutual smile (A & B)
4. Login A

### Phase 1: Upload & List
5. A uploads test photo
6. Verify photo appears in GET /photos/me
7. Verify isPrimary=true (1st photo)
8. Verify position=0
9. Verify url correct

### Phase 2: Update (Position & Primary)
10. Upload 2nd photo for A
11. Verify 2nd isPrimary=false, position=1
12. PATCH photo 1: position=1, photo 2: position=0 (reorder)
13. Verify positions swapped
14. PATCH photo 2: isPrimary=true
15. Verify photo 1 isPrimary=false, photo 2 isPrimary=true

### Phase 3: Delete
16. Delete photo 2 (was primary)
17. Verify photo 1 now isPrimary=true (promoted)
18. Verify photo 2 gone from list

### Phase 4: Error Cases
19. Try to delete same photo twice → 404 NotFoundError
20. Try to delete photo as user B → 403 ForbiddenError (not owner)
21. A uploads max (6 photos)
22. A tries to upload 7th → 422 UnprocessableError (limit)

### Phase 5: Access Control
23. A & B have match + some letters
24. B lists A's photos
25. Verify variant matches photoUnlock level
26. Block B→A
27. B tries to list A's photos → 403 (blocked)

---

## V. Test Image Requirements

- **Size** : < 1 MB (small, deterministic)
- **Format** : JPEG ou PNG
- **Dimensions** : arbitrary (tested with any size)
- **Strategy** : Generate inline small PNG or use placeholder binary

---

## VI. Important Notes

### Atomicity
- Upload : row + file process + update row OR full rollback
- Update : multiple photo updates (isPrimary demotion) in transaction
- Delete : row + file deletion + primary promotion in transaction
- All transactional via Prisma.$transaction()

### Ownership
- All writes (upload, update, delete) check userId
- ForbiddenError if actor !== photo.userId
- NotFoundError if photo doesn't exist

### Photo Access Policy
- Determined by block status + match status + letter count
- level = getPhotoLevel(totalLetters, viewerIsPremium)
- variant = getPhotoVariant(level) or null
- Owner sees original always, level 3

### Primary Demotion/Promotion
- At most one isPrimary=true per user (enforced in DB)
- Delete primary: pickNextPrimary() sorts deterministically
- Update: atomic swap (old false, new true in transaction)

### No Variant Parameter (yet)
- GET /photos/file/:id/:variant currently only accepts "original"
- Future: accept variants based on access level
- Currently all downloads are served variant appropriate to access

---

## Next Steps

**Créer `.github/workflows/photo-management-e2e.yml`** avec :
1. Setup (version check, cleanup, reset, login)
2. Upload + list + verify primary
3. Update position + isPrimary
4. Delete + primary promotion
5. Error cases (not found, not owner, limit)
6. Access control (block, photoUnlock level)
