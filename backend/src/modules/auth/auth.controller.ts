import { Request, Response } from "express";
import * as authService from "./auth.service";
import { AuthedRequest } from "../../core/types";
import { BadRequestError } from "../../core/errors";

export async function handleRegister(req: Request, res: Response) {
  const tokens = await authService.register(req.body);
  res.status(201).json({ data: tokens });
}

export async function handleLogin(req: Request, res: Response) {
  const tokens = await authService.login(req.body);
  res.json({ data: tokens });
}

export async function handleRefresh(req: Request, res: Response) {
  const tokens = await authService.refresh(req.body.refreshToken);
  res.json({ data: tokens });
}

export async function handleLogout(req: AuthedRequest, res: Response) {
  const raw = req.headers.authorization?.slice(7) ?? "";
  const body = req.body as Record<string, unknown>;
  const refreshToken = typeof body["refreshToken"] === "string" ? body["refreshToken"] : "";
  if (!refreshToken) throw new BadRequestError("refreshToken requis dans le body");
  await authService.logout(req.user.userId, refreshToken);
  res.json({ data: { message: "Déconnecté avec succès" } });
}

export async function handleMe(req: AuthedRequest, res: Response) {
  const user = await authService.getMe(req.user.userId);
  res.json({ data: user });
}
