/**
 * Likes, requests and matches.
 *
 * Guards per route, not `router.use()` — this mounts at `/v1`, and a blanket
 * guard would turn every unknown path into a 401 instead of a 404.
 */

import { Router } from "express";

import * as controller from "@/controllers/likes.controller.js";
import { requireAuth, requireOnboarded } from "@/middlewares/auth.js";
import { rateLimit } from "@/middlewares/rateLimit.js";
import { validateBody } from "@/middlewares/validate.js";
import { likeSchema } from "@/validators/likes.validator.js";

export const likesRouter: Router = Router();

const guarded = [requireAuth, rateLimit("api-user", "user"), requireOnboarded];

likesRouter.post("/likes", guarded, rateLimit("me-write", "user"), validateBody(likeSchema), controller.postLike);
likesRouter.get("/likes/inbound", guarded, controller.getInboundLikes);
likesRouter.get("/likes/outbound", guarded, controller.getOutboundLikes);

likesRouter.get("/requests", guarded, controller.getRequests);
likesRouter.post("/requests/:id/accept", guarded, controller.postAcceptRequest);
likesRouter.post("/requests/:id/decline", guarded, controller.postDeclineRequest);

likesRouter.get("/connections/:userId", guarded, controller.getConnection);

likesRouter.get("/matches", guarded, controller.getMatches);
likesRouter.delete("/matches/:id", guarded, controller.deleteMatch);
