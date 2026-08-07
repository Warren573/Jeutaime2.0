import type { Response } from "express";
import { prisma } from "../../config/prisma";
import { RefugeService } from "./refuge.service";
import type {
  ProposeRefugeDto,
  AdoptRefugeDto,
  GuessDto,
  DailyChoiceDto,
  RevealConsentDto,
  UpdateBackgroundDto,
} from "./refuge.schemas";
import type { AuthedRequest } from "../../core/types";

function sendError(res: Response, error: any): void {
  if (error?.statusCode) {
    res.status(error.statusCode).json({
      error: { code: error.code ?? "ERROR", message: error.message },
    });
  } else {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne" } });
  }
}

type RefugeResponseLike = {
  otherProfile?: (Record<string, unknown> & { userId?: string; city?: string | null }) | null;
  [key: string]: unknown;
};

async function applyRefugeLocationPrivacy<T extends RefugeResponseLike>(value: T): Promise<T> {
  const otherProfile = value.otherProfile;
  const otherUserId = otherProfile?.userId;
  if (!otherProfile || typeof otherUserId !== "string") return value;

  const settings = await prisma.userSettings.findUnique({
    where: { userId: otherUserId },
    select: { locationShared: true },
  });

  if (settings?.locationShared === true) return value;
  return {
    ...value,
    otherProfile: { ...otherProfile, city: null },
  } as T;
}

function isRefugeDevEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.REFUGE_DEV_TIME_TRAVEL === "true";
}

export class RefugeController {
  static async propose(req: AuthedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const input = req.body as ProposeRefugeDto;

    try {
      const refugeSession = await RefugeService.proposeAsAdopte(userId, {
        animalType: input.animalType,
        acceptedSexe: input.acceptedSexe,
      });
      res.status(201).json({
        success: true,
        data: refugeSession,
        message: "Refuge proposé avec succès",
      });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  static async getAvailable(req: AuthedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    try {
      const adoptantGender = req.query.gender as string | undefined;
      const refuges = await RefugeService.getAvailableRefuges(userId, adoptantGender);
      res.status(200).json({ success: true, data: refuges, count: refuges.length });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  static async adopt(req: AuthedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const input = req.body as AdoptRefugeDto;

    try {
      const refugeSession = await RefugeService.adoptRefuge(userId, input.refugeSessionId);
      res.status(200).json({
        success: true,
        data: refugeSession,
        message: "Refuge adopté avec succès",
      });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  static async getSession(req: AuthedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const sessionId = req.params.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ error: "sessionId requis" });
      return;
    }

    try {
      const refugeSession = await RefugeService.getRefugeSession(sessionId, userId);
      const data = await applyRefugeLocationPrivacy(refugeSession as unknown as RefugeResponseLike);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  static async updateBackground(req: AuthedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const sessionId = req.params.sessionId as string;
    const { background } = req.body as UpdateBackgroundDto;

    if (!sessionId) {
      res.status(400).json({ error: "sessionId requis" });
      return;
    }

    try {
      const refugeSession = await RefugeService.updateBackground(sessionId, userId, background);
      res.status(200).json({
        success: true,
        data: refugeSession,
        message: "Fond d'ambiance mis à jour",
      });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  static async getActive(req: AuthedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    try {
      const activeSession = await RefugeService.getActiveRefugeSession(userId);
      res.status(200).json({ success: true, data: activeSession });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  static async submitDailyChoice(req: AuthedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const input = req.body as DailyChoiceDto;

    try {
      const choice = await RefugeService.submitDailyChoice(
        input.sessionId,
        userId,
        input.dayNumber,
        { action1: input.action1, action2: input.action2 },
      );
      res.status(201).json({
        success: true,
        data: choice,
        message: `Choix pour le jour ${input.dayNumber} enregistré`,
      });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  static async submitGuess(req: AuthedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const input = req.body as GuessDto;

    try {
      const guess = await RefugeService.submitGuess(
        input.sessionId,
        userId,
        input.dayNumber,
        {
          guessedAction1: input.guessedAction1,
          guessedAction2: input.guessedAction2,
        },
      );
      res.status(201).json({
        success: true,
        data: guess,
        message: `Devinettes pour le jour ${input.dayNumber} enregistrées`,
      });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  static async getHistory(req: AuthedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));

    try {
      const result = await RefugeService.getRefugeHistory(userId, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  static async submitRevealConsent(req: AuthedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const sessionId = req.params.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ error: "sessionId requis" });
      return;
    }

    const { decision } = req.body as RevealConsentDto;

    try {
      const session = await RefugeService.submitRevealConsent(sessionId, userId, decision);
      const data = await applyRefugeLocationPrivacy(session as unknown as RefugeResponseLike);
      res.status(200).json({
        success: true,
        data,
        message: decision === "ACCEPT" ? "Décision enregistrée" : "Le Refuge se termine ici",
      });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  static async devSetDay(req: AuthedRequest, res: Response): Promise<void> {
    if (!isRefugeDevEnabled()) {
      res.status(403).json({ error: "Dev mode not enabled" });
      return;
    }

    const sessionId = req.params.sessionId as string;
    const { day } = req.body as { day?: number };

    if (!sessionId) {
      res.status(400).json({ error: "sessionId is required" });
      return;
    }

    if (typeof day !== "number" || day < 1 || day > 7) {
      res.status(400).json({ error: "Day must be between 1 and 7" });
      return;
    }

    try {
      const result = await RefugeService.devSetDay(sessionId, day);
      res.status(200).json({
        success: true,
        data: result,
        message: `[DEV] Jumped to day ${day}`,
      });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  static async devAdvanceDay(req: AuthedRequest, res: Response): Promise<void> {
    if (!isRefugeDevEnabled()) {
      res.status(403).json({ error: "Dev mode not enabled" });
      return;
    }

    const sessionId = req.params.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ error: "sessionId is required" });
      return;
    }

    try {
      const result = await RefugeService.devAdvanceDay(sessionId);
      res.status(200).json({
        success: true,
        data: result,
        message: `[DEV] Advanced to day ${result.currentDay}`,
      });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  static async devResetSession(req: AuthedRequest, res: Response): Promise<void> {
    if (!isRefugeDevEnabled()) {
      res.status(403).json({ error: "Dev mode not enabled" });
      return;
    }

    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const sessionId = req.params.sessionId as string;
    const { mode } = req.body as { mode?: string };

    if (!sessionId) {
      res.status(400).json({ error: "sessionId is required" });
      return;
    }

    const resetMode = mode === "abandon" ? "abandon" : mode === "consent" ? "consent" : "reset";

    try {
      const result = await RefugeService.devResetSession(sessionId, userId, resetMode);
      const label =
        resetMode === "abandon"
          ? "abandonnée"
          : resetMode === "consent"
            ? "consentements effacés"
            : "remise à zéro";
      res.status(200).json({
        success: true,
        data: result,
        message: `[DEV] Session ${label}`,
      });
    } catch (error: any) {
      sendError(res, error);
    }
  }
}
