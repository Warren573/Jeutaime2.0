import { Request, Response } from "express";
import * as authService from "./auth.service";
import { changePassword } from "./accountSecurity.service";
import { exportPersonalData } from "./dataExport.service";
import { deactivateAccount, reactivateAccountByEmail } from "./accountLifecycle.service";
import { AuthedRequest } from "../../core/types";
import { BadRequestError } from "../../core/errors";

export async function handleRegister(req: Request, res: Response) {
  const tokens = await authService.register(req.body);
  res.status(201).json({ data: tokens });
}

export async function handleLogin(req: Request, res: Response) {
  const tokens = await authService.login(req.body);
  const reactivated = await reactivateAccountByEmail(req.body.email);
  res.json({ data: tokens, meta: { reactivated } });
}

export async function handleRefresh(req: Request, res: Response) {
  const tokens = await authService.refresh(req.body.refreshToken);
  res.json({ data: tokens });
}

export async function handleLogout(req: AuthedRequest, res: Response) {
  const body = req.body as Record<string, unknown>;
  const refreshToken = typeof body["refreshToken"] === "string" ? body["refreshToken"] : "";
  if (!refreshToken) throw new BadRequestError("refreshToken requis dans le body");
  await authService.logout(req.user.userId, refreshToken);
  res.json({ data: { message: "Déconnecté avec succès" } });
}

export async function handleChangePassword(req: AuthedRequest, res: Response) {
  await changePassword(req.user.userId, req.body.currentPassword, req.body.newPassword);
  res.json({ data: { message: "Mot de passe modifié" } });
}

export async function handleDeactivate(req: AuthedRequest, res: Response) {
  await deactivateAccount(req.user.userId, req.body.currentPassword);
  res.json({ data: { message: "Compte désactivé" } });
}

export async function handleExportData(req: AuthedRequest, res: Response) {
  const data = await exportPersonalData(req.user.userId);
  res.json({ data });
}

export async function handleMe(req: AuthedRequest, res: Response) {
  const user = await authService.getMe(req.user.userId);
  res.json({ data: user });
}
