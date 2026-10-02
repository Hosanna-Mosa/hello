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

import { adminOrigins, corsOrigins, isTest } from "@/config/env.js";
import { errorHandler, notFoundHandler } from "@/middlewares/errorHandler.js";
import { requestId } from "@/middlewares/requestId.js";
import { rateLimit } from "@/middlewares/rateLimit.js";
import { requestLog, useHumanRequestLog } from "@/middlewares/requestLog.js";
import { postRazorpayWebhook } from "@/controllers/billing.controller.js";
import { adminRouter } from "@/routes/v1/admin.routes.js";
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
  app.use(compression());

  // The per-IP flood floor, under every API route — admin included, and BEFORE
  // body parsing so a flood is refused without reading its bodies. Health stays
  // outside it so a probe never reads as an outage.
  app.use("/v1", rateLimit("global", "ip"));

  // The admin panel, BEFORE the app's CORS: that one reflects any origin in
  // development, and the panel must never be reachable from one it does not
  // name. Credentials (the session cookie) are allowed only for ADMIN_ORIGINS;
  // with none set it is same-origin only. Its own small body limit, too.
  app.use(
    "/v1/admin",
    cors({
      origin: adminOrigins.length > 0 ? adminOrigins : false,
      credentials: true,
      methods: ["GET", "POST", "PATCH"],
      allowedHeaders: ["Content-Type", "X-Admin-Request"],
    }),
    express.json({ limit: "8kb" }),
    adminRouter,
  );

  // Razorpay's webhook: the RAW body, because the signature is over the exact
  // bytes sent. Before the JSON parser below, which would consume them. No
  // CORS — a server-to-server call has no origin.
  app.post("/v1/billing/razorpay/webhook", express.raw({ type: () => true, limit: "256kb" }), (req, res, next) => {
    postRazorpayWebhook(req, res).catch(next);
  });

  app.use(cors({ origin: corsOrigins, credentials: false }));
  // 64kb: the largest legitimate body is a bio or a message, both far under it.
  app.use(express.json({ limit: "64kb" }));

  app.use(healthRouter);

  app.use("/v1", v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
