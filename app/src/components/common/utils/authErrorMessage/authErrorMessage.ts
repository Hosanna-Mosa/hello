/**
 * What to tell someone whose sign-in or sign-up failed.
 *
 * Only a `validation` answer is about what they typed — and then the server's
 * own message is the useful one ("An account with this email already
 * exists."). Everything else — no connection, the rate limit, a server without
 * the route — has to say so, or a person with the right password is told it is
 * wrong and gives up (PLAN #228).
 *
 * Reads `code` structurally rather than importing `ApiError`: this barrel must
 * not pull the HTTP client (and the keychain behind it) into every screen.
 */

import { copy } from "@/copy";

export function authErrorMessage(error: unknown, fallbackValidation: string): string {
  const { code, message } = (error ?? {}) as { code?: unknown; message?: unknown };

  switch (code) {
    case "validation":
      // A bare code as the message means the server sent none worth showing.
      return typeof message === "string" && message && message !== "validation" ? message : fallbackValidation;
    case "network":
      return copy.auth.authNetwork;
    case "rateLimited":
      return copy.auth.authRateLimited;
    // 404: a server that predates these routes.
    case "notFound":
      return copy.auth.authUnavailable;
    default:
      return copy.auth.authFailed;
  }
}
