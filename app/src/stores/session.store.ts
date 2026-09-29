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

import { authService } from "@/services/auth.service";
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
  verifyCode: (code: string) => Promise<void>;
  emailLogin: (email: string, password: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  signOut: () => Promise<void>;
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
    set({ status: session.onboardingComplete ? "signedIn" : "onboarding", user });
  },

  verifyCode: async (code) => {
    const session = await authService.verifyCode(code);
    // A token exists now, so the live connection can open. No-op in mock mode.
    connectSocket();
    const user = await meService.getMe();

    /*
     * Onboarding is for people who have not done it — NOT for everyone who
     * signs in.
     *
     * This used to set "onboarding" unconditionally, which was true of the
     * mock (where every verify mints a brand new account) and wrong of the
     * real API, where signing in on a second device, after a reinstall, or
     * simply after the in-memory token expired walked the same person through
     * name, birthday, gender, avatar, interests, bio and location again — and
     * `PATCH /me` happily overwrote what they had already answered.
     *
     * The server has always said which it is; the client just threw the answer
     * away. In mock mode `onboardingComplete` is false on a fresh verify, so
     * the demo still walks the wizard.
     */
    set({ status: session.onboardingComplete ? "signedIn" : "onboarding", user });
  },

  emailLogin: async (email, password) => {
    const session = await authService.emailLogin(email, password);
    connectSocket();
    const user = await meService.getMe();
    // Same rule as verifyCode: a finished account goes straight to the tabs.
    set({ status: session.onboardingComplete ? "signedIn" : "onboarding", user });
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
