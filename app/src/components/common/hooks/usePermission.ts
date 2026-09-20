/**
 * The ask → refusal → never-ask-again dance, written once.
 *
 * Both platforms stop showing the OS dialog after a refusal, and iOS allows
 * exactly one ask ever. So "denied" and "blocked" are different states needing
 * different UI: denied can be asked again, blocked can only be sent to
 * Settings. Screens that collapse them show a button that silently does
 * nothing — the single most common permission bug.
 *
 * Generic over the permission API so location (Phase 4) and notifications
 * (Phase 8, primed after the first match per A4) share one implementation.
 */

import { useState } from "react";
import { Linking } from "react-native";

export type PermissionState =
  /** Never asked. The primer screen goes here. */
  | "undetermined"
  /** Granted. */
  | "granted"
  /** Refused, but the OS will still show the dialog. */
  | "denied"
  /** Refused for good. Only Settings can change it. */
  | "blocked"
  /** A request is in flight. */
  | "pending";

/** Matches the shape Expo's permission modules already return. */
export type PermissionResult = {
  granted: boolean;
  canAskAgain: boolean;
};

export type PermissionApi = {
  get: () => Promise<PermissionResult>;
  request: () => Promise<PermissionResult>;
};

function toState({ granted, canAskAgain }: PermissionResult): PermissionState {
  if (granted) return "granted";
  return canAskAgain ? "denied" : "blocked";
}

export function usePermission(api: PermissionApi) {
  const [state, setState] = useState<PermissionState>("undetermined");

  async function check() {
    setState(toState(await api.get()));
  }

  async function request() {
    setState("pending");
    try {
      setState(toState(await api.request()));
    } catch {
      // A throwing permission module must not leave the UI stuck on "pending".
      setState("denied");
    }
  }

  function openSettings() {
    void Linking.openSettings();
  }

  return {
    state,
    /** True only when sending the user to Settings is the one way forward. */
    mustOpenSettings: state === "blocked",
    check,
    request,
    openSettings,
  };
}
