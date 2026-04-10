import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import { parsePagination } from "../../core/utils/pagination";
import { MatchStatus } from "@prisma/client";
import * as svc from "./matches.service";

export async function handleCreate(req: AuthedRequest, res: Response) {
  const match = await svc.createMatch(req.user.userId, req.body);
  res.status(201).json({ data: match });
}

export async function handleList(req: AuthedRequest, res: Response) {
  const pagination = parsePagination(req.query);

  // Filtre optionnel par status
  const raw = (req.query as Record<string, unknown>)["status"];
  const statusFilter =
    typeof raw === "string" && Object.values(MatchStatus).includes(raw as MatchStatus)
      ? (raw as MatchStatus)
      : undefined;

  const result = await svc.listMatches(req.user.userId, pagination, statusFilter);
  res.json(result);
}

export async function handleDetail(req: AuthedRequest, res: Response) {
  const match = await svc.getMatchDetail(
    req.params["id"] as string,
    req.user.userId,
  );
  res.json({ data: match });
}

export async function handleAccept(req: AuthedRequest, res: Response) {
  const match = await svc.acceptMatch(
    req.params["id"] as string,
    req.user.userId,
  );
  res.json({ data: match });
}

export async function handleDecline(req: AuthedRequest, res: Response) {
  const match = await svc.declineMatch(
    req.params["id"] as string,
    req.user.userId,
  );
  res.json({ data: match });
}

export async function handleBreak(req: AuthedRequest, res: Response) {
  const match = await svc.breakMatch(
    req.params["id"] as string,
    req.user.userId,
  );
  res.json({ data: match });
}

export async function handleGhostRelance(req: AuthedRequest, res: Response) {
  const result = await svc.ghostRelance(
    req.params["id"] as string,
    req.user.userId,
    req.body,
  );
  res.status(201).json({ data: result });
}
