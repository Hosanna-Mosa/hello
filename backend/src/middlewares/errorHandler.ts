/**
 * The last middleware. Every failure leaves through here, in the contract's
 * envelope and nothing else.
 *
 * An unknown error becomes a plain `server` with a safe message: an ORM error
 * string or a stack trace in a response body is an information leak, and the
 * client only renders the generic retry state for `server` anyway. The real
 * error still reaches the log with its request id.
 */

import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { ApiError, isApiError } from "@/errors/ApiError.js";
import { logger } from "@/config/logger.js";

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound("That endpoint does not exist."));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = res.locals.requestId as string | undefined;

  let apiError: ApiError;

  if (isApiError(err)) {
    apiError = err;
  } else if (err instanceof ZodError) {
    // The first issue is the one worth showing; the rest go to the log.
    const first = err.issues[0];
    const where = first?.path.join(".");
    apiError = ApiError.validation(
      first ? `${where ? `${where}: ` : ""}${first.message}` : undefined,
      err.issues,
    );
  } else {
    apiError = ApiError.server(undefined, err);
  }

  // Only 5xx is logged here. A 4xx is already one readable line from
  // `requestLog` carrying the status, and logging it twice turns a terminal
  // you are trying to watch into noise. The 5xx case keeps its stack, because
  // that is the one where the line alone does not tell you what happened.
  if (apiError.status >= 500) {
    logger.error({ err, requestId, path: req.originalUrl, method: req.method }, "request failed");
  }

  res.status(apiError.status).json(apiError.toBody());
}
