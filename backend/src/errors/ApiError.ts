/**
 * The error envelope, and the only way this server reports a failure.
 *
 * `ApiErrorCode` is imported from the app's own types, not redeclared — the
 * client's `client.ts` throws the same union, so a code that does not exist on
 * the client cannot be invented here.
 *
 * The HTTP mapping is `docs/api-contract.md`'s table, reproduced as code so the
 * document and the server cannot drift:
 *
 *   validation    400   message is safe to show the user
 *   unauthorized  401   missing or expired token
 *   notFound      404   unknown id
 *   rateLimited   429   too many requests
 *   quotaExceeded 429   daily like limit spent — drives the out-of-likes screen
 *   server        500   client shows the generic retry state
 *
 * `network` is deliberately absent: the contract says it is client-side only
 * and is never sent by the server. Typing it out of `ServerErrorCode` makes
 * that a compile error rather than a code review note.
 */

import type { ApiErrorCode } from "@/types/wire.js";

export type ServerErrorCode = Exclude<ApiErrorCode, "network">;

const STATUS: Record<ServerErrorCode, number> = {
  validation: 400,
  unauthorized: 401,
  notFound: 404,
  rateLimited: 429,
  quotaExceeded: 429,
  server: 500,
};

/** Safe fallbacks. A thrown error must never leak an internal message. */
const DEFAULT_MESSAGE: Record<ServerErrorCode, string> = {
  validation: "That input isn't valid.",
  unauthorized: "Please sign in again.",
  notFound: "Not found.",
  rateLimited: "Too many requests. Try again shortly.",
  quotaExceeded: "You're out of likes for today.",
  server: "Something went wrong.",
};

export class ApiError extends Error {
  readonly code: ServerErrorCode;
  readonly status: number;
  /** Structured detail for logs only. Never serialized to the client. */
  readonly detail: unknown;

  constructor(code: ServerErrorCode, message?: string, detail?: unknown) {
    super(message ?? DEFAULT_MESSAGE[code]);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS[code];
    this.detail = detail;
  }

  static validation(message?: string, detail?: unknown) {
    return new ApiError("validation", message, detail);
  }
  static unauthorized(message?: string) {
    return new ApiError("unauthorized", message);
  }
  /**
   * Also the correct answer for "exists but you may not see it" — a thread you
   * are not in, or a profile that blocked you. `unauthorized` would confirm the
   * thing exists, which is an existence leak.
   */
  static notFound(message?: string) {
    return new ApiError("notFound", message);
  }
  static rateLimited(message?: string) {
    return new ApiError("rateLimited", message);
  }
  static quotaExceeded(message?: string) {
    return new ApiError("quotaExceeded", message);
  }
  static server(message?: string, detail?: unknown) {
    return new ApiError("server", message, detail);
  }

  /** The exact body shape in the contract: `{ error: { code, message } }`. */
  toBody(): { error: { code: ServerErrorCode; message: string } } {
    return { error: { code: this.code, message: this.message } };
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export { STATUS as ERROR_STATUS };
