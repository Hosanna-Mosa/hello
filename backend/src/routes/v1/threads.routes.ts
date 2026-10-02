/**
 * Threads and messages.
 *
 * Guards per route, not `router.use()` — this mounts at `/v1`, and a blanket
 * guard would turn every unknown path into a 401 instead of a 404.
 */

import express, { Router, type NextFunction, type Request, type Response } from "express";

import { voiceLog } from "@/config/callLog.js";
import { env } from "@/config/env.js";

import * as controller from "@/controllers/threads.controller.js";
import { requireAuth, requireOnboarded } from "@/middlewares/auth.js";
import { rateLimit } from "@/middlewares/rateLimit.js";
import { validateBody } from "@/middlewares/validate.js";
import { patchThreadSchema, reactionSchema, sendMessageSchema } from "@/validators/threads.validator.js";

export const threadsRouter: Router = Router();

const guarded = [requireAuth, rateLimit("api-user", "user"), requireOnboarded];

/**
 * One line when a voice upload arrives and one when it is answered, whatever
 * answered it — auth, rate limit, body parser, validation or the controller.
 */
function voiceUploadAudit(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();
  const threadId = req.params.id;
  voiceLog.info(
    {
      threadId,
      contentType: req.header("content-type") ?? "none",
      contentLength: req.header("content-length") ?? "none",
      transferEncoding: req.header("transfer-encoding") ?? "none",
      hasAuth: Boolean(req.header("authorization")),
    },
    "[voice] upload request arrived",
  );
  res.on("finish", () => {
    const line = {
      threadId,
      status: res.statusCode,
      ms: Date.now() - started,
      errorCode: res.locals.errorCode as string | undefined,
      errorMessage: res.locals.errorMessage as string | undefined,
    };
    if (res.statusCode >= 400) voiceLog.warn(line, `[voice] upload FAILED with ${res.statusCode}`);
    else voiceLog.info(line, `[voice] upload answered ${res.statusCode}`);
  });
  next();
}

threadsRouter.get("/threads", guarded, controller.getThreads);
threadsRouter.get("/threads/:id/messages", guarded, controller.getMessages);
threadsRouter.post(
  "/threads/:id/messages",
  guarded,
  rateLimit("message-send", "user"),
  validateBody(sendMessageSchema),
  controller.postMessage,
);
/**
 * Voice messages. The body is raw audio, so this route parses its own body —
 * with its own size cap — instead of the app-wide 64kb JSON parser.
 */
threadsRouter.post(
  "/threads/:id/voice",
  // FIRST, before auth and the body parser: a refusal by either never reaches
  // the controller's own logging, and production has no request log.
  voiceUploadAudit,
  guarded,
  rateLimit("message-send", "user"),
  // ANY content type. The phone's fetch (`expo/fetch`) has been seen to send
  // an EMPTY Content-Type for a clip read from disk; matching only `audio/*`
  // then skipped the body and refused every upload as "empty". What the bytes
  // ARE is decided by the MP4 sniff in `saveVoice`, not by a header.
  express.raw({ type: () => true, limit: env.VOICE_MAX_BYTES }),
  controller.postVoice,
);
threadsRouter.get("/messages/:id/voice", guarded, controller.getVoice);
threadsRouter.post("/threads/:id/read", guarded, controller.postRead);
threadsRouter.patch("/threads/:id", guarded, validateBody(patchThreadSchema), controller.patchThread);

threadsRouter.post("/messages/:id/reactions", guarded, validateBody(reactionSchema), controller.postReaction);
