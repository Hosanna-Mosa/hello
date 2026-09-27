/**
 * Zod validation for a request.
 *
 * Runs BEFORE the controller so a handler never sees a shape it did not ask
 * for, and replaces `req.body` with the PARSED value — so unknown keys are
 * stripped rather than passed along to a model that would then throw on
 * `strict: "throw"`.
 */

import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    req.body = parsed.data;
    next();
  };
}
