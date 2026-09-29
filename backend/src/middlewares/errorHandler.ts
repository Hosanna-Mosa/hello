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
  } else if (isBodyParserError(err)) {
    // Malformed JSON or an over-size body (a voice clip past its cap). The
    // client's fault, so a 400 it can show — not a 500 that reads as an outage.
    apiError = ApiError.validation(
      err.type === "entity.too.large" ? "That upload is too large." : "The request body could not be read.",
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

  // For a route's own audit line (the voice upload logs every outcome, and in
  // production there is no per-request log to fall back on).
  res.locals.errorCode = apiError.code;
  res.locals.errorMessage = apiError.message;

  res.status(apiError.status).json(apiError.toBody());
}

/** Errors thrown by express's body parsers carry a 4xx `status` and a `type`. */
function isBodyParserError(err: unknown): err is { status: number; type: string } {
  const e = err as { status?: unknown; type?: unknown } | null;
  return (
    typeof e?.type === "string" &&
    typeof e.status === "number" &&
    e.status >= 400 &&
    e.status < 500
  );
}
