import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import { parsePagination } from "../../core/utils/pagination";
import { MatchStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import * as svc from "./matches.service";

type MatchResponseLike = {
  otherUserId?: string;
  otherProfile?: (Record<string, unknown> & { city?: string | null }) | null;
  [key: string]: unknown;
};

async function applyMatchLocationPrivacy<T extends MatchResponseLike>(matches: T[]): Promise<T[]> {
  const userIds = [
    ...new Set(
      matches
        .map((match) => match.otherUserId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  if (userIds.length === 0) return matches;

  const settings = await prisma.userSettings.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, locationShared: true },
  });
  const sharedByUser = new Map(settings.map((entry) => [entry.userId, entry.locationShared]));

  return matches.map((match) => {
    if (!match.otherUserId || !match.otherProfile) return match;
    if (sharedByUser.get(match.otherUserId) === true) return match;

    return {
      ...match,
      otherProfile: {
        ...match.otherProfile,
        city: null,
      },
    } as T;
  });
}

async function applySingleMatchLocationPrivacy<T extends MatchResponseLike>(match: T): Promise<T> {
  const [sanitized] = await applyMatchLocationPrivacy([match]);
  return sanitized ?? match;
}

export async function handleCreate(req: AuthedRequest, res: Response) {
  const match = await svc.createMatch(req.user.userId, req.body);
  res.status(201).json({ data: match });
}

export async function handleList(req: AuthedRequest, res: Response) {
  const pagination = parsePagination(req.query);

  const raw = (req.query as Record<string, unknown>)["status"];
  const statusFilter =
    typeof raw === "string" && Object.values(MatchStatus).includes(raw as MatchStatus)
      ? (raw as MatchStatus)
      : undefined;

  const result = await svc.listMatches(req.user.userId, pagination, statusFilter);
  const data = await applyMatchLocationPrivacy(result.data as MatchResponseLike[]);
  res.json({ ...result, data });
}

export async function handleDetail(req: AuthedRequest, res: Response) {
  const match = await svc.getMatchDetail(
    req.params["id"] as string,
    req.user.userId,
  );
  res.json({ data: await applySingleMatchLocationPrivacy(match as MatchResponseLike) });
}

export async function handleAccept(req: AuthedRequest, res: Response) {
  const match = await svc.acceptMatch(
    req.params["id"] as string,
    req.user.userId,
  );
  res.json({ data: await applySingleMatchLocationPrivacy(match as MatchResponseLike) });
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
  const match = await applySingleMatchLocationPrivacy(result.match as MatchResponseLike);
  res.status(201).json({ data: { ...result, match } });
}

export async function handleBlock(req: AuthedRequest, res: Response) {
  const match = await svc.blockMatch(
    req.params["id"] as string,
    req.user.userId,
  );
  res.json({ data: match });
}

export async function handleRelance(req: AuthedRequest, res: Response) {
  const match = await svc.relanceMatch(
    req.params["id"] as string,
    req.user.userId,
  );
  res.json({ data: await applySingleMatchLocationPrivacy(match as MatchResponseLike) });
}
