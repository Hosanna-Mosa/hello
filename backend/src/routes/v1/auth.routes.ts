/**
 * Auth routes. Path -> middleware -> controller, and nothing else.
 *
 * `/auth/*` is the only unauthenticated surface, which is exactly why it is the
 * only one carrying two rate-limit dimensions.
 */

import { Router } from "express";

import { env } from "@/config/env.js";
import * as controller from "@/controllers/auth.controller.js";
import { requireAuth } from "@/middlewares/auth.js";
import { rateLimit } from "@/middlewares/rateLimit.js";
import { validateBody } from "@/middlewares/validate.js";
import {
  emailLoginSchema,
  loginSchema,
  refreshSchema,
  sendCodeSchema,
  signupSchema,
  verifyCodeSchema,
} from "@/validators/auth.validator.js";

export const authRouter: Router = Router();

authRouter.post("/signup", validateBody(signupSchema), rateLimit("auth-signup-ip", "ip"), controller.postSignup);

// Per IP AND per account: the IP bucket stops one client walking many accounts,
// the account bucket stops many clients guessing one password.
authRouter.post(
  "/login",
  validateBody(loginSchema),
  rateLimit("auth-login-ip", "ip"),
  rateLimit("auth-login-account", "identifier"),
  controller.postLogin,
);

/*
 * The older phone + OTP sign-in. Off unless `OTP_LOGIN_ENABLED`: a verified
 * code creates an account with no password, which would be a second way in
 * beside `/signup`. The backend test suite turns it on to sign its users in.
 */
if (env.OTP_LOGIN_ENABLED) {
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
}

// The store-review sign-in. Per-IP only: there is one account behind it, so a
// per-subject bucket would add nothing a guesser could not walk around.
authRouter.post("/email", validateBody(emailLoginSchema), rateLimit("auth-email-ip", "ip"), controller.postEmailLogin);

authRouter.post("/refresh", validateBody(refreshSchema), rateLimit("auth-refresh-ip", "ip"), controller.postRefresh);

authRouter.post("/onboarding/complete", requireAuth, controller.postOnboardingComplete);
authRouter.post("/signout", requireAuth, controller.postSignOut);
