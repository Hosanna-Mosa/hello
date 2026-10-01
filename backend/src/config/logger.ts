/**
 * Structured logging, with PII redacted at the logger rather than at call sites.
 *
 * Phone is the only identifier this product has, so it must never reach disk.
 * Redaction lives here because a call site that forgets is the normal failure
 * — and an abuse investigation still needs to trace a request end to end,
 * which is what `requestId` is for.
 */

import { createRequire } from "node:module";

import pino from "pino";

import { env, isProd } from "@/config/env.js";

/** pino-pretty is a devDependency — a production install may not have it. */
function canResolve(name: string): boolean {
  try {
    createRequire(import.meta.url).resolve(name);
    return true;
  } catch {
    return false;
  }
}

// Coloured, human-readable console in development — and in production when
// REQUEST_LOG=true asks for a watchable console. Otherwise raw JSON lines.
const pretty = (!isProd || env.REQUEST_LOG === true) && canResolve("pino-pretty");

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.phone",
      "*.phoneNumber",
      "*.e164",
      "*.code",
      "*.token",
      "*.refreshToken",
      "*.password",
      "*.passwordHash",
      "*.email",
      "*.identifier",
      "phone",
      "token",
      "refreshToken",
    ],
    censor: "[redacted]",
  },
  ...(!pretty ? {} : { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } } }),
});
