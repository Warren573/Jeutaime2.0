import { Response } from "express";
import { AuthedRequest } from "../../../core/types";
import * as svc from "./adminUsers.service";
import type { BanUserDto, WarnUserDto } from "./adminUsers.schemas";

// POST /api/admin/users/:id/ban
export async function handleBan(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  const { reason } = req.body as BanUserDto;
  const data = await svc.banUser(
    { id: req.user.userId, role: req.user.role },
    id,
    reason,
  );
  res.json({ data });
}

// POST /api/admin/users/:id/unban
export async function handleUnban(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  const data = await svc.unbanUser(
    { id: req.user.userId, role: req.user.role },
    id,
  );
  res.json({ data });
}

// POST /api/admin/users/:id/warn
export async function handleWarn(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  const { message } = req.body as WarnUserDto;
  const data = await svc.warnUser(
    { id: req.user.userId, role: req.user.role },
    id,
    message,
  );
  res.json({ data });
}
