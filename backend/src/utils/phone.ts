/**
 * Phone handling.
 *
 * Phone is the ONLY identifier this product has (PLAN §1: no email, no
 * password, no social login), which makes it the most sensitive column in the
 * database. So the value that gets indexed and looked up is an HMAC, not the
 * number: a dump of `users` is then not a list of phone numbers.
 *
 * The plaintext `e164` is still stored, because Settings → Account displays the
 * number and the user must be able to see which one they signed up with. What
 * the pepper buys is that the *index* — the thing an attacker would extract
 * first and could scan quickly — carries nothing.
 *
 * HMAC and not a plain hash: without the secret pepper, a phone number's search
 * space is small enough to brute-force every number in a country in minutes.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/config/env.js";
import { ApiError } from "@/errors/ApiError.js";

export type NormalizedPhone = {
  /** `+919876543210` — the canonical form, and what the HMAC is taken over. */
  e164: string;
  hmac: string;
  /** `91`, without the `+`. */
  countryCode: string;
  /** `9876543210`. */
  national: string;
  /** `+91 98765 43210` — what Settings → Account renders. */
  display: string;
};

const DIGITS = /^\d+$/;

/**
 * Groups the national part for display. Deliberately simple: a full
 * libphonenumber is a 500kb dependency for a cosmetic gain, and the client
 * already treats `display` as an opaque string it does not parse.
 */
function formatDisplay(countryCode: string, national: string): string {
  const groups =
    national.length === 10
      ? [national.slice(0, 5), national.slice(5)]
      : (national.match(/.{1,4}/g) ?? [national]);
  return `+${countryCode} ${groups.join(" ")}`;
}

export function normalizePhone(countryCodeRaw: string, phoneNumberRaw: string): NormalizedPhone {
  const countryCode = countryCodeRaw.replace(/[^\d]/g, "");
  const national = phoneNumberRaw.replace(/[^\d]/g, "");

  if (!countryCode || !DIGITS.test(countryCode) || countryCode.length > 4) {
    throw ApiError.validation("Enter a valid country code.");
  }
  // Matches the client's own rule (`/^\d{6,15}$/`, auth.service.ts) so a number
  // the app accepts is never rejected here for a different reason.
  if (national.length < 6 || national.length > 15) {
    throw ApiError.validation("Enter a valid phone number.");
  }

  const e164 = `+${countryCode}${national}`;

  return {
    e164,
    hmac: phoneHmac(e164),
    countryCode,
    national,
    display: formatDisplay(countryCode, national),
  };
}

export function phoneHmac(e164: string): string {
  return createHmac("sha256", env.PHONE_PEPPER).update(e164).digest("hex");
}

/** Constant-time compare, so a timing difference cannot confirm a guess. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
