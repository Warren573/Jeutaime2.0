import { Response } from "express";
import { AuthedRequest } from "../../../core/types";
import * as svc from "./adminUsers.service";
import type { AdjustCoinsDto, BanUserDto, UpdateRoleDto, WarnUserDto } from "./adminUsers.schemas";

// GET /api/admin/users
export async function handleListUsers(req: AuthedRequest, res: Response) {
  const q = typeof req.query["q"] === "string" ? req.query["q"] : undefined;
  const data = await svc.listUsers(q);
  res.json({ data });
}

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


export async function handleGetUserDetail(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  const data = await svc.getUserDetail(id);
  res.json({ data });
}

export async function handleAdjustCoins(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  const { amount, reason } = req.body as AdjustCoinsDto;
  const data = await svc.adjustCoins(
    { id: req.user.userId, role: req.user.role },
    id,
    amount,
    reason,
  );
  res.json({ data });
}

export async function handleUpdateRole(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  const { role } = req.body as UpdateRoleDto;
  const data = await svc.updateRole(
    { id: req.user.userId, role: req.user.role },
    id,
    role,
  );
  res.json({ data });
}
