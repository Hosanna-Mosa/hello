/**
 * The call in progress — owned here, NOT by the call screen.
 *
 * WHY IT MOVED. The whole call used to live inside `call/[id].tsx`: its refs,
 * its socket listeners, its media, and an unmount cleanup that hung up. So any
 * way of leaving the screen — hardware back included — ENDED THE CALL. Owning it
 * here makes the screen a view: back leaves the call running, `ActiveCallBar`
 * shows it over every other screen, and tapping the bar returns to it.
 *
 * WHY THE CALLER KEPT RINGING. The callee used to tell the caller "accepted"
 * BEFORE opening its own microphone — and the call screen's `call:signal`
 * listener only existed once that screen had mounted. The caller answered
 * "accepted" with an offer at once, and on a phone that was still showing the
 * microphone prompt (or just slower) the offer arrived with nobody listening
 * and was dropped. No offer, no answer, no connection: the callee's screen said
 * connected, the caller's said "Ringing…" until the 45s timeout. Now the callee
 * opens its media FIRST and only then accepts, and signalling is listened to
 * here, for the whole session.
 *
 * One call at a time: the product has no call waiting.
 */

import { create } from "zustand";

import { avatarSource } from "@/mocks/avatars";
import { callAudio } from "@/services/callAudio";
import { callsService } from "@/services/calls.service";
import { chatService } from "@/services/chat.service";
import { currentUserIdOrMe, isMockMode } from "@/services/client";
import { profilesService } from "@/services/profiles.service";
import { emitCallAccept, onSocket } from "@/services/socket";
import type { CallOutcome, CallSession } from "@/services/types";
import {
  handleCallSignal,
  setMuted as setMediaMuted,
  startCallMedia,
  stopCallMedia,
} from "@/services/webrtc";
import { useChatStore } from "@/stores/chat.store";

/** Nobody answered. A ring that never ends is worse than a missed call. */
export const RING_TIMEOUT_MS = 45_000;
/**
 * The mock's pick-up. Mock mode has no server and no media, and it is a
 * first-class path — the offline demo and every test run on it (PLAN #165).
 */
export const MOCK_PICKUP_MS = 2200;
/** How long "Call ended" stays up before the call is cleared. */
export const ENDED_MS = 900;

export type CallPhase = "ringing" | "connecting" | "connected" | "ended";

export type ActiveCall = {
  threadId: string;
  /** Null only while the caller's `POST /calls` is in flight. */
  callId: string | null;
  role: "caller" | "callee";
  phase: CallPhase;
  name: string;
  avatar: number | undefined;
  /** `Date.now()` when audio connected — the timer counts from here. */
  connectedAt: number | null;
  muted: boolean;
  speaker: boolean;
};

export type ActiveCallState = {
  active: ActiveCall | null;
  /** Call someone. A no-op if a call is already in progress. */
  startOutgoing: (threadId: string) => void;
  /**
   * Pick up. `callId` is the CALLER'S call; absent only for the dev trigger,
   * which has no caller and starts a throwaway call of its own.
   */
  answer: (threadId: string, callId?: string) => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
};

export const useActiveCallStore = create<ActiveCallState>(() => ({
  active: null,
  startOutgoing,
  answer,
  hangUp: () => void finish("completed"),
  toggleMute,
  toggleSpeaker,
}));

// ---------------------------------------------------------------------------
// Internals. Module-level because the call outlives every screen.
// ---------------------------------------------------------------------------

/** Bumped per call, so a late async step from an old call cannot touch a new one. */
let generation = 0;
let ending = false;
let timers: ReturnType<typeof setTimeout>[] = [];

function current(): ActiveCall | null {
  return useActiveCallStore.getState().active;
}

function patch(gen: number, next: Partial<ActiveCall>): void {
  const active = current();
  if (!active || gen !== generation) return;
  useActiveCallStore.setState({ active: { ...active, ...next } });
}

function later(ms: number, run: () => void): void {
  timers = [...timers, setTimeout(run, ms)];
}

function clearTimers(): void {
  for (const t of timers) clearTimeout(t);
  timers = [];
}

function begin(call: ActiveCall): number {
  clearTimers();
  ending = false;
  generation += 1;
  useActiveCallStore.setState({ active: call });
  return generation;
}

/** Name and avatar for the header — the same lookup both screens always did. */
async function loadPeer(gen: number, threadId: string): Promise<void> {
  try {
    const thread = await chatService.getThread(threadId);
    const viewerId = currentUserIdOrMe();
    const partnerId = thread.participantIds.find((each) => each !== viewerId) ?? viewerId;
    const profile = await profilesService.getProfile(partnerId);
    patch(gen, { name: profile.name, avatar: avatarSource(profile.avatarId) });
  } catch {
    // The call works without a name; the header just stays blank.
  }
}

function markConnected(gen: number): void {
  const active = current();
  if (!active || gen !== generation || active.phase === "ended") return;
  if (active.phase !== "connected") patch(gen, { phase: "connected", connectedAt: Date.now() });
}

/** Open the microphone, enter call audio, and negotiate. False if it could not. */
async function openMedia(gen: number, callId: string, role: "caller" | "callee"): Promise<boolean> {
  const started = await startCallMedia({
    callId,
    role,
    onConnected: () => markConnected(gen),
    onFailed: () => {
      if (gen === generation) void finish("completed");
    },
  });

  if (started && gen === generation) {
    await callAudio.start(current()?.speaker ?? false);
  }
  return started;
}

