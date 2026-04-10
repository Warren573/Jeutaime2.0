import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { BadRequestError } from "../errors";

type Target = "body" | "params" | "query";

/**
 * Middleware factory de validation Zod.
 * Usage : validate(MySchema)           → valide req.body
 *         validate(MySchema, "params") → valide req.params
 */
export function validate(schema: ZodSchema, target: Target = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const details = (result.error as ZodError).issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      return next(new BadRequestError("Données invalides", details));
    }
    // Remplacer les données par les données transformées/coercées par Zod
    (req as Record<string, unknown>)[target] = result.data;
    return next();
  };
}
