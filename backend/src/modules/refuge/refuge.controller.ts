import type { Response } from "express";
import { RefugeService } from "./refuge.service";
import type { ProposeRefugeDto, AdoptRefugeDto } from "./refuge.schemas";
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
        animalCategory: input.animalCategory as any,
        animalSexe: input.animalSexe as any,
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
    try {
      const adoptantGender = req.query.gender as string | undefined;
      const refuges = await RefugeService.getAvailableRefuges(adoptantGender);

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
}
