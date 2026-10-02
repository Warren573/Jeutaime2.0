import { Response } from "express";
import { AuthedRequest } from "../../../core/types";
import * as svc from "./adminOverview.service";

export async function handleGetOverview(_req: AuthedRequest, res: Response) {
  const data = await svc.getOverview();
  res.json({ data });
}
