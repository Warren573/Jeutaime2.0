import { Response, NextFunction } from "express";
import { AuthedRequest } from "../types";
import { verifyAccessToken } from "../utils/jwt";
import { UnauthorizedError, ForbiddenError } from "../errors";
import { prisma } from "../../config/prisma";
import { Role } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { isPremiumActive } from "../../policies/premium";

/**
 * Middleware principal d'authentification.
 * Injecte `req.user: AuthPayload` si le token est valide.
 */
export const requireAuth = asyncHandler(async (req: AuthedRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Token manquant");
  }

  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token);

  // Vérifier que le user existe et n'est pas banni
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, isBanned: true, premiumTier: true, premiumUntil: true },
  });

  if (!user) {
    throw new UnauthorizedError("Utilisateur introuvable");
  }
  if (user.isBanned) {
    throw new ForbiddenError("Ton compte est banni");
  }

  req.user = {
    userId: user.id,
    role: user.role,
    isPremium: isPremiumActive(user),
  };

  next();
});

/**
 * Middleware factory pour vérifier un ou plusieurs rôles.
 * Doit être utilisé APRÈS requireAuth.
 */
export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError("Permissions insuffisantes");
    }
    next();
  };
}

/**
 * Middleware qui exige que l'utilisateur soit propriétaire de la ressource.
 * Compare `req.params[paramField]` avec `req.user.userId`.
 */
export function requireOwner(paramField = "id") {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();
    if (req.params[paramField] !== req.user.userId && req.user.role === Role.USER) {
      throw new ForbiddenError("Tu ne peux pas accéder à cette ressource");
    }
    next();
  };
}
