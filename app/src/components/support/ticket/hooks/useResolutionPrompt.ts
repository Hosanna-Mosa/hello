import { useState } from "react";

import type { SupportTicket } from "@/services/types";

/**
 * When to show "Is your issue resolved?".
 *
 * Derived, not synchronised: the dialog is open whenever the ticket is waiting
 * on the user AND they have not set this particular request aside. Each
 * request from support is keyed by `resolutionRequestedAt`, so "not now" shuts
 * the dialog for THAT request only — the banner holds the question — while a
 * fresh request (after a "not yet") opens it again by itself. Answering moves
 * the ticket out of `pendingResolution`, which closes it with no extra step.
 */
export function useResolutionPrompt(ticket: SupportTicket | undefined) {
  const pendingSince =
    ticket?.status === "pendingResolution" ? (ticket.resolutionRequestedAt ?? "pending") : null;
  const [setAsideFor, setSetAsideFor] = useState<string | null>(null);

  return {
    open: pendingSince !== null && setAsideFor !== pendingSince,
    /** Reopen from the banner. */
    show: () => setSetAsideFor(null),
    /** "Not now" — for this request. */
    close: () => setSetAsideFor(pendingSince),
    pending: pendingSince !== null,
  };
}
