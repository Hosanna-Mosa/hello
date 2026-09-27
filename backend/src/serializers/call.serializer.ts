/**
 * Call -> wire type.
 *
 * `direction` is DERIVED, not stored. The same call is outgoing to the caller
 * and incoming to the callee; storing one of them would be wrong for whoever
 * is not that person.
 */

import type { CallDirection, CallOutcome, CallSession } from "@/types/wire.js";
import type { CallDoc } from "@/models/call.model.js";

export function toCall(doc: CallDoc, viewerId: string): CallSession {
  const direction: CallDirection = String(doc.callerId) === viewerId ? "outgoing" : "incoming";

  return {
    id: String(doc._id),
    threadId: String(doc.threadId),
    direction,
    startedAt: (doc.startedAt ?? new Date()).toISOString(),
    durationSec: doc.durationSec ?? 0,
    outcome: (doc.outcome ?? "cancelled") as CallOutcome,
  };
}
