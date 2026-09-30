/**
 * One line per request, built to be WATCHED while someone taps a phone.
 *
 * `pino-http` dumps the full request and response objects — around 25 lines per
 * call, most of it security headers. That is fine for shipping to a log
 * aggregator and useless for the question this is actually here to answer:
 * *is that call coming from the client, or from my own curl?*
 *
 * So every line carries the two things that answer it:
 *
 *   CALLER  where it came from — `local` for 127.0.0.1, otherwise the real IP,
 *           so a request from the phone is visibly different from one on the Mac.
 *   AGENT   what made it — `expo` for the app, `curl`, `browser`, `insomnia`.
 *
 * Bodies are NEVER logged. A request body here contains OTP codes and refresh
 * tokens, and a login code written to a log file is the same leak as one in a
 * response.
 */

import type { NextFunction, Request, Response } from "express";

import { logger } from "@/config/logger.js";
import { env, isProd } from "@/config/env.js";

/** Collapses a User-Agent to one recognisable word. */
function agentOf(ua: string | undefined): string {
  if (!ua) return "?";
  const s = ua.toLowerCase();
  if (s.includes("expo") || s.includes("okhttp") || s.includes("cfnetwork")) return "expo";
  if (s.includes("curl")) return "curl";
  if (s.includes("insomnia")) return "insomnia";
  if (s.includes("postman")) return "postman";
  if (s.includes("mozilla") || s.includes("safari") || s.includes("chrome")) return "browser";
  return ua.split("/")[0]?.slice(0, 12) ?? "?";
}

/** `::ffff:192.168.1.8` is an IPv4 address wearing an IPv6 hat. */
function callerOf(req: Request): string {
  const raw = (req.ip ?? "").replace(/^::ffff:/, "");
  if (!raw || raw === "127.0.0.1" || raw === "::1") return "local";
  return raw;
}

function pathOf(req: Request): string {
  const full = (req.originalUrl || req.url).split("?")[0] ?? "/";
  return full.length > 38 ? `${full.slice(0, 37)}…` : full;
}

export function requestLog(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const caller = callerOf(req);

    const line = [
      req.method.padEnd(6),
      // `originalUrl`, NOT `req.path`: inside a mounted router `path` is
      // relative to the mount point, so `/v1/auth/code` logs as `/code` and the
      // line stops telling you which endpoint was hit.
      //
      // Query string dropped — a cursor is signed and long enough to wrap the
      // line, which defeats the point of one-line output.
      pathOf(req).padEnd(38),
      String(res.statusCode).padEnd(4),
      `${ms.toFixed(0).padStart(4)}ms`,
      agentOf(req.header("user-agent")).padEnd(8),
      caller,
      // Present once a request is authenticated — useful for telling two
      // signed-in devices apart.
      req.user ? `u:${String(req.user._id).slice(-6)}` : "",
    ]
      .join(" ")
      .trimEnd();

    // Level by outcome, so a failing call is visibly different when scanning.
    if (res.statusCode >= 500) logger.error(line);
    else if (res.statusCode >= 400) logger.warn(line);
    else logger.info(line);
  });

  next();
}

/**
 * In production the structured form is what a log aggregator can query, so the
 * human-readable line is development only — unless `REQUEST_LOG=true` asks for it.
 */
export const useHumanRequestLog = env.REQUEST_LOG ?? !isProd;
