/**
 * Blocks and reports.
 *
 * Guards per route, not `router.use()` — this mounts at `/v1`, and a blanket
 * guard would turn every unknown path into a 401 instead of a 404.
 */

import { Router } from "express";

import * as controller from "@/controllers/safety.controller.js";
import { requireAuth, requireOnboarded } from "@/middlewares/auth.js";
import { rateLimit } from "@/middlewares/rateLimit.js";
import { validateBody } from "@/middlewares/validate.js";
import { blockSchema, reportSchema } from "@/validators/safety.validator.js";

export const safetyRouter: Router = Router();

const guarded = [requireAuth, rateLimit("api-user", "user"), requireOnboarded];

safetyRouter.post("/blocks", guarded, rateLimit("me-write", "user"), validateBody(blockSchema), controller.postBlock);
safetyRouter.get("/blocks", guarded, controller.getBlocks);
safetyRouter.delete("/blocks/:userId", guarded, controller.deleteBlock);

safetyRouter.post("/reports", guarded, rateLimit("me-write", "user"), validateBody(reportSchema), controller.postReport);
