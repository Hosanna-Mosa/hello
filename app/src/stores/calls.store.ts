/**
 * Being called.
 *
 * The one thing a call needs that nothing else in this app does: a screen has
 * to appear when the OTHER person acts. Every other flow starts with a tap, so
 * every other socket handler can just update data and let whatever is mounted
 * re-render. A ring cannot — it has to navigate.
 *
 * So this module registers its listener at import time, like the chat store
 * does, and `_layout.tsx` imports it to keep it alive for the whole session.
 *
 * It does NOT navigate. `IncomingCallOverlay`, mounted once above the whole
 * navigator, renders from `incoming`. A ring is a fact, not a destination.
 *
 * IT CARRIES THE CALL ID. That is the part the mock never had: the dev trigger
 * opened the incoming screen with a thread id and that screen started a call
 * of its OWN, which was then cancelled on answer. Two calls for one
 * conversation is fine when nothing is real; with signalling it is wrong —
 * the callee must accept the CALLER'S call, or the caller is left ringing
 * (PLAN #164).
 */

import { create } from "zustand";

import { onSocket } from "@/services/socket";
import type { CallSession } from "@/services/types";
import { receiveMessage } from "@/stores/chat.store";

export type IncomingCall = {
  callId: string;
  threadId: string;
  fromUserId: string;
};

export type CallsState = {
  /** The call currently ringing, if any. Cleared when it is answered or gone. */
  incoming: IncomingCall | null;
  /**
   * Backed out of the ring without answering. The call still rings — it just
   * shrinks to `IncomingCallBar` at the top of every screen, the way a call in
   * progress does, until it is answered, declined, or the caller gives up.
   */
  minimized: boolean;
  clearIncoming: () => void;
  minimizeIncoming: () => void;
  restoreIncoming: () => void;
};

export const useCallsStore = create<CallsState>((set) => ({
  incoming: null,
  minimized: false,
  clearIncoming: () => set({ incoming: null, minimized: false }),
  minimizeIncoming: () => set({ minimized: true }),
  restoreIncoming: () => set({ minimized: false }),
}));

onSocket("call:incoming", (payload) => {
  const call = payload.call as CallSession | undefined;
  if (!call?.id || !call.threadId) return;

  const incoming: IncomingCall = {
    callId: call.id,
    threadId: call.threadId,
    fromUserId: payload.fromUserId,
  };

  // SETTING STATE IS THE WHOLE JOB NOW. This used to `router.push` the ringing
  // screen, which made a ring a navigation event — and navigation events lose:
  // the ring showed only when the Chat tab happened to be open and vanished on
  // moving away (PLAN #205). `IncomingCallOverlay` renders from this state,
  // above the navigator, so it cannot be lost by navigating.
  // A new ring always starts full screen, whatever the last one was left as.
  useCallsStore.setState({ incoming, minimized: false });
});

/**
 * A call ended — hung up, declined, or nobody answered.
 *
 * Two jobs, and they are independent. The ring must stop, and the "Voice call ·
 * 2:14" line the server wrote must land in the conversation.
 *
 * The second one was missing. `call:ended` has always carried `systemMessage`
 * and nothing read it, so the trace appeared only for whoever was on the call
 * screen — that side re-reads the thread on hang-up — and never for the other
 * person until they reopened the chat (PLAN #193).
 */
onSocket("call:ended", (payload) => {
  const call = payload.call as CallSession | undefined;

  // Stop the ring. Guarded on the id so a stale end from a previous call
  // cannot silence the one that replaced it.
  const current = useCallsStore.getState().incoming;
  if (current && call?.id && call.id === current.callId) {
    useCallsStore.setState({ incoming: null, minimized: false });
  }

  // Record it. `receiveMessage` dedupes by id, so the call screen's own
  // re-read and this event cannot produce the line twice.
  if (payload.systemMessage && call?.threadId) {
    receiveMessage(call.threadId, payload.systemMessage);
  }
});
