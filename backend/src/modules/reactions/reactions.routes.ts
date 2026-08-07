import { Router } from "express";
import { ReactionType } from "@prisma/client";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { prisma } from "../../config/prisma";
import { SendReactionSchema } from "./reactions.schemas";
import * as ctrl from "./reactions.controller";
import type { AuthedRequest } from "../../core/types";

const router = Router();

router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: import("express").Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// GET /api/discover/reaction-status/:toId — état réel des réactions entre deux profils
router.get(
  "/reaction-status/:toId",
  wrap(async (req, res) => {
    const fromId = req.user.userId;
    const toId = req.params["toId"] as string;

    const [outgoing, incoming] = await Promise.all([
      prisma.reaction.findUnique({
        where: { fromId_toId: { fromId, toId } },
        select: { type: true },
      }),
      prisma.reaction.findUnique({
        where: { fromId_toId: { fromId: toId, toId: fromId } },
        select: { type: true },
      }),
    ]);

    const outgoingType = outgoing?.type ?? null;
    const incomingType = incoming?.type ?? null;

    res.json({
      data: {
        outgoingType,
        incomingType,
        mutualSmile:
          outgoingType === ReactionType.SMILE && incomingType === ReactionType.SMILE,
      },
    });
  }),
);

// POST /api/discover/react — Envoyer un sourire ou une grimace
router.post("/react", validate(SendReactionSchema), wrap(ctrl.handleSend));

export default router;
