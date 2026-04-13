import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./users.service";
import { BadRequestError } from "../../core/errors";

export async function handleChangePassword(req: AuthedRequest, res: Response) {
  await svc.changePassword(req.user.userId, req.body);
  res.json({ data: { message: "Mot de passe modifié avec succès" } });
}

export async function handleDeactivate(req: AuthedRequest, res: Response) {
  const result = await svc.deactivateAccount(req.user.userId);
  res.json({ data: result });
}

export async function handleDeleteAccount(req: AuthedRequest, res: Response) {
  const body = req.body as Record<string, unknown>;
  const password = body["password"];
  if (typeof password !== "string" || !password) {
    throw new BadRequestError("Confirmation du mot de passe requise");
  }
  await svc.deleteAccount(req.user.userId, password);
  res.json({ data: { message: "Compte supprimé définitivement" } });
}
