/**
 * Who is signed in, and how far through onboarding.
 *
 * Moved here from `hooks/useSession.ts` as Phase 2 flagged; the hook's shape is
 * unchanged, it now just reads this.
 *
 * Four states rather than a boolean: "signed in" and "finished onboarding" are
 * different gates, and collapsing them sends a half-onboarded user to the tabs.
 * Phase 4's `Stack.Protected` guards read exactly these.
 */

import { create } from "zustand";

import { authService, type SignupInput } from "@/services/auth.service";
import { onAuthLostHandler } from "@/services/client";
import { connectSocket, disconnectSocket } from "@/services/socket";
import { meService } from "@/services/me.service";
import { useActiveCallStore } from "@/stores/activeCall.store";
import type { User } from "@/services/types";

export type SessionStatus = "loading" | "signedOut" | "onboarding" | "signedIn";

export type SessionState = {
  status: SessionStatus;
  user: User | null;

  /** Resolve the session at launch. */
  hydrate: () => Promise<void>;
  /** `identifier` is an email or a phone number, as typed. */
  login: (identifier: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Deletes the account for good. Throws (and stays signed in) if the server refuses. */
  deleteAccount: (reason?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set) => ({
  status: "loading",
  user: null,

  hydrate: async () => {
    const session = await authService.getSession();
    if (!session) {
      set({ status: "signedOut", user: null });
      return;
    }
    const user = await meService.getMe();
    /*
     * A RESTORED session needs its live connection too — after `getMe()`, so
     * the token has been validated (and refreshed if it had expired) first.
     *
     * Only sign-in used to open the socket, so every cold start with a saved
     * session looked signed in but was deaf: no live messages, no ringing for
     * an incoming call, no live support replies, until the person signed out
     * and back in (PLAN #237). No-op in mock mode.
     */
    connectSocket();
    set({ status: session.onboardingComplete ? "signedIn" : "onboarding", user });
  },

  login: async (identifier, password) => {
    const session = await authService.login(identifier, password);
    // A token exists now, so the live connection can open. No-op in mock mode.
    connectSocket();
    const user = await meService.getMe();

    /*
     * Onboarding is for people who have not done it — NOT for everyone who
     * signs in. Signing in on a second device or after a reinstall must not
     * walk the same person through the wizard again, overwriting answers they
     * already gave (PLAN #141). The server says which it is.
     */
    set({ status: session.onboardingComplete ? "signedIn" : "onboarding", user });
  },

  signup: async (input) => {
    await authService.signup(input);
    connectSocket();
    const user = await meService.getMe();
    // A new account always starts the wizard: birthday (the 18+ gate),
    // avatar, interests and the rest are asked there.
    set({ status: "onboarding", user });
  },

  completeOnboarding: async () => {
    await authService.completeOnboarding();
    set({ status: "signedIn" });
  },

  signOut: async () => {
    // A call outlives screens now, so it must not outlive the account.
    useActiveCallStore.getState().hangUp();
    disconnectSocket();
    await authService.signOut();
    // Data is in-memory only (R7), so signing out is a full reset.
    set({ status: "signedOut", user: null });
  },

  deleteAccount: async (reason) => {
    // Server first: if it fails, nothing local has been torn down yet.
    await authService.deleteAccount(reason);
    useActiveCallStore.getState().hangUp();
    disconnectSocket();
    set({ status: "signedOut", user: null });
  },

  refreshUser: async () => {
    set({ user: await meService.getMe() });
  },
}));

/**
 * When a refresh token is rejected the session is genuinely gone, and every
 * later request would 401 in turn. Dropping straight to `signedOut` lets the
 * root layout's `Stack.Protected` guard swap the whole group — the alternative
 * is a signed-in shell where every screen shows an error.
 *
 * Registered once at module load rather than in a component, so it is in place
 * before the first request can fail.
 */
onAuthLostHandler(() => {
  // The refresh token was rejected, so the socket's token is dead too.
  disconnectSocket();
  useSessionStore.setState({ status: "signedOut", user: null });
});
