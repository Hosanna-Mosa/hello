/**
 * The session, on disk, in the device keychain.
 *
 * `client.ts` held the tokens in a module variable and `auth.service.ts` held
 * the session in another, so BOTH died with the process: every app close signed
 * the user out and made them read a fresh OTP off the server log — while the
 * server was perfectly happy to keep them signed in, since the refresh token is
 * valid for thirty days (PLAN R7, #208).
 *
 * KEYCHAIN, NOT ORDINARY STORAGE. A refresh token is a thirty-day credential:
 * whoever holds it can mint sessions as that person. `AsyncStorage` writes
 * plaintext into the app sandbox; `expo-secure-store` uses the Android Keystore
 * and the iOS keychain. `types.ts` said so about this exact field long before
 * anything stored it.
 *
 * EVERY FUNCTION HERE SWALLOWS ITS ERRORS, deliberately. Keychain access can
 * fail — a device with no lock screen, a restored backup, a user who cleared
 * app data. The correct outcome is "you have to sign in again", which is what
 * an absent session already means. Throwing here would turn a minor annoyance
 * into an app that cannot start.
 */

import * as SecureStore from "expo-secure-store";

import type { Session } from "./types";

/** One key. The session is a unit, and a half-restored one is worse than none. */
const KEY = "hello.session.v1";

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<Session>;
    // A stored blob from an older shape, or a truncated write, must not become
    // a half-session — that is how you get a signed-in user with no token.
    if (!parsed.userId || !parsed.token || !parsed.refreshToken) return null;

    return parsed as Session;
  } catch {
    return null;
  }
}

export async function saveSession(session: Session): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(session));
  } catch {
    // Not fatal: the app works, it just will not remember this next launch.
  }
}

/**
 * Update only the token pair, keeping the rest.
 *
 * Called whenever `client.ts` gets new tokens — which is not only at sign-in.
 * The refresh token ROTATES on every use, and the server destroys the whole
 * session family if an old one is replayed (contract gap 1). So a stored copy
 * that is not updated on refresh is worse than no stored copy at all: the next
 * cold start would present a dead token and log the user out of everything.
 */
export async function saveTokens(token: string, refreshToken: string): Promise<void> {
  try {
    const existing = await loadSession();
    if (!existing) return;
    await saveSession({ ...existing, token, refreshToken });
  } catch {
    // As above.
  }
}

export async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // As above.
  }
}
