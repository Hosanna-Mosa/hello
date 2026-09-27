/**
 * SMS delivery. The ONE file that changes when a real provider is chosen.
 *
 * Everything else in the auth flow is real: the account, the tokens, the
 * sessions, the rate limits. Only delivery is faked, and only here — so wiring
 * Twilio or MSG91 later is this file and nothing above it.
 *
 * Three senders, because "fake the SMS" is two separable things:
 *
 *   OTP_DEV_MODE   returns the code in the HTTP RESPONSE, and logs it. Local
 *                  only — echoing a login code to the caller is a complete auth
 *                  bypass, and `env.ts` refuses to boot with it in production.
 *   OTP_LOG_ONLY   logs the code and returns nothing. This is what a deployed
 *                  test server runs: reading a code needs shell access to the
 *                  host. Allowed in production, and the only reason a server
 *                  with no provider can log anyone in at all.
 *   neither        throws. Shipping without wiring a provider must fail loudly.
 *
 * The log line is the only way to get a code out of a release build, where
 * there is no Metro to print it.
 *
 * `env.ts` REFUSES TO BOOT if `OTP_DEV_MODE` is ever true in production,
 * because a login code in a response body is a complete auth bypass. That
 * guard is what makes printing it here safe: the log line cannot exist in a
 * build that would not already be handing the code to any caller.
 *
 * Operator decision, 2026-09-26, explicitly temporary (PLAN #171). To undo it,
 * delete the one `logger.warn` below — nothing else depends on it.
 */

import { env } from "@/config/env.js";
import { logger } from "@/config/logger.js";

export type SmsResult = {
  /** Present only in dev mode. The API echoes it so the client can autofill. */
  devCode?: string;
};

export interface SmsSender {
  sendOtp(e164: string, code: string): Promise<SmsResult>;
}

/**
 * Delivers nothing, and prints the code where a human can read it.
 *
 * `warn` rather than `info` so it survives a raised log level and stands out
 * in a busy request log — this is the line someone is watching the terminal
 * for. The full number is printed too: with two test phones, "which one is
 * this?" is the actual question being asked.
 */
const devSender: SmsSender = {
  async sendOtp(e164, code) {
    logger.warn({ to: e164, code }, `OTP ${code} for ${e164} — dev mode, no SMS sent`);
    return { devCode: code };
  },
};

/**
 * Prints the code and returns nothing.
 *
 * The difference from `devSender` is the return value, and it is the whole
 * point: no `devCode` in the response means the code is only readable by
 * someone who can read the server log. The app never autofilled it anyway —
 * `app/src/services/auth.service.ts` only `console.warn`s it — so nothing on
 * the client changes.
 */
const logOnlySender: SmsSender = {
  async sendOtp(e164, code) {
    logger.warn({ to: e164, code }, `OTP ${code} for ${e164} — log-only mode, no SMS sent`);
    return {};
  },
};

const productionSender: SmsSender = {
  async sendOtp() {
    // Deliberately not a silent no-op: shipping without wiring a provider must
    // fail loudly at the first login rather than look like a delivery problem.
    throw new Error("No SMS provider is configured. Wire one in sms.service.ts before production.");
  },
};

export const smsSender: SmsSender = env.OTP_DEV_MODE
  ? devSender
  : env.OTP_LOG_ONLY
    ? logOnlySender
    : productionSender;
