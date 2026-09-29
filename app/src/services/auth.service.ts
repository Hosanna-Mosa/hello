/**
 * Phone + OTP.
 *
 * Two transports behind one surface. In mock mode: any number, any 6 digits
 * (PLAN §1). Against the real API: a genuine account, a real JWT pair and a
 * code the server returns in the response body because SMS delivery is still
 * faked server-side.
 *
 * Plus one email + password sign-in that exists only for store reviewers: the
 * server maps a single configured email to an existing phone account. The
 * credentials live on the server, never here.
 */

import { ApiError, http, isMockMode, nextId, nowIso, request, setCurrentUserId, setTokens } from "./client";
import type { Session } from "./types";
import { loadSession, saveSession } from "./secureSession";

/** Digits only, 6–15 — loose enough for any country, strict enough to catch typos. */
const PHONE = /^\d{6,15}$/;
const CODE = /^\d{6}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let session: Session | null = null;
/**
 * Held between `sendCode` and `verifyCode`.
 *
 * The two calls are separate screens, and the number is typed on the first but
 * only becomes part of a session on the second.
 */
let pendingPhone: string | null = null;
/**
 * The real `POST /auth/verify` takes the number again, but the OTP screen only
 * has the code — the number was typed on the previous screen. Held here for the
 * same reason `pendingPhone` is.
 */
let pendingCountryCode: string | null = null;
let pendingNumber: string | null = null;

export type SendCodeResult = {
  /** Seconds before "Resend code" becomes tappable. */
  resendAfterSec: number;
};

export const authService = {
  async sendCode(countryCode: string, phoneNumber: string): Promise<SendCodeResult> {
    const digits = phoneNumber.replace(/\s/g, "");

    if (!isMockMode()) {
      pendingCountryCode = countryCode.replace(/\D/g, "");
      pendingNumber = digits;
      pendingPhone = `${countryCode} ${phoneNumber}`.trim();

      // `devCode` comes back while the server fakes SMS. It is logged rather
      // than surfaced: the OTP screen has no field for it, and a code printed
      // on screen would be the same leak in the UI that it is in a response.
      const res = await http<SendCodeResult & { devCode?: string }>(
        "POST",
        "/auth/code",
        { countryCode: pendingCountryCode, phoneNumber: digits },
        false,
      );
      if (res.devCode) console.warn(`[dev] OTP for ${pendingPhone}: ${res.devCode}`);
      return { resendAfterSec: res.resendAfterSec };
    }

    return request(() => {
      if (!PHONE.test(phoneNumber.replace(/\s/g, ""))) {
        throw new ApiError("validation", "Enter a valid phone number");
      }
      pendingPhone = `${countryCode} ${phoneNumber}`.trim();
      return { resendAfterSec: 30 };
    });
  },

  async verifyCode(code: string): Promise<Session> {
    if (!isMockMode()) {
      if (!CODE.test(code)) throw new ApiError("validation", "Enter the 6-digit code");
      if (!pendingCountryCode || !pendingNumber) {
        throw new ApiError("validation", "Enter your number again.");
      }

      const next = await http<Session>(
        "POST",
        "/auth/verify",
        {
          countryCode: pendingCountryCode,
          phoneNumber: pendingNumber,
          code,
          // The server needs this to compute the user's local midnight for the
          // daily like quota. A fixed offset would be wrong twice a year.
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        false,
      );

      // Every later request reads the token from here.
      setTokens({ token: next.token, refreshToken: next.refreshToken });
      setCurrentUserId(next.userId);
      session = next;
      // The whole session, so a cold start can restore the user id and the
      // onboarding state too — not just the tokens.
      void saveSession(next);
      return { ...next };
    }

    return request(() => {
      if (!CODE.test(code)) {
        throw new ApiError("validation", "Enter the 6-digit code");
      }

      // Any 6 digits are accepted — this is mocked auth, not weak auth.
      session = {
        userId: "me",
        token: nextId("token"),
        refreshToken: nextId("refresh"),
        // Mirrors the real 15-minute access token, so the client can build the
        // refresh-before-expiry path against the mock (contract, "Tokens").
        expiresIn: 900,
        phone: pendingPhone ?? "",
        onboardingComplete: false,
        createdAt: nowIso(),
      };
      return { ...session };
    });
  },

  /**
   * The store-review sign-in. On success the session is the phone account the
   * server has this email mapped to — identical to that number's OTP sign-in.
   */
  async emailLogin(email: string, password: string): Promise<Session> {
    const trimmed = email.trim();
    if (!EMAIL.test(trimmed) || !password) {
      throw new ApiError("validation", "Enter your email and password");
    }

    if (!isMockMode()) {
      const next = await http<Session>(
        "POST",
        "/auth/email",
        {
          email: trimmed,
          password,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        false,
      );

      setTokens({ token: next.token, refreshToken: next.refreshToken });
      setCurrentUserId(next.userId);
      session = next;
      void saveSession(next);
      return { ...next };
    }

    // Mock mode accepts any well-formed pair, as it accepts any 6 digits.
    return request(() => {
      session = {
        userId: "me",
        token: nextId("token"),
        refreshToken: nextId("refresh"),
        expiresIn: 900,
        phone: "",
        onboardingComplete: false,
        createdAt: nowIso(),
      };
      return { ...session };
    });
  },

  /**
   * The current session, restoring from the keychain on a cold start.
   *
   * This is the ONE place a persisted session comes back, because it is what
   * `session.store.hydrate()` calls first on every launch. Restoring here also
   * means the tokens are in place before anything else asks for them.
   *
   * The restored token is NOT trusted blindly: `hydrate` calls `getMe()` next,
   * and a dead token 401s there, which drives the client's refresh-once-then-
   * sign-out path exactly as it would mid-session.
   */
  async getSession(): Promise<Session | null> {
    if (!isMockMode() && !session) {
      const stored = await loadSession();
      if (stored) {
        session = stored;
        setTokens({ token: stored.token, refreshToken: stored.refreshToken });
        setCurrentUserId(stored.userId);
      }
    }

    // Mock mode never persists: the offline demo and all 512 tests depend on a
    // fresh process starting signed out.
    return request(() => (session ? { ...session } : null));
  },

  async completeOnboarding(): Promise<Session> {
    if (!isMockMode()) {
      if (!session) throw new ApiError("unauthorized");
      const done = await http<Session>("POST", "/auth/onboarding/complete");
      // The endpoint mints no new tokens — the caller already holds valid ones.
      session = { ...session, onboardingComplete: done.onboardingComplete };
      // Restoring a session that still said `onboardingComplete: false` would
      // drop a finished user back into onboarding on the next launch.
      void saveSession(session);
      return { ...session };
    }

    return request(() => {
      if (!session) throw new ApiError("unauthorized");
      session = { ...session, onboardingComplete: true };
      return { ...session };
    });
  },

  async signOut(): Promise<void> {
    if (!isMockMode()) {
      try {
        // Revokes the refresh token AND denylists the access token, so signing
        // out takes effect at once rather than in up to 15 minutes.
        await http<void>("POST", "/auth/signout");
      } catch {
        // A failed sign-out must still sign the user out locally. Leaving them
        // apparently signed in because the network blipped is the worse bug.
      }
      setTokens(null);
      setCurrentUserId(null);
      session = null;
      return;
    }

    return request(() => {
      session = null;
    });
  },

  /** Test seam — resets module state between cases. */
  __reset(): void {
    session = null;
    pendingPhone = null;
    pendingCountryCode = null;
    pendingNumber = null;
    setTokens(null);
    setCurrentUserId(null);
  },
};
