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
import { meService } from "@/services/me.service";
import type { User } from "@/services/types";

export type SessionStatus = "loading" | "signedOut" | "onboarding" | "signedIn";

export type SessionState = {
  status: SessionStatus;
  user: User | null;

  /** Resolve the session at launch. */
  hydrate: () => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
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
    await authService.verifyCode(code);
    const user = await meService.getMe();
    // A fresh sign-in always lands in onboarding.
    set({ status: "onboarding", user });
  },

  completeOnboarding: async () => {
    await authService.completeOnboarding();
    set({ status: "signedIn" });
  },

  signOut: async () => {
    await authService.signOut();
    // Data is in-memory only (R7), so signing out is a full reset.
    set({ status: "signedOut", user: null });
  },

  refreshUser: async () => {
    set({ user: await meService.getMe() });
  },
}));
