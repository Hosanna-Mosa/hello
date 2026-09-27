/**
 * Auth routes. Path -> middleware -> controller, and nothing else.
 *
 * `/auth/*` is the only unauthenticated surface, which is exactly why it is the
 * only one carrying two rate-limit dimensions.
 */

import { Router } from "express";

import * as controller from "@/controllers/auth.controller.js";
import { requireAuth } from "@/middlewares/auth.js";
import { rateLimit } from "@/middlewares/rateLimit.js";
import { validateBody } from "@/middlewares/validate.js";
import { refreshSchema, sendCodeSchema, verifyCodeSchema } from "@/validators/auth.validator.js";

export const authRouter: Router = Router();

authRouter.post(
  "/code",
  validateBody(sendCodeSchema),
  rateLimit("auth-code-phone", "phone"),
  rateLimit("auth-code-ip", "ip"),
  controller.postCode,
);

authRouter.post(
  "/verify",
  validateBody(verifyCodeSchema),
  rateLimit("auth-verify-phone", "phone"),
  controller.postVerify,
);

authRouter.post("/refresh", validateBody(refreshSchema), rateLimit("auth-refresh-ip", "ip"), controller.postRefresh);

authRouter.post("/onboarding/complete", requireAuth, controller.postOnboardingComplete);
authRouter.post("/signout", requireAuth, controller.postSignOut);
