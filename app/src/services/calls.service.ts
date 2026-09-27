/**
 * Voice calls, entirely mocked (A17).
 *
 * No audio, no microphone permission, no WebRTC, no video — and no dependency
 * added for any of it. The ringing → connected → ended sequence is a timer, and
 * the only lasting trace is the "Voice call · 2:14" system message written back
 * into the thread.
 *
 * R12: a real implementation is a native module and a rebuild. The UI built on
 * top of this is reusable; the integration is separate work.
 */

import { ApiError, nextId, nowIso, request } from "./client";
import { chatService } from "./chat.service";
import type { CallDirection, CallOutcome, CallSession } from "./types";

let calls: CallSession[] = [];

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export const callsService = {
  async startCall(threadId: string, direction: CallDirection = "outgoing"): Promise<CallSession> {
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
