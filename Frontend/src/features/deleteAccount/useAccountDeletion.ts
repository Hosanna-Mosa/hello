/**
 * The web deletion flow as a small state machine:
 *   signIn → confirm → done
 *
 * Sign-in is the app's own (email or phone + password), so it can never create
 * an account on the way to deleting one. Each step reports its own error and
 * nothing advances until the server has agreed. The token lives only in this
 * hook's state; it is dropped on success, and signed out if the person backs out.
 */

import { useState } from "react";

import { accountApi } from "@/lib/api";

export type Step = "signIn" | "confirm" | "done";

export function useAccountDeletion() {
  const [step, setStep] = useState<Step>("signIn");
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const signIn = (identifier: string, password: string) =>
    run(async () => {
      const session = await accountApi.signIn(identifier, password);
      setToken(session.token);
      setStep("confirm");
    });

  const confirm = (reason: string) =>
    run(async () => {
      if (!token) throw new Error("Your session expired. Please sign in again.");
      await accountApi.deleteAccount(token, reason.trim() || undefined);
      setToken(null);
      setStep("done");
    });

  const restart = () => {
    // Backing out must not leave a live session behind on the server.
    if (token) void accountApi.signOut(token).catch(() => undefined);
    setToken(null);
    setError(null);
    setStep("signIn");
  };

  return { step, busy, error, signIn, confirm, restart };
}
