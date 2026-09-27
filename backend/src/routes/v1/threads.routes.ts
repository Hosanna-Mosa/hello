/**
 * Threads and messages.
 *
 * Guards per route, not `router.use()` — this mounts at `/v1`, and a blanket
 * guard would turn every unknown path into a 401 instead of a 404.
 */

import { Router } from "express";

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
threadsRouter.post("/threads/:id/read", guarded, controller.postRead);
threadsRouter.patch("/threads/:id", guarded, validateBody(patchThreadSchema), controller.patchThread);

threadsRouter.post("/messages/:id/reactions", guarded, validateBody(reactionSchema), controller.postReaction);
