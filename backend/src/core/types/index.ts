import { Request } from "express";
import { Role } from "@prisma/client";

// ------------------------------------------------------------------
// Requête authentifiée : le middleware auth.ts injecte `user`
// ------------------------------------------------------------------
export interface AuthPayload {
  userId: string;
  role: Role;
  isPremium: boolean;
  /** Session de l'appareil appelant, lue dans le jeton d'accès signé (jamais fournie par le client). */
  sessionId?: string;
}

export interface AuthedRequest extends Request {
  user: AuthPayload;
}

// ------------------------------------------------------------------
// Format de réponse JSON standard
// ------------------------------------------------------------------
export interface ApiResponse<T = unknown> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ------------------------------------------------------------------
// Pagination
// ------------------------------------------------------------------
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page: number;
  pageSize: number;
}
