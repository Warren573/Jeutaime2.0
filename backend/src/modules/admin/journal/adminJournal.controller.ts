import { Response } from "express";
import { AuthedRequest } from "../../../core/types";
import * as svc from "./adminJournal.service";

export async function handleList(_req: AuthedRequest, res: Response) {
  res.json({ data: await svc.listCommunityPosts() });
}

export async function handleCreate(req: AuthedRequest, res: Response) {
  const { title, body } = req.body;
  res.status(201).json({
    data: await svc.createCommunityPost(req.user.userId, title, body),
  });
}
