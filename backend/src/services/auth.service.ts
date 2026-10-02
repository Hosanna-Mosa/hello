/**
 * The auth flow.
 *
 * The app signs up with name + email + phone + password (`signup`) and signs
 * in with email-or-phone + password (`login`). Phone + OTP (`sendCode` /
 * `verifyCode`) is the older flow: its routes are only mounted when
 * `OTP_LOGIN_ENABLED` is set, because a verified code still creates an
 * account, and that would be a second, password-less way in.
 *
 * A pending-deletion account that signs in is RESTORED. That is the 30-day
 * grace period working as designed — the user changed their mind, which is the
 * entire reason for a grace period rather than an immediate erase.
 */

import { createHash, timingSafeEqual } from "node:crypto";

import { env } from "@/config/env.js";
import { logger } from "@/config/logger.js";
import { ApiError } from "@/errors/ApiError.js";
import { UserModel, type UserDoc } from "@/models/user.model.js";
import { issueOtp, verifyOtp } from "@/services/otp.service.js";
import { smsSender } from "@/services/sms.service.js";
import { issuePair, revokeSession, denylistAccess, type TokenPair } from "@/services/token.service.js";
import { emailHmac, normalizeEmail } from "@/utils/email.js";
import { decoyHash, hashPassword, verifyPassword } from "@/utils/password.js";
import { normalizePhone, phoneHmac } from "@/utils/phone.js";

export type SendCodeResult = { resendAfterSec: number; devCode?: string };

export async function sendCode(countryCode: string, phoneNumber: string): Promise<SendCodeResult> {
  const phone = normalizePhone(countryCode, phoneNumber);
  const { code, resendAfterSec } = await issueOtp(phone.hmac);
  const { devCode } = await smsSender.sendOtp(phone.e164, code);

  return devCode === undefined ? { resendAfterSec } : { resendAfterSec, devCode };
}

export type VerifyResult = { user: UserDoc; tokens: TokenPair };

export async function verifyCode(
  countryCode: string,
  phoneNumber: string,
  code: string,
  meta: { timezone?: string | undefined; userAgent?: string | undefined; ip?: string | undefined },
): Promise<VerifyResult> {
  const phone = normalizePhone(countryCode, phoneNumber);

  await verifyOtp(phone.hmac, code);

  let user = await UserModel.findOne({ "phone.hmac": phone.hmac });

  if (!user) {
    user = await UserModel.create({
      phone: {
        e164: phone.e164,
        hmac: phone.hmac,
        countryCode: phone.countryCode,
        national: phone.national,
        display: phone.display,
      },
      ...(meta.timezone ? { timezone: meta.timezone } : {}),
    });
    logger.info({ userId: String(user._id) }, "account created");
  } else {
    if (user.status === "erased") {
      // The number was reused after a completed erasure. Treat it as a new
      // account rather than resurrecting a record that was deliberately wiped.
      throw ApiError.validation("This number can't be used. Please contact support.");
    }

    if (user.status === "suspended") throw ApiError.unauthorized("This account has been suspended. Please contact support.");

    if (user.status === "pendingDeletion") {
      // A full restore: status is the only thing deletion changed, which is
      // exactly why deletion must not touch anything else (see
      // me.service.deleteAccount — accounts left pending by the older soft delete).
      user.status = "active";
      user.deletionRequestedAt = null;
      user.purgeAt = null;
      user.deletionReason = null;
      logger.info({ userId: String(user._id) }, "account restored within grace period");
    }

    if (meta.timezone) user.timezone = meta.timezone;
    user.lastActiveAt = new Date();
    await user.save();
  }

  const tokens = await issuePair(String(user._id), {
    userAgent: meta.userAgent,
    ipHash: meta.ip ? createHash("sha256").update(meta.ip).digest("hex") : undefined,
  });

  return { user, tokens };
}

/**
 * Hashed first so both sides are the same length — `timingSafeEqual` throws
 * otherwise, and an early length check would leak the secret's length.
 */
