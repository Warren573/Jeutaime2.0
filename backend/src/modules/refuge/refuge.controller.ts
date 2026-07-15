import type { Response } from "express";
import { RefugeService } from "./refuge.service";
import type { ProposeRefugeDto, AdoptRefugeDto, GuessDto } from "./refuge.schemas";
import type { AuthedRequest } from "../../core/types";

// ============================================================
// RefugeController — Handlers HTTP pour Refuge
// ============================================================

export class RefugeController {
  // ============================================================
  // POST /api/refuge/propose
  // ============================================================

  static async propose(req: AuthedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const input = req.body as ProposeRefugeDto;

    try {
      const refugeSession = await RefugeService.proposeAsAdopte(userId, {
        animalType: input.animalType as any,
        acceptedSexe: input.acceptedSexe as any,
      });
      res.status(201).json({
        success: true,
        data: refugeSession,
        message: "Refuge proposé avec succès",
      });
    } catch (error: any) {
      if (error.statusCode) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Erreur interne" });
      }
    }
  }

  // ============================================================
  // GET /api/refuge/available
  // ============================================================

  static async getAvailable(req: AuthedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    try {
      const adoptantGender = req.query.gender as string | undefined;
      const refuges = await RefugeService.getAvailableRefuges(userId, adoptantGender);

      res.status(200).json({
        success: true,
        data: refuges,
        count: refuges.length,
      });
    } catch (error: any) {
      if (error.statusCode) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Erreur interne" });
      }
    }
  }

  // ============================================================
  // POST /api/refuge/adopt
  // ============================================================

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
      if (error.statusCode) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Erreur interne" });
      }
    }
  }

  // ============================================================
  // GET /api/refuge/session/:sessionId
  // ============================================================

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

      res.status(200).json({
        success: true,
        data: refugeSession,
      });
    } catch (error: any) {
      if (error.statusCode) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Erreur interne" });
      }
    }
  }

  // ============================================================
  // PATCH /api/refuge/session/:sessionId/background
  // ============================================================

  static async updateBackground(req: AuthedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const sessionId = req.params.sessionId as string;
    const { background } = req.body as { background: string };

    if (!sessionId) {
      res.status(400).json({ error: "sessionId requis" });
      return;
    }

    if (!background) {
      res.status(400).json({ error: "background requis" });
      return;
    }

    try {
      const refugeSession = await RefugeService.updateBackground(sessionId, userId, background as any);

      res.status(200).json({
        success: true,
        data: refugeSession,
        message: "Fond d'ambiance mis à jour",
      });
    } catch (error: any) {
      if (error.statusCode) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Erreur interne" });
      }
    }
  }

  // ============================================================
  // GET /api/refuge/active
  // ============================================================

  static async getActive(req: AuthedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    try {
      const activeSession = await RefugeService.getActiveRefugeSession(userId);

      res.status(200).json({
        success: true,
        data: activeSession,
      });
    } catch (error: any) {
      if (error.statusCode) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Erreur interne" });
      }
    }
  }

  // ============================================================
  // POST /api/refuge/guess
  // ============================================================

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
          guessedAction1: input.guessedAction1 as any,
          guessedAction2: input.guessedAction2 as any,
        }
      );

      res.status(201).json({
        success: true,
        data: guess,
        message: `Devinettes pour le jour ${input.dayNumber} enregistrées`,
      });
    } catch (error: any) {
      if (error.statusCode) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Erreur interne" });
      }
    }
  }

  // ============================================================
  // DEV MODE: POST /dev/refuge/:sessionId/set-day
  // ============================================================

  static async devSetDay(req: AuthedRequest, res: Response): Promise<void> {
    // Check if dev mode is enabled
    const devEnabled = process.env.REFUGE_DEV_TIME_TRAVEL === "true";
    const isProd = process.env.NODE_ENV === "production";

    if (isProd || !devEnabled) {
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
      if (error.statusCode) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal error" });
      }
    }
  }
}
