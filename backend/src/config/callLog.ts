/**
 * Loggers for the two flows that fail silently on a device: voice calls and
 * voice messages.
 *
 * Everything carries a `[call]` / `[voice]` prefix so the whole story of one
 * call can be pulled out of the journal:
 *
 *   journalctl -u hello-api -f | grep -E '\[call\]|\[voice\]'
 *
 * and, for one call, `| grep <callId>`. The phones report their own side of a
 * call over `call:diag` (see `calls.socket.ts`), so both ends and the relay in
 * between appear in one place.
 *
 * Never logged: SDP bodies, ICE candidate addresses, TURN credentials, tokens.
 * Candidate TYPES are logged (host / srflx / relay) — that is the diagnosis;
 * the addresses would only be personal data.
 */

import { logger } from "@/config/logger.js";

export const callLog = logger.child({ area: "call" });
export const voiceLog = logger.child({ area: "voice" });

/** `candidate:… typ relay …` → "relay"; anything unreadable → null. */
export function candidateType(data: unknown): string | null {
  const text = (data as { candidate?: unknown } | null)?.candidate;
  if (typeof text !== "string") return null;
  return / typ (\w+)/.exec(text)?.[1] ?? null;
}
