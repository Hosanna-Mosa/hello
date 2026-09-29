/**
 * Threads and messages.
 *
 * Guards per route, not `router.use()` — this mounts at `/v1`, and a blanket
 * guard would turn every unknown path into a 401 instead of a 404.
 */

import express, { Router } from "express";

import { env } from "@/config/env.js";

import * as controller from "@/controllers/threads.controller.js";
import { requireAuth, requireOnboarded } from "@/middlewares/auth.js";
import { rateLimit } from "@/middlewares/rateLimit.js";
import { validateBody } from "@/middlewares/validate.js";
import { patchThreadSchema, reactionSchema, sendMessageSchema } from "@/validators/threads.validator.js";

export const threadsRouter: Router = Router();

const guarded = [requireAuth, requireOnboarded];

threadsRouter.get("/threads", guarded, controller.getThreads);
threadsRouter.get("/threads/:id/messages", guarded, controller.getMessages);
threadsRouter.post(
  "/threads/:id/messages",
  guarded,
  rateLimit("message-send"),
  validateBody(sendMessageSchema),
  controller.postMessage,
);
/**
 * Voice messages. The body is raw audio, so this route parses its own body —
 * with its own size cap — instead of the app-wide 64kb JSON parser.
 */
threadsRouter.post(
  "/threads/:id/voice",
  guarded,
  rateLimit("message-send"),
  express.raw({ type: ["audio/*", "application/octet-stream"], limit: env.VOICE_MAX_BYTES }),
  controller.postVoice,
);
threadsRouter.get("/messages/:id/voice", guarded, controller.getVoice);
threadsRouter.post("/threads/:id/read", guarded, controller.postRead);
threadsRouter.patch("/threads/:id", guarded, validateBody(patchThreadSchema), controller.patchThread);

threadsRouter.post("/messages/:id/reactions", guarded, validateBody(reactionSchema), controller.postReaction);
