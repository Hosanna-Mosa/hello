/**
 * Structured logging, with PII redacted at the logger rather than at call sites.
 *
 * Phone is the only identifier this product has, so it must never reach disk.
 * Redaction lives here because a call site that forgets is the normal failure
 * — and an abuse investigation still needs to trace a request end to end,
 * which is what `requestId` is for.
 */

import pino from "pino";

import { env, isProd } from "@/config/env.js";

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
      "phone",
      "token",
      "refreshToken",
    ],
    censor: "[redacted]",
  },
  ...(isProd ? {} : { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } } }),
});
