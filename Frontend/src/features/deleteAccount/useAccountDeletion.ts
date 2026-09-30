/**
 * The web deletion flow as a small state machine:
 *   phone → code → confirm → done
 *
 * Each step's action is async and reports its own error; nothing advances
 * until the server has agreed. The session token lives only in this hook's
 * state and is dropped as soon as deletion succeeds.
 */

import { useState } from "react";

import { accountApi, type Phone } from "@/lib/api";

export type Step = "phone" | "code" | "confirm" | "done";

export function useAccountDeletion() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState<Phone>({ countryCode: "91", phoneNumber: "" });
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

  const sendCode = (next: Phone) =>
    run(async () => {
      await accountApi.sendCode(next);
      setPhone(next);
      setStep("code");
    });

  const verify = (code: string) =>
    run(async () => {
      const session = await accountApi.verify(phone, code);
      setToken(session.token);
      setStep("confirm");
    });

  const confirm = (reason: string) =>
    run(async () => {
      if (!token) throw new Error("Your session expired. Please start again.");
      await accountApi.requestDeletion(token, reason.trim() || undefined);
      setToken(null);
      setStep("done");
    });

  const restart = () => {
    setToken(null);
    setError(null);
    setStep("phone");
  };

  return { step, phone, busy, error, sendCode, verify, confirm, restart, resend: () => sendCode(phone) };
}
