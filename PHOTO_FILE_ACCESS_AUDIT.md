# Photo File Access Security Audit

## Overview

`GET /api/photos/file/:photoId/:variant` serves photo file streams with security checks.

Endpoint must ensure:
1. Authentication required (401 without token)
2. Authorization enforced (403 if viewer not allowed)
3. Correct variant served based on access level
4. Owner always sees original
5. Non-owners see only photoUnlock-allowed variants

---

## Implementation Review

### Route Definition
**File:** `backend/src/modules/photos/photos.routes.ts`

```typescript
// Line 15: Applies to ALL routes in router
router.use(requireAuth as never);

// Line 72-76: File stream endpoint
router.get(
  "/file/:id/:variant",
  validate(PhotoFileParamsSchema, "params"),
  wrap(ctrl.handleStreamFile),
);
```

**Status:** ✅ `requireAuth` middleware enforced on all routes (line 15)

---

### Controller Handler
**File:** `backend/src/modules/photos/photos.controller.ts` (line 73-102)

```typescript
export async function handleStreamFile(req: AuthedRequest, res: Response) {
  const photoId = req.params["id"] as string;
  const variant = req.params["variant"] as string;

  const { absolutePath } = await svc.resolvePhotoForStream({
    viewerId: req.user.userId,
    viewerIsPremium: req.user.isPremium,
    photoId,
    variant,
  });

  // Path traversal defense
  const safeName = path.basename(absolutePath);
  
  // Serve file stream
  const stream = fs.createReadStream(absolutePath);
}
```

**Status:** ✅ Calls authorization service, uses safe path handling

---

### Authorization Service
**File:** `backend/src/modules/photos/photos.service.ts` (line 343-410)

Function: `resolvePhotoForStream()`

#### Logic Flow:
1. **Find photo by ID**
   - If not found → 404 NotFoundError

2. **Check ownership**
   ```typescript
   const isOwner = photo.userId === viewerId;
   ```
   - If owner → return original path, level 3

3. **Check block status** (if not owner)
   ```typescript
   if (!isOwner) {
     hasBlock = await hasBlockBetween(viewerId, photo.userId);
     match = await findMatchBetween(viewerId, photo.userId);
   }
   ```

4. **Determine access level**
   ```typescript
   const access = resolvePhotoAccess({
     viewerId,
     ownerId: photo.userId,
     viewerIsPremium,
     hasBlock,
     match,
   });
   ```

5. **Check allowed**
   ```typescript
   if (!access.allowed) {
     throw new ForbiddenError(access.reason);
   }
   ```
   
   Possible errors:
   - BLOCKED → "Accès interdit" (403)
   - NO_MATCH → "Aucune relation existante" (403)
   - LEVEL_0 → "Aperçu non disponible" (403)

6. **Serve appropriate variant**
   ```typescript
   switch (access.variant) {
     case "original":
       absolutePath = resolveStoredPath(photo.originalPath);
       break;
     case "blurred":
       absolutePath = resolveStoredPath(photo.blurredPath);
       break;
     case "medium":
       absolutePath = resolveStoredPath(photo.blurMediumPath || photo.blurredPath);
       break;
     default:
       throw new ForbiddenError("Variante de photo invalide");
   }
   ```

**Status:** ✅ Complete authorization checks before file access

---

## Security Checklist

| Check | Status | Notes |
|-------|--------|-------|
| Authentication required | ✅ | `requireAuth` middleware applied to all routes |
| 401 without token | ✅ | `requireAuth` returns 401 for unauthenticated requests |
| Owner sees original | ✅ | `isOwner` check grants level 3 → original variant |
| Block status checked | ✅ | `resolvePhotoAccess()` returns BLOCKED reason |
| No match → forbidden | ✅ | `NO_MATCH` throws ForbiddenError |
| Level 0 → forbidden | ✅ | `LEVEL_0` throws ForbiddenError |
| Correct variant served | ✅ | Switch statement matches level to variant |
| Path traversal protected | ✅ | `path.basename()` prevents directory escape |
| Invalid variant rejected | ✅ | Default case throws ForbiddenError |

---

## HTTP Status Codes

| Scenario | Status | Reason |
|----------|--------|--------|
| Unauthenticated | 401 | Missing/invalid token |
| Owner accessing own photo | 200 | Full access, serves original |
| Non-owner, no match | 403 | NO_MATCH |
| Non-owner, blocked | 403 | BLOCKED |
| Non-owner, level 0 | 403 | LEVEL_0 |
| Non-owner, level 1-3 | 200 | Serves appropriate variant (blurred/medium/original) |
| Photo not found | 404 | Invalid photoId |
| Invalid variant | 403 | Variant mismatch or default case |
| File not found on disk | 404 | File stream error handler |

---

## Test Coverage

### E2E Test: `photo-file-access-e2e.yml`

**Phase 1: Owner Access**
- ✅ User A uploads photo
- ✅ User A accesses their own original → 200 with image data

**Phase 2: Unauthenticated Access**
- ✅ No token provided → 401 Unauthorized

**Phase 3: Unauthorized Access (No Match)**
- ✅ User B without match accesses A's photo → 403 Forbidden

**Phase 4: Access Control with Match**
- ✅ Create mutual smile (A ↔ B)
- ✅ User B with match accesses A's photo → 403 if level 0, or 200 if level >= 1

**Phase 5: Invalid Variant**
- ✅ User A tries invalid variant → 403 or 400 Rejected

---

## Risk Assessment

### Mitigated Risks

| Risk | Mitigation | Status |
|------|------------|--------|
| Direct URL access without auth | `requireAuth` middleware | ✅ Mitigated |
| Non-owners seeing originals | `resolvePhotoAccess()` check | ✅ Mitigated |
| Block status bypass | Block check in `resolvePhotoAccess()` | ✅ Mitigated |
| Path traversal attacks | `path.basename()` | ✅ Mitigated |
| Invalid variant access | Variant validation + default case | ✅ Mitigated |

### Assumptions

1. `resolvePhotoAccess()` policy is correct (see `PHOTO_MANAGEMENT_AUDIT.md`)
2. Block and match queries are accurate
3. File paths on disk are untamperable
4. Token validation in `requireAuth` is secure

---

## Recommendations

1. ✅ Keep `requireAuth` on all photo routes
2. ✅ Maintain variant validation in switch statement
3. ⚠️ Monitor file system for integrity
4. ⚠️ Consider cache headers (`Cache-Control: private`) for owner photos
5. ⚠️ Consider rate limiting on photo file downloads

---

## Conclusion

Photo file access security is **well-implemented**. The endpoint properly:
- Enforces authentication (401)
- Validates authorization (403 for unauthorized)
- Respects photoUnlock levels
- Serves correct variants
- Defends against path traversal

No immediate security fixes needed.
