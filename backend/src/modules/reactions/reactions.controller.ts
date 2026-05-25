import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as service from "./reactions.service";

export async function handleSend(req: AuthedRequest, res: Response) {
  const result = await service.sendReaction(req.user.userId, req.body);
  console.log("[handleSend] SERVICE_RESULT:", JSON.stringify(result, null, 2));
  res.json({ data: result });
}
