/**
 * Guards for every `/v1/admin` route.
 *
 * - `adminGuard` runs on ALL of them, the login included: no caching of any
 *   admin response, and a required `X-Admin-Request` header. A custom header
 *   cannot be sent cross-origin without a CORS preflight, and the preflight is
 *   only answered for `ADMIN_ORIGINS` — so together with `SameSite=Strict` on
 *   the cookie, another site cannot drive the panel with the admin's session.
 * - `requireAdmin` reads the HttpOnly session cookie. The token never reaches
 *   script, so an XSS in the panel cannot exfiltrate it.
 */

import type { NextFunction, Request, Response } from "express";

import { isProd } from "@/config/env.js";
import { ApiError } from "@/errors/ApiError.js";
import type { AdminDoc } from "@/models/admin.model.js";
import { adminAuthConfigured, authenticate } from "@/services/adminAuth.service.js";
import { readCookie, serializeCookie } from "@/utils/cookies.js";

declare module "express-serve-static-core" {
  interface Request {
    admin?: AdminDoc;
    adminJti?: string;
  }
}

export const ADMIN_COOKIE = "hello_admin";
const COOKIE_PATH = "/v1/admin";

export function adminGuard(req: Request, res: Response, next: NextFunction): void {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");

  if (!adminAuthConfigured()) {
    next(ApiError.unauthorized("Admin access is not configured on this server."));
    return;
  }
  if (req.header("x-admin-request") !== "1") {
    next(ApiError.unauthorized());
    return;
  }
  next();
}

export async function requireAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = readCookie(req.header("cookie"), ADMIN_COOKIE);
    if (!token) throw ApiError.unauthorized();

    const { admin, jti } = await authenticate(token);
    req.admin = admin;
    req.adminJti = jti;
    next();
  } catch (e) {
    next(e);
  }
}

export function setAdminCookie(res: Response, token: string, maxAgeSec: number): void {
  res.setHeader("Set-Cookie", serializeCookie(ADMIN_COOKIE, token, { maxAgeSec, path: COOKIE_PATH, secure: isProd }));
}

export function clearAdminCookie(res: Response): void {
  res.setHeader("Set-Cookie", serializeCookie(ADMIN_COOKIE, "", { maxAgeSec: 0, path: COOKIE_PATH, secure: isProd }));
}
