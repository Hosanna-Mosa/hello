/**
 * The auth flow.
 *
 * Sign-up and sign-in are the SAME endpoint. There is no separate registration:
 * the first verified code for a number creates the account, every later one
 * opens a session on it. The client has no concept of "register" either, so
 * adding one here would be inventing a state the UI cannot reach.
 *
 * A pending-deletion account that signs in is RESTORED. That is the 30-day
 * grace period working as designed — the user changed their mind, which is the
 * entire reason for a grace period rather than an immediate erase.
 */

import { createHash } from "node:crypto";

import { logger } from "@/config/logger.js";
import { ApiError } from "@/errors/ApiError.js";
import { UserModel, type UserDoc } from "@/models/user.model.js";
import { issueOtp, verifyOtp } from "@/services/otp.service.js";
import { smsSender } from "@/services/sms.service.js";
import { issuePair, revokeSession, denylistAccess, type TokenPair } from "@/services/token.service.js";
import { normalizePhone } from "@/utils/phone.js";

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

    if (user.status === "pendingDeletion") {
      // A full restore: status is the only thing deletion changed, which is
      // exactly why deletion must not touch anything else (see
      // me.service.requestDeletion).
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
