import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth, requireRole } from "../../core/middleware/auth";
import { Role } from "@prisma/client";
import { writeAudit } from "../admin/admin.audit";
import { AuthedRequest } from "../../core/types";
import * as svc from "./salons.service";
import {
  ListSalonMessagesQuerySchema,
  SendSalonMessageSchema,
  type ListSalonMessagesQuery,
  type SendSalonMessageDto,
} from "./salons.schemas";

const router = Router();

router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// ADMIN: POST /api/salons/admin/clean-test-messages — delete test Glouglou/Miam messages
// Destructif : réservé à ADMIN (OWNER hérite de l'accès), journalisé dans l'audit.
router.post(
  "/admin/clean-test-messages",
  requireRole(Role.ADMIN) as never,
  wrap(async (req, res) => {
    const result = await svc.cleanTestMessages();
    await writeAudit({
      actorId: req.user.userId,
      action: "admin.salon.clean_test_messages",
      meta: { deletedCount: result.deletedCount },
    });
    res.json({ success: true, deletedCount: result.deletedCount });
  }),
);

// GET /api/salons — liste des salons actifs, ordre stable
router.get(
  "/",
  wrap(async (_req, res) => {
    const data = await svc.listActive();
    res.json({ data });
  }),
);

// GET /api/salons/:id/messages — derniers messages du salon
// Paramètre optionnel: sessionId pour filtrer par session
// IMPORTANT: Must come BEFORE /:id to avoid being matched by it
router.get(
  "/:id/messages",
  validate(ListSalonMessagesQuerySchema, "query"),
  wrap(async (req, res) => {
    const id = req.params["id"] as string;
    const { limit, sessionId } = req.query as unknown as ListSalonMessagesQuery;
    const data = await svc.listMessages(id, req.user.userId, limit, sessionId);
    res.json({ data });
  }),
);

// POST /api/salons/:id/messages — envoyer un message dans le salon
// IMPORTANT: Must come BEFORE /:id to avoid being matched by it
router.post(
  "/:id/messages",
  validate(SendSalonMessageSchema),
  wrap(async (req, res) => {
    const id = req.params["id"] as string;
    const { content, sessionId } = req.body as SendSalonMessageDto;
    const data = await svc.postMessage(id, req.user.userId, content, sessionId);
    res.json({ data });
  }),
);

// GET /api/salons/:id — détail d'un salon actif
// IMPORTANT: Must come LAST after all more specific routes
router.get(
  "/:id",
  wrap(async (req, res) => {
    const id = req.params["id"] as string;
    const data = await svc.getActiveById(id);
    res.json({ data });
  }),
);

export default router;
