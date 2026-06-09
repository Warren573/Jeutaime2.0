import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
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

// GET /api/salons — liste des salons actifs, ordre stable
router.get(
  "/",
  wrap(async (_req, res) => {
    const data = await svc.listActive();
    res.json({ data });
  }),
);

// GET /api/salons/:id — détail d'un salon actif
router.get(
  "/:id",
  wrap(async (req, res) => {
    const id = req.params["id"] as string;
    const data = await svc.getActiveById(id);
    res.json({ data });
  }),
);

// GET /api/salons/:id/messages — derniers messages du salon
// Paramètre optionnel: sessionId pour filtrer par session
router.get(
  "/:id/messages",
  (req, res, next) => {
    console.log(`[GET-MESSAGES-RAW] path=${req.path}, query=`, JSON.stringify(req.query));
    console.log(`[GET-MESSAGES-RAW] salonId=${req.params.id}`);
    next();
  },
  validate(ListSalonMessagesQuerySchema, "query"),
  wrap(async (req, res) => {
    const id = req.params["id"] as string;
    const { limit, sessionId } = req.query as unknown as ListSalonMessagesQuery;
    console.log(`[GET-MESSAGES-SUCCESS] salonId=${id}, limit=${limit}, sessionId=${sessionId}`);
    const data = await svc.listMessages(id, limit, sessionId);
    console.log(`[GET-MESSAGES-SUCCESS] returning ${data.length} messages`);
    res.json({ data });
  }),
);

// POST /api/salons/:id/messages — envoyer un message dans le salon
router.post(
  "/:id/messages",
  validate(SendSalonMessageSchema),
  wrap(async (req, res) => {
    const id = req.params["id"] as string;
    const { content } = req.body as SendSalonMessageDto;
    const data = await svc.postMessage(id, req.user.userId, content);
    res.json({ data });
  }),
);

export default router;
