import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./questions.service";

export async function handleGetQuestions(req: AuthedRequest, res: Response) {
  const result = await svc.getMatchQuestions(
    req.params["matchId"] as string,
    req.user.userId,
  );
  res.json({ data: result });
}

export async function handleSubmitAnswers(req: AuthedRequest, res: Response) {
  const result = await svc.submitMatchAnswers(
    req.params["matchId"] as string,
    req.user.userId,
    req.body,
  );
  res.status(200).json({ data: result });
}
