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
    const data = req[target];
    console.log(`[VALIDATE-START] target=${target}`);
    console.log(`[VALIDATE-DATA] ${JSON.stringify(data)}`);

    const result = schema.safeParse(data);

    if (!result.success) {
      const error = result.error as ZodError;
      const details = error.issues.map((i) => ({
        code: i.code,
        path: i.path.join("."),
        message: i.message,
      }));
      console.error(`[VALIDATE-FAIL] target=${target}, details=${JSON.stringify(details)}`);
      return next(new BadRequestError("Données invalides", details));
    }

    console.log(`[VALIDATE-OK] target=${target}, result=${JSON.stringify(result.data)}`);
    // Remplacer les données par les données transformées/coercées par Zod
    (req as unknown as Record<string, unknown>)[target] = result.data;
    return next();
  };
}
