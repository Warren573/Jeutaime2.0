import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./users.service";

export async function handleChangePassword(req: AuthedRequest, res: Response) {
  await svc.changePassword(req.user.userId, req.body);
  res.json({ data: { message: "Mot de passe modifié avec succès" } });
}
