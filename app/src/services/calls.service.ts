/**
 * Voice calls.
 *
 * A17 said "entirely mocked" and that was still literally true here long after
 * it stopped being true anywhere else: this file had NO real branch at all,
 * while every other service had been cut over. The effect was precise and
 * invisible — `startCall` minted a CallSession in the phone's own memory, the
 * server was never told a call existed, so it never emitted `call:incoming`
 * and the person being called never rang. The caller saw "Ringing…" for 45
 * seconds and the call was recorded as missed (PLAN #192).
 *
 * Everything around it was already real, which is exactly why it hid: the
 * socket, the `user:<id>` room, the incoming-call handler, the WebRTC audio and
 * `GET /calls/ice` all worked. Only the thing that STARTS a call was local.
 *
 * The mock path stays, in full. The offline demo runs on it and so does every
 * test — mock mode has no server to POST to and fakes the pick-up on a timer.
 */

import { ApiError, http, isMockMode, nextId, nowIso, request } from "./client";
import { chatService } from "./chat.service";
import type { CallDirection, CallOutcome, CallSession } from "./types";

let calls: CallSession[] = [];

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export const callsService = {
  /**
   * Start a call, and — in real mode — make the other phone ring.
   *
   * `direction` is ignored against the real API on purpose: the server derives
   * it per viewer from `callerId`, because the same call is outgoing to one
   * person and incoming to the other. Storing or sending one of them would be
   * wrong for whoever is not that person.
   */
  async startCall(threadId: string, direction: CallDirection = "outgoing"): Promise<CallSession> {
    if (!isMockMode()) return http<CallSession>("POST", "/calls", { threadId });

    return request(() => {
      const session: CallSession = {
        id: nextId("call"),
        threadId,
        direction,
        startedAt: nowIso(),
        durationSec: 0,
        outcome: "cancelled",
      };
      calls = [...calls, session];
      return { ...session };
    });
  },

  /**
   * Ends a call and records it. A completed call writes a system message; a
   * missed, declined or cancelled one does not clutter the conversation.
   */
  async endCall(
    callId: string,
    outcome: CallOutcome,
    durationSec = 0,
  ): Promise<CallSession> {
    if (!isMockMode()) {
      // No `appendSystemMessageSync` here: the server writes the system message
      // inside the same request and broadcasts it on `call:ended`, to BOTH
      // participants. Writing it locally too would show the caller two.
      return http<CallSession>("POST", `/calls/${encodeURIComponent(callId)}/end`, {
        outcome,
        durationSec,
      });
    }

    return request(() => {
      const session = calls.find((c) => c.id === callId);
      if (!session) throw new ApiError("notFound");

      const ended: CallSession = { ...session, outcome, durationSec };
      calls = calls.map((c) => (c.id === callId ? ended : c));

      if (outcome === "completed" && durationSec > 0) {
        chatService.appendSystemMessageSync(
          session.threadId,
          `Voice call · ${formatDuration(durationSec)}`,
        );
      }

      return { ...ended };
    });
  },

  async listCalls(threadId?: string): Promise<CallSession[]> {
    if (!isMockMode()) {
      const query = threadId ? `?threadId=${encodeURIComponent(threadId)}` : "";
      return http<CallSession[]>("GET", `/calls${query}`);
    }

    return request(() =>
      calls.filter((c) => !threadId || c.threadId === threadId).map((c) => ({ ...c })),
    );
  },

  /** Exported so tests and the system message agree on the format. */
  formatDuration,

  __reset(): void {
    calls = [];
  },
};
