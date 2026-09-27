/**
 * Liveness and readiness. They are not the same question.
 *
 * /health  — is the process up? What a process manager restarts on.
 * /ready   — can it actually serve? Mongo reachable, Redis reachable, and
 *            transactions available. A load balancer that routes on /health
 *            alone will happily send traffic to a node whose database is gone.
 *
 * `transactions` is always REPORTED, but only fails readiness when
 * `REQUIRE_TRANSACTIONS` is set. Phases 1-3 write one document at a time and
 * run fine on a standalone; from Phase 4 a partial write is a corrupt account
 * state, so the flag goes on and this becomes a hard gate. Production refuses
 * to boot without it.
 */

import { Router } from "express";
import mongoose from "mongoose";

import { env } from "@/config/env.js";
import { redis } from "@/config/redis.js";
import { supportsTransactions } from "@/config/mongo.js";

export const healthRouter: Router = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", uptimeSec: Math.round(process.uptime()) });
});

healthRouter.get("/ready", async (_req, res) => {
  const mongoUp = mongoose.connection.readyState === 1;

  const redisUp = await redis
    .ping()
    .then((pong) => pong === "PONG")
    .catch(() => false);

  const transactions = mongoUp ? await supportsTransactions() : false;
  const ready = mongoUp && redisUp && (transactions || !env.REQUIRE_TRANSACTIONS);

  res.status(ready ? 200 : 503).json({
    ready,
    mongo: mongoUp ? "up" : "down",
    redis: redisUp ? "up" : "down",
    transactions,
    transactionsRequired: env.REQUIRE_TRANSACTIONS,
  });
});

