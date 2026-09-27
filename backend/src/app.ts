/**
 * The Express app. Middleware order here is behaviour, not style.
 *
 * requestId first, so every later log line carries it — including one from a
 * body parser that rejects malformed JSON. The error handler is last, because
 * Express only treats a 4-argument function as an error handler and only
 * reaches it after everything mounted above.
 *
 * Health is mounted OUTSIDE /v1: it is infrastructure, not API, and a probe
 * should not break when the API version does.
 */

import compression from "compression";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";

import { corsOrigins, isTest } from "@/config/env.js";
import { errorHandler, notFoundHandler } from "@/middlewares/errorHandler.js";
import { requestId } from "@/middlewares/requestId.js";
import { requestLog, useHumanRequestLog } from "@/middlewares/requestLog.js";
import { healthRouter } from "@/routes/v1/health.routes.js";
import { v1Router } from "@/routes/v1/index.js";

export function createApp(): Express {
  const app = express();

  // Behind Nginx on the VPS: without this, every rate limit sees the proxy's IP
  // as the whole internet and one user can exhaust everyone's budget.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(requestId);

  // Mounted AFTER requestId so a logged line can carry it, and BEFORE the
  // routes so it sees every request including the ones that 404.
  if (!isTest && useHumanRequestLog) app.use(requestLog);

  app.use(helmet());
  app.use(cors({ origin: corsOrigins, credentials: false }));
  app.use(compression());
  // 64kb: the largest legitimate body is a bio or a message, both far under it.
  app.use(express.json({ limit: "64kb" }));

  app.use(healthRouter);

  app.use("/v1", v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
