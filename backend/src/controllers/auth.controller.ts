/**
 * Auth controllers. HTTP in, service out, serializer back. No queries here.
 */

import type { Request, Response } from "express";

import { ApiError } from "@/errors/ApiError.js";
import * as authService from "@/services/auth.service.js";
import { rotatePair } from "@/services/token.service.js";
import { toSession } from "@/serializers/user.serializer.js";
import type {
  EmailLoginBody,
  LoginBody,
  RefreshBody,
  SendCodeBody,
  SignupBody,
  VerifyCodeBody,
} from "@/validators/auth.validator.js";

export async function postCode(req: Request, res: Response): Promise<void> {
  const { countryCode, phoneNumber } = req.body as SendCodeBody;
  res.json(await authService.sendCode(countryCode, phoneNumber));
}

export async function postVerify(req: Request, res: Response): Promise<void> {
  const { countryCode, phoneNumber, code, timezone } = req.body as VerifyCodeBody;

  const { user, tokens } = await authService.verifyCode(countryCode, phoneNumber, code, {
    timezone,
    userAgent: req.header("user-agent") ?? undefined,
    ip: req.ip,
  });

  res.json(toSession(user, tokens));
}

export async function postEmailLogin(req: Request, res: Response): Promise<void> {
  const { email, password, timezone } = req.body as EmailLoginBody;

  const { user, tokens } = await authService.emailLogin(email, password, {
    timezone,
    userAgent: req.header("user-agent") ?? undefined,
    ip: req.ip,
  });

  res.json(toSession(user, tokens));
}

export async function postSignup(req: Request, res: Response): Promise<void> {
  const { timezone, ...input } = req.body as SignupBody;

  const { user, tokens } = await authService.signup(input, {
    timezone,
    userAgent: req.header("user-agent") ?? undefined,
    ip: req.ip,
  });

  res.status(201).json(toSession(user, tokens));
}

export async function postLogin(req: Request, res: Response): Promise<void> {
  const { identifier, password, timezone } = req.body as LoginBody;

  const { user, tokens } = await authService.login(identifier, password, {
    timezone,
    userAgent: req.header("user-agent") ?? undefined,
    ip: req.ip,
  });

  res.json(toSession(user, tokens));
}

export async function postRefresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as RefreshBody;
  res.json(await rotatePair(refreshToken));
}

export async function postOnboardingComplete(req: Request, res: Response): Promise<void> {
  const user = req.user;
  if (!user) throw ApiError.unauthorized();

  const updated = await authService.completeOnboarding(user);

  // The session shape is what the client expects back, but onboarding does not
  // mint new tokens — the caller already holds valid ones.
  res.json({
    userId: String(updated._id),
    token: "",
    refreshToken: "",
    expiresIn: 0,
    phone: updated.phone?.display ?? "",
    onboardingComplete: updated.onboardingComplete,
    createdAt: (updated.get("createdAt") as Date).toISOString(),
  });
}

export async function postSignOut(req: Request, res: Response): Promise<void> {
  const { user, sessionId, accessJti, accessExp } = req;
  if (!user || !sessionId || !accessJti || accessExp === undefined) throw ApiError.unauthorized();

  await authService.signOut(String(user._id), sessionId, { jti: accessJti, exp: accessExp });
  res.status(204).end();
}
