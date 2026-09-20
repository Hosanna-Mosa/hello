/**
 * App-level UI state and the demo controls.
 *
 * The three dev switches exist so a live demo can show the failure states, the
 * premium tier and an incoming call without anyone editing code or rebuilding.
 * They are the difference between "the error state exists" and "here is the
 * error state" in front of a client.
 */

import { create } from "zustand";

import { configureClient } from "@/services/client";
import type { ApiErrorCode } from "@/services/types";
import type { ThemeName } from "@/theme";

export type UiState = {
  /**
   * Which theme is active.
   *
   * Defaults to `"dark"` — this product is dark by default, and the setting is
   * explicit rather than `null` so the app does not change appearance under the
   * user when their phone flips to light at sunrise.
   *
   * Still nullable: passing `null` hands control back to the system setting.
   * Nothing reaches that state through the UI today, because Settings offers a
   * two-way switch rather than a three-way one — see the Appearance row.
   */
  themeOverride: ThemeName | null;
  /** Dev-only: makes every service call fail with this code. */
  failureMode: ApiErrorCode | null;
  /** Dev-only: fires the incoming-call screen on demand (A17). */
  pendingIncomingCallThreadId: string | null;

  setThemeOverride: (theme: ThemeName | null) => void;
  setFailureMode: (code: ApiErrorCode | null) => void;
  triggerIncomingCall: (threadId: string) => void;
  clearIncomingCall: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  themeOverride: "dark",
  failureMode: null,
  pendingIncomingCallThreadId: null,

  setThemeOverride: (themeOverride) => set({ themeOverride }),

  setFailureMode: (failureMode) => {
    // Push it into the transport so every service call honours it.
    configureClient({ failureMode });
    set({ failureMode });
  },

  triggerIncomingCall: (threadId) => set({ pendingIncomingCallThreadId: threadId }),

  clearIncomingCall: () => set({ pendingIncomingCallThreadId: null }),
}));