function secretMatches(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * The store-review sign-in (see `REVIEW_LOGIN_*` in `config/env.ts`).
 *
 * Opens a session on the configured phone account exactly as a verified OTP
 * would. It never creates an account and never restores a deleted one: if the
 * target is missing or not active, the reviewer gets the same "not right"
 * answer as a wrong password, and the log says why.
 */
export async function emailLogin(
  email: string,
  password: string,
  meta: { timezone?: string | undefined; userAgent?: string | undefined; ip?: string | undefined },
): Promise<VerifyResult> {
  const wrong = () => ApiError.validation("That email or password isn't right.");
  const { REVIEW_LOGIN_EMAIL, REVIEW_LOGIN_PASSWORD, REVIEW_LOGIN_PHONE } = env;

  if (!REVIEW_LOGIN_EMAIL || !REVIEW_LOGIN_PASSWORD || !REVIEW_LOGIN_PHONE) throw wrong();

  // Both compared every time, so a correct email is not faster to reject.
  const emailOk = secretMatches(email.trim().toLowerCase(), REVIEW_LOGIN_EMAIL.trim().toLowerCase());
  // Trimmed: the credential is pasted from the Play Console's review notes,
  // and a trailing space or newline from that copy must not reject it.
  const passwordOk = secretMatches(password.trim(), REVIEW_LOGIN_PASSWORD.trim());
  if (!emailOk || !passwordOk) throw wrong();

  const user = await UserModel.findOne({ "phone.hmac": phoneHmac(REVIEW_LOGIN_PHONE) });
  if (!user || user.status !== "active") {
    logger.warn({ found: Boolean(user), status: user?.status }, "review login target account unavailable");
    throw wrong();
  }

  if (meta.timezone) user.timezone = meta.timezone;
  user.lastActiveAt = new Date();
  await user.save();
  logger.info({ userId: String(user._id) }, "review login");

  const tokens = await issuePair(String(user._id), {
    userAgent: meta.userAgent,
    ipHash: meta.ip ? createHash("sha256").update(meta.ip).digest("hex") : undefined,
  });

  return { user, tokens };
}

type Meta = { timezone?: string | undefined; userAgent?: string | undefined; ip?: string | undefined };

function issueFor(user: UserDoc, meta: Meta): Promise<TokenPair> {
  return issuePair(String(user._id), {
    userAgent: meta.userAgent,
    ipHash: meta.ip ? createHash("sha256").update(meta.ip).digest("hex") : undefined,
  });
}

/** Mongo's duplicate-key error — the unique index losing a race with a parallel sign-up. */
function isDuplicateKey(e: unknown): boolean {
  return (e as { code?: number })?.code === 11000;
}

/**
 * Email + phone + password registration.
 *
 * Says plainly when the email or number is taken. That does confirm the
 * account exists, which is the trade every sign-up form makes; the per-IP
 * rate limit is what stops it being used to sweep a list.
 *
 * The account starts NOT onboarded: birthday (the 18+ gate), avatar and
 * interests still come from the wizard. Only the name is taken here.
 */
export async function signup(
  input: { name: string; email: string; countryCode: string; phoneNumber: string; password: string },
  meta: Meta,
): Promise<VerifyResult> {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.countryCode, input.phoneNumber);

  // The store-review address opens a different account (see `emailLogin`), so
  // a sign-up holding it would make that sign-in ambiguous.
  if (env.REVIEW_LOGIN_EMAIL && email.address === env.REVIEW_LOGIN_EMAIL.trim().toLowerCase()) {
    throw ApiError.validation("An account with this email already exists.");
  }

  const [emailTaken, phoneTaken] = await Promise.all([
    UserModel.exists({ "email.hmac": email.hmac }),
    UserModel.exists({ "phone.hmac": phone.hmac }),
  ]);
  if (emailTaken) throw ApiError.validation("An account with this email already exists.");
  if (phoneTaken) throw ApiError.validation("An account with this phone number already exists.");

  let user: UserDoc;
  try {
    user = await UserModel.create({
      name: input.name.trim(),
      email,
      passwordHash: await hashPassword(input.password),
      phone: {
        e164: phone.e164,
        hmac: phone.hmac,
        countryCode: phone.countryCode,
        national: phone.national,
        display: phone.display,
      },
      ...(meta.timezone ? { timezone: meta.timezone } : {}),
    });
  } catch (e) {
    if (isDuplicateKey(e)) throw ApiError.validation("An account with this email or phone number already exists.");
    throw e;
  }
  logger.info({ userId: String(user._id) }, "account created (password)");

  return { user, tokens: await issueFor(user, meta) };
}

const E164 = /^\+\d{7,19}$/;

/**
 * Email-or-phone + password sign-in.
 *
 * Every failure is the SAME answer in roughly the same time — unknown account,
 * OTP-era account with no password, wrong password, erased account — so the
 * endpoint cannot be used to learn which emails or numbers are registered. The
 * unknown-account path verifies against a decoy hash for exactly that reason.
 */
export async function login(identifier: string, password: string, meta: Meta): Promise<VerifyResult> {
  const wrong = () => ApiError.validation("That email, phone number or password isn't right.");
  const raw = identifier.trim();
  const isEmail = raw.includes("@");

  let filter: Record<string, string>;
  if (isEmail) {
    filter = { "email.hmac": emailHmac(raw) };
  } else {
    const e164 = `+${raw.replace(/[^\d]/g, "")}`;
    if (!raw.startsWith("+") || !E164.test(e164)) throw wrong();
    filter = { "phone.hmac": phoneHmac(e164) };
  }

  const user = await UserModel.findOne(filter).select("+passwordHash");

  // The store-review credential is not a stored account; hand it over to the
  // sign-in that owns it, so the reviewer's existing details keep working.
  if (
    !user &&
    isEmail &&
    env.REVIEW_LOGIN_EMAIL &&
    raw.toLowerCase() === env.REVIEW_LOGIN_EMAIL.trim().toLowerCase()
  ) {
    return emailLogin(raw, password, meta);
  }

  const ok = await verifyPassword(password, user?.passwordHash ?? (await decoyHash()));
  if (!user || !user.passwordHash || !ok || user.status === "erased") throw wrong();
  // After the password check, so a guesser learns nothing from it.
  if (user.status === "suspended") throw ApiError.unauthorized("This account has been suspended. Please contact support.");

  if (user.status === "pendingDeletion") {
    // Same grace-period restore as an OTP sign-in.
    user.status = "active";
    user.deletionRequestedAt = null;
    user.purgeAt = null;
    user.deletionReason = null;
    logger.info({ userId: String(user._id) }, "account restored within grace period");
  }

  if (meta.timezone) user.timezone = meta.timezone;
  user.lastActiveAt = new Date();
  await user.save();

  return { user, tokens: await issueFor(user, meta) };
}

export async function completeOnboarding(user: UserDoc): Promise<UserDoc> {
  // The gate is the data, not a button. A profile missing a birthday or a name
  // is not finished, whatever the client believes.
  if (!user.birthday || !user.name?.trim()) {
    throw ApiError.validation("Add your name and birthday before finishing.");
  }

  user.onboardingComplete = true;
  await user.save();
  return user;
}

export async function signOut(
  userId: string,
  sessionId: string,
  access: { jti: string; exp: number },
): Promise<void> {
  await revokeSession(userId, sessionId, "signout");
  // Without this the access token keeps working for up to 15 more minutes,
  // which is not what "sign out" appears to promise.
  await denylistAccess(access.jti, access.exp);
}
