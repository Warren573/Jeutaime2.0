import { Response } from "express";
import { AuthedRequest } from "../../../core/types";
import * as svc from "./adminSalons.service";
import type {
  ActivateSalonDto,
  CreateSalonDto,
  UpdateSalonDto,
} from "./adminSalons.schemas";

// ============================================================
// GET /api/admin/salons
// ============================================================
export async function handleList(_req: AuthedRequest, res: Response) {
  const data = await svc.listAll();
  res.json({ data });
}

// ============================================================
// POST /api/admin/salons
// ============================================================
export async function handleCreate(req: AuthedRequest, res: Response) {
  const dto = req.body as CreateSalonDto;
  const created = await svc.createSalon(req.user.userId, dto);
  res.status(201).json({ data: created });
}

// ============================================================
// PATCH /api/admin/salons/:id
// ============================================================
export async function handleUpdate(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  const dto = req.body as UpdateSalonDto;
  const updated = await svc.updateSalon(req.user.userId, id, dto);
  res.json({ data: updated });
}

// ============================================================
// PATCH /api/admin/salons/:id/activate
// ============================================================
export async function handleSetActive(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  const { isActive } = req.body as ActivateSalonDto;
  const updated = await svc.setActive(req.user.userId, id, isActive);
  res.json({ data: updated });
}
