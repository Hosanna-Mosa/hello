/**
 * Phone + OTP, mocked.
 *
 * Any number, any 6 digits (PLAN §1). There is no password, no email and no
 * social sign-in anywhere in this product, so this is the entire auth surface.
 */

import { ApiError, nextId, nowIso, request } from "./client";
import type { Session } from "./types";

/** Digits only, 6–15 — loose enough for any country, strict enough to catch typos. */
const PHONE = /^\d{6,15}$/;
const CODE = /^\d{6}$/;

let session: Session | null = null;
/**
 * Held between `sendCode` and `verifyCode`.
 *
 * The two calls are separate screens, and the number is typed on the first but
 * only becomes part of a session on the second.
 */
let pendingPhone: string | null = null;

export type SendCodeResult = {
  /** Seconds before "Resend code" becomes tappable. */
  resendAfterSec: number;
};

export const authService = {
  async sendCode(countryCode: string, phoneNumber: string): Promise<SendCodeResult> {
    return request(() => {
      if (!PHONE.test(phoneNumber.replace(/\s/g, ""))) {
        throw new ApiError("validation", "Enter a valid phone number");
      }
      pendingPhone = `${countryCode} ${phoneNumber}`.trim();
      return { resendAfterSec: 30 };
    });
  },

  async verifyCode(code: string): Promise<Session> {
    return request(() => {
      if (!CODE.test(code)) {
        throw new ApiError("validation", "Enter the 6-digit code");
      }

      // Any 6 digits are accepted — this is mocked auth, not weak auth.
      session = {
        userId: "me",
        token: nextId("token"),
        phone: pendingPhone ?? "",
        onboardingComplete: false,
        createdAt: nowIso(),
      };
      return { ...session };
    });
  },

  async getSession(): Promise<Session | null> {
    return request(() => (session ? { ...session } : null));
  },

  async completeOnboarding(): Promise<Session> {
    return request(() => {
      if (!session) throw new ApiError("unauthorized");
      session = { ...session, onboardingComplete: true };
      return { ...session };
    });
  },

  async signOut(): Promise<void> {
    return request(() => {
      session = null;
    });
  },

  /** Test seam — resets module state between cases. */
  __reset(): void {
    session = null;
    pendingPhone = null;
  },
};
