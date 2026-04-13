import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../../core/utils/asyncHandler";
import { requireAuth, requireRole } from "../../../core/middleware/auth";
import { AuthedRequest } from "../../../core/types";
import { BadRequestError, NotFoundError } from "../../../core/errors";
import { adminFileStorage } from "./adminFileStorage";
import { uploadAdminImage } from "./adminUpload.multer";
import { writeAudit } from "../admin.audit";

const router = Router();

router.use(requireAuth as never);
router.use(requireRole(Role.ADMIN) as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

/**
 * Wrapper multer : convertit les erreurs multer en BadRequestError propres.
 */
function handleUploadMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  uploadAdminImage(req, res, (err: unknown) => {
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

// ============================================================
// POST /api/admin/upload — upload générique d'image admin
// Retourne { key, url, size, format }
// ============================================================
router.post(
  "/",
  handleUploadMiddleware,
  wrap(async (req, res) => {
    if (!req.file) {
      throw new BadRequestError("Fichier manquant (champ 'file' requis)");
    }

    const stored = await adminFileStorage.save({
      buffer: req.file.buffer,
      namespace: "salons",
    });

    await writeAudit({
      actorId: req.user.userId,
      action: "admin.upload.create",
      target: stored.key,
      meta: {
        size: stored.size,
        format: stored.format,
        originalMimetype: req.file.mimetype,
      },
    });

    res.status(201).json({ data: stored });
  }),
);

export default router;

// ============================================================
// Route publique de streaming — montée séparément dans app.ts
// GET /api/files/admin/:namespace/:key
//
// Cache public court (images immuables, clé aléatoire). Pas d'auth :
// les URLs sont opaques, impossibles à deviner, et ne contiennent
// aucune information sensible.
// ============================================================
export const publicFilesRouter = Router();

publicFilesRouter.get(
  "/admin/:namespace/:key",
  asyncHandler(async (req, res) => {
    const { namespace, key } = req.params;
    if (namespace !== "salons") {
      throw new NotFoundError("Fichier");
    }

    let absolutePath: string;
    try {
      absolutePath = adminFileStorage.resolveAbsolute(
        key as string,
        "salons",
      );
    } catch {
      throw new NotFoundError("Fichier");
    }

    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${path.basename(absolutePath)}"`,
    );

    const stream = fs.createReadStream(absolutePath);
    stream.on("error", () => {
      if (!res.headersSent) {
        res.status(404).json({
          error: {
            code: "FILE_NOT_FOUND",
            message: "Fichier introuvable",
          },
        });
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  }),
);
