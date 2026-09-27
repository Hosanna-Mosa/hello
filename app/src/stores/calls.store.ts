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
 * IT CARRIES THE CALL ID. That is the part the mock never had: the dev trigger
 * opened the incoming screen with a thread id and that screen started a call
 * of its OWN, which was then cancelled on answer. Two calls for one
 * conversation is fine when nothing is real; with signalling it is wrong —
 * the callee must accept the CALLER'S call, or the caller is left ringing
 * (PLAN #164).
 */

import { router } from "expo-router";
import { create } from "zustand";

import { onSocket } from "@/services/socket";
import type { CallSession } from "@/services/types";

export type IncomingCall = {
  callId: string;
  threadId: string;
  fromUserId: string;
};

export type CallsState = {
  /** The call currently ringing, if any. Cleared when it is answered or gone. */
  incoming: IncomingCall | null;
  clearIncoming: () => void;
};

export const useCallsStore = create<CallsState>((set) => ({
  incoming: null,
  clearIncoming: () => set({ incoming: null }),
}));

onSocket("call:incoming", (payload) => {
  const call = payload.call as CallSession | undefined;
  if (!call?.id || !call.threadId) return;

  const incoming: IncomingCall = {
    callId: call.id,
    threadId: call.threadId,
    fromUserId: payload.fromUserId,
  };

  useCallsStore.setState({ incoming });

  // `push`, not `replace`: declining should put you back where you were, not
  // strand you on whatever screen happened to be underneath.
  router.push({
    pathname: "/incoming-call/[id]",
    params: { id: call.threadId, callId: call.id },
  });
});

/**
 * The caller hung up, or the call ended elsewhere, while it was still ringing.
 *
 * Without this the incoming screen rings on after the other person gave up.
 */
onSocket("call:ended", (payload) => {
  const call = payload.call as CallSession | undefined;
  const current = useCallsStore.getState().incoming;
  if (!current || !call?.id || call.id !== current.callId) return;

  useCallsStore.setState({ incoming: null });
});
