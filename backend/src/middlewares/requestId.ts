/**
 * A request id on every request and every log line.
 *
 * Honours an inbound `x-request-id` so a trace survives the proxy hop, but
 * never trusts its length — an unbounded header would land in every log line.
 */

import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.header("x-request-id");
  const id = inbound && inbound.length <= 64 ? inbound : randomUUID();
  res.locals.requestId = id;
  res.setHeader("x-request-id", id);
  next();
}
