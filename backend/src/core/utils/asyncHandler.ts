import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Encapsule un handler async pour propager les erreurs vers Express next()
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