function startOutgoing(threadId: string): void {
  if (current()) return;

  const gen = begin({
    threadId,
    callId: null,
    role: "caller",
    phase: "ringing",
    name: "",
    avatar: undefined,
    connectedAt: null,
    muted: false,
    speaker: false,
  });

  void loadPeer(gen, threadId);

  void (async () => {
    let started: CallSession;
    try {
      started = await callsService.startCall(threadId, "outgoing");
    } catch {
      if (gen === generation) void finish("cancelled", false);
      return;
    }

    // Hung up while the request was in flight: the call exists on the server
    // now, so it still has to be ended there.
    if (gen !== generation || ending) {
      await callsService.endCall(started.id, "cancelled", 0).catch(() => {});
      return;
    }

    patch(gen, { callId: started.id });

    if (isMockMode()) {
      later(MOCK_PICKUP_MS, () => markConnected(gen));
      return;
    }

    later(RING_TIMEOUT_MS, () => {
      if (gen === generation && current()?.phase === "ringing") void finish("missed");
    });
  })();
}

function answer(threadId: string, callId?: string): void {
  const existing = current();
  if (existing) return;

  const gen = begin({
    threadId,
    callId: callId ?? null,
    role: "callee",
    phase: isMockMode() ? "connected" : "connecting",
    name: "",
    avatar: undefined,
    connectedAt: isMockMode() ? Date.now() : null,
    muted: false,
    speaker: false,
  });

  void loadPeer(gen, threadId);

  void (async () => {
    let id = callId;

    // Dev trigger only: no real caller, so start a call to stand in for one.
    if (!id) {
      try {
        id = (await callsService.startCall(threadId, "incoming")).id;
      } catch {
        if (gen === generation) void finish("cancelled", false);
        return;
      }
      patch(gen, { callId: id });
    }

    if (isMockMode() || gen !== generation) return;

    // MEDIA FIRST, THEN ACCEPT. Accepting is what makes the caller send its
    // offer, so the connection must exist to receive it. The other order is
    // the "caller still ringing" bug described at the top of this file.
    const ok = await openMedia(gen, id, "callee");
    if (gen !== generation) return;
    if (!ok) {
      void finish("cancelled");
      return;
    }
    if (callId) emitCallAccept(callId);
  })();
}

/**
 * End the call.
 *
 * `notifyServer` is false when the end came FROM the server (`call:ended`):
 * posting another end for a call it already ended would record it twice.
 */
async function finish(outcome: CallOutcome, notifyServer = true): Promise<void> {
  const active = current();
  if (!active || ending) return;
  ending = true;
  clearTimers();

  const gen = generation;
  const connected = active.phase === "connected";
  const duration =
    connected && active.connectedAt ? Math.floor((Date.now() - active.connectedAt) / 1000) : 0;

  patch(gen, { phase: "ended" });

  // The microphone first, always. Whatever happens to the record, it must not
  // stay open a moment longer than the call.
  await stopCallMedia().catch(() => {});
  await callAudio.stop();

  if (active.callId && notifyServer) {
    await callsService
      .endCall(
        active.callId,
        connected ? outcome : outcome === "completed" ? "cancelled" : outcome,
        connected ? duration : 0,
      )
      .catch(() => {});
    // In mock mode `endCall` writes the system message straight into the
    // service, so the thread has to re-read to show it.
    // Best-effort: a failed refresh must never surface as an unhandled
    // rejection after the call has already ended cleanly.
    void useChatStore
      .getState()
      .loadMessages(active.threadId)
      .catch(() => {});
  }

  later(ENDED_MS, () => {
    if (gen === generation) useActiveCallStore.setState({ active: null });
  });
}

function toggleMute(): void {
  const active = current();
  if (!active) return;
  const muted = !active.muted;
  setMediaMuted(muted);
  patch(generation, { muted });
}

function toggleSpeaker(): void {
  const active = current();
  if (!active) return;
  const speaker = !active.speaker;
  void callAudio.setSpeaker(speaker);
  patch(generation, { speaker });
}

// ---------------------------------------------------------------------------
// Socket. Registered at import time (`_layout.tsx` imports this module), so
// nothing depends on which screen is open when the other phone acts.
// ---------------------------------------------------------------------------

/** The callee picked up — the caller opens its microphone and makes the offer. */
onSocket("call:accepted", ({ callId }) => {
  const active = current();
  if (!active || active.role !== "caller" || active.callId !== callId) return;
  if (active.phase !== "ringing") return;

  const gen = generation;
  clearTimers();
  patch(gen, { phase: "connecting" });

  void (async () => {
    const ok = await openMedia(gen, callId, "caller");
    if (!ok && gen === generation) void finish("cancelled");
  })();
});

onSocket("call:signal", (payload) => {
  void handleCallSignal(payload).catch(() => {});
});

/** The other person hung up, declined, or the call was otherwise closed. */
onSocket("call:ended", (payload) => {
  const ended = payload.call as CallSession | undefined;
  const active = current();
  // Guarded on the id so a stale end cannot kill the call that replaced it.
  if (!ended?.id || !active || ended.id !== active.callId) return;
  void finish("completed", false);
});

/** Test seam — drops any call without touching the server. */
export function __resetActiveCall(): void {
  clearTimers();
  ending = false;
  generation += 1;
  useActiveCallStore.setState({ active: null });
}
