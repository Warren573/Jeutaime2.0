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


export async function handleUpdate(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  const { title, body } = req.body;
  res.json({
    data: await svc.updateCommunityPost(req.user.userId, id, title, body),
  });
}

export async function handleDelete(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  res.json({ data: await svc.deleteCommunityPost(req.user.userId, id) });
}
