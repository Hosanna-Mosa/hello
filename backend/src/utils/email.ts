/**
 * Email handling, on the same terms as `utils/phone.ts`: the value that is
 * indexed and looked up is an HMAC under the server's pepper, so a dump of the
 * `users` index is not a mailing list.
 *
 * The domain prefix keeps an email's HMAC from ever colliding with a phone's,
 * since both are taken under the same pepper.
 */

import { createHmac } from "node:crypto";

import { env } from "@/config/env.js";
import { ApiError } from "@/errors/ApiError.js";

/** Deliberately loose — the address is never mailed, only matched. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NormalizedEmail = { address: string; hmac: string };

export function normalizeEmail(raw: string): NormalizedEmail {
  const address = raw.trim().toLowerCase();
  if (address.length > 254 || !EMAIL.test(address)) throw ApiError.validation("Enter a valid email address.");
  return { address, hmac: emailHmac(address) };
}

export function emailHmac(address: string): string {
  return createHmac("sha256", env.PHONE_PEPPER).update(`email:${address.trim().toLowerCase()}`).digest("hex");
}
