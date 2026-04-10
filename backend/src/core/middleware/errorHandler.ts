import { Request, Response, NextFunction } from "express";
import { HttpError } from "../errors";
import { logger } from "../../config/logger";
import { ApiError } from "../types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path, method: req.method }, err.message);
    }
    const body: ApiError = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && { details: err.details }),
      },
    };
    return res.status(err.statusCode).json(body);
  }

  // Erreur inconnue
  logger.error({ err, path: req.path, method: req.method }, "Erreur non gérée");
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Erreur interne du serveur" },
  });
}
