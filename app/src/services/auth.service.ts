/**
 * Email-or-phone + password sign-in, and sign-up.
 *
 * Two transports behind one surface. In mock mode any well-formed input is
 * accepted (as any 6 digits were for the OTP this replaced). Against the real
 * API: a genuine account and a real JWT pair, kept in the device keychain by
 * `secureSession.ts` — never in plain storage.
 *
 * The password is sent once, over HTTPS, and never stored, logged or cached
 * on the device. Only the tokens the server answers with are kept.
 */

import { ApiError, http, isMockMode, nextId, nowIso, request, setCurrentUserId, setTokens } from "./client";
import type { Session } from "./types";
import { loadSession, saveSession } from "./secureSession";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Digits only, 6–15 — the server's own rule (`utils/phone.ts`). */
const PHONE = /^\d{6,15}$/;

/**
 * The dial code a bare number is read in. Matches the sign-up form's default
 * country, since that is where nearly every account's number came from.
 */
export const DEFAULT_DIAL = "+91";

let session: Session | null = null;

export type SignupInput = {
  name: string;
  email: string;
  /** `+91`, from the country picker. */
  countryCode: string;
  phoneNumber: string;
  password: string;
};

/** The same rule the server enforces, so the form can say so before a round trip. */
export function isStrongPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 128 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

/**
 * What the sign-in field holds, in the form the server looks up.
 *
 * An email is sent as typed (the server lower-cases it). A phone number is
 * sent in E.164: `+44 7700 900123` keeps its own code, and a bare `98765 43210`
 * or `098765 43210` is read in `DEFAULT_DIAL`. Null when it is neither.
 */
export function toIdentifier(raw: string): string | null {
  const value = raw.trim();
  if (value.includes("@")) return isEmail(value) ? value : null;

  const digits = value.replace(/\D/g, "");
  if (value.startsWith("+")) return digits.length >= 7 && digits.length <= 19 ? `+${digits}` : null;

  const national = digits.replace(/^0+/, "");
  return PHONE.test(national) ? `${DEFAULT_DIAL}${national}` : null;
}

function timezone(): string {
  // The server needs this to compute the user's local midnight for the daily
  // like quota. A fixed offset would be wrong twice a year.
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Every later request reads the token from here, and a cold start from the keychain. */
function open(next: Session): Session {
  setTokens({ token: next.token, refreshToken: next.refreshToken });
  setCurrentUserId(next.userId);
  session = next;
  void saveSession(next);
  return { ...next };
}

function mockSession(phone: string): Session {
  session = {
    userId: "me",
    token: nextId("token"),
    refreshToken: nextId("refresh"),
    // Mirrors the real 15-minute access token, so the client can build the
    // refresh-before-expiry path against the mock (contract, "Tokens").
    expiresIn: 900,
    phone,
    onboardingComplete: false,
    createdAt: nowIso(),
  };
  return { ...session };
}

export const authService = {
  async login(rawIdentifier: string, password: string): Promise<Session> {
    const identifier = toIdentifier(rawIdentifier);
    if (!identifier || !password) {
      throw new ApiError("validation", "Enter your email or phone number and password");
    }

    if (!isMockMode()) {
      return open(await http<Session>("POST", "/auth/login", { identifier, password, timezone: timezone() }, false));
    }

    // Mock mode accepts any well-formed pair. A fresh mock login is a new
    // account, so the demo still walks the onboarding wizard.
    return request(() => mockSession(identifier.startsWith("+") ? identifier : ""));
  },

  async signup(input: SignupInput): Promise<Session> {
    const name = input.name.trim();
    const email = input.email.trim();
    const countryCode = input.countryCode.replace(/\D/g, "");
    const phoneNumber = input.phoneNumber.replace(/\D/g, "");

    if (!name) throw new ApiError("validation", "Enter your name.");
    if (!isEmail(email)) throw new ApiError("validation", "Enter a valid email address.");
    if (!countryCode || !PHONE.test(phoneNumber)) throw new ApiError("validation", "Enter a valid phone number.");
    if (!isStrongPassword(input.password)) {
      throw new ApiError("validation", "Use at least 8 characters, with a letter and a number.");
    }

    if (!isMockMode()) {
      return open(
        await http<Session>(
          "POST",
          "/auth/signup",
          { name, email, countryCode, phoneNumber, password: input.password, timezone: timezone() },
          false,
        ),
      );
    }

    return request(() => mockSession(`+${countryCode} ${phoneNumber}`));
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
    setTokens(null);
    setCurrentUserId(null);
  },
};
