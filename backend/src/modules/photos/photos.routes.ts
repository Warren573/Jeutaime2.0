import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { AuthedRequest } from "../../core/types";
import { BadRequestError } from "../../core/errors";
import { uploadSinglePhoto } from "./photos.upload";
import { UpdatePhotoSchema, PhotoFileParamsSchema } from "./photos.schemas";
import * as ctrl from "./photos.controller";

const router = Router();

router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

/**
 * Wrapper multer : convertit les erreurs multer (taille, mimetype...)
 * en BadRequestError propres avant qu'elles remontent au error handler.
 */
function handleUploadMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  uploadSinglePhoto(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new BadRequestError("Fichier trop volumineux (max 5 MB)"));
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        return next(new BadRequestError("Un seul fichier à la fois"));
      }
      return next(new BadRequestError(`Upload refusé : ${err.message}`));
    }
    if (err) return next(err);
    next();
  });
}

// ------------------------------------------------------------------
// Mes photos
// ------------------------------------------------------------------

// GET /api/photos/me
router.get("/me", wrap(ctrl.handleListMine));

// POST /api/photos/me
router.post("/me", handleUploadMiddleware, wrap(ctrl.handleUpload));

// ------------------------------------------------------------------
// Photos d'un autre user
// ------------------------------------------------------------------

// GET /api/photos/user/:userId
router.get("/user/:userId", wrap(ctrl.handleListForUser));

// ------------------------------------------------------------------
// Accès fichier (stream sécurisé)
// ------------------------------------------------------------------

// GET /api/photos/file/:id/:variant
router.get(
  "/file/:id/:variant",
  validate(PhotoFileParamsSchema, "params"),
  wrap(ctrl.handleStreamFile),
);

// ------------------------------------------------------------------
// CRUD sur une photo (PATCH / DELETE)
// /!\ DOIT être déclaré après les routes plus spécifiques ci-dessus
// pour éviter que "me", "user", "file" ne matchent ":id"
// ------------------------------------------------------------------

// PATCH /api/photos/:id
router.patch("/:id", validate(UpdatePhotoSchema), wrap(ctrl.handleUpdate));

// DELETE /api/photos/:id
router.delete("/:id", wrap(ctrl.handleDelete));

export default router;
