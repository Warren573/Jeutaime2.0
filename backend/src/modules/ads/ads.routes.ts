import { Router, Request, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
import { AuthedRequest } from "../../core/types";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { createCachedKeyFetcher, verifyAdmobSsv } from "./admobSsv";
import { getRewardedAdStatus, grantVerifiedAdReward } from "./ads.service";

const router = Router();

const fetchKeys = createCachedKeyFetcher(env.ADMOB_SSV_KEYS_URL);
const allowedAdUnits = env.ADMOB_REWARDED_AD_UNITS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * GET /api/ads/admob/ssv — appelé par les serveurs Google, jamais par l'application.
 * Sans authentification utilisateur : seule la signature de la requête fait foi.
 *
 * Réponses : 404 si la fonction est désactivée ; 403 si la requête n'est pas
 * une validation authentique ; 200 dans tous les autres cas (crédité, déjà
 * crédité, plafond atteint) pour que le réseau ne renvoie pas la validation.
 */
router.get(
  "/admob/ssv",
  asyncHandler(async (req: Request, res: Response) => {
    if (!env.ADS_REWARDED_ENABLED) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Route introuvable" } });
      return;
    }

    const queryStart = req.originalUrl.indexOf("?");
    const rawQuery = queryStart >= 0 ? req.originalUrl.slice(queryStart + 1) : "";

    const verification = await verifyAdmobSsv({ rawQuery, fetchKeys, allowedAdUnits });
    if (!verification.ok) {
      logger.warn({ reason: verification.reason }, "Validation publicitaire refusée");
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Validation refusée" } });
      return;
    }

    const outcome = await grantVerifiedAdReward(verification.reward);
    logger.info({ status: outcome.status }, "Validation publicitaire traitée");
    res.status(200).json({ status: outcome.status });
  }),
);

/** GET /api/ads/rewarded/status — état pour l'utilisateur connecté. */
router.get(
  "/rewarded/status",
  requireAuth as never,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthedRequest).user;
    res.json({ data: await getRewardedAdStatus(userId, env.ADS_REWARDED_ENABLED) });
  }),
);

export default router;
