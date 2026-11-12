import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { Role } from "@prisma/client";
import { UnauthorizedError } from "../errors";

export interface AccessTokenPayload {
  userId: string;
  role: Role;
  isPremium: boolean;
  /**
   * Identifiant de la session (RefreshToken.id) pour laquelle ce jeton d'accès a été émis.
   * Posé par le serveur au moment de l'émission et couvert par la signature : le client
   * ne peut ni le choisir ni le modifier. Absent des jetons émis avant cette évolution.
   */
  sid?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ["HS256"],
    }) as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError("Token invalide ou expiré");
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, {
      algorithms: ["HS256"],
    }) as RefreshTokenPayload;
  } catch {
    throw new UnauthorizedError("Refresh token invalide ou expiré");
  }
}
