import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { Avatar, CallShell } from "@/components/common";
import { CallControls } from "@/components/call/molecules/CallControls";
import { useCallTimer } from "@/components/call/hooks/useCallTimer";
import { copy } from "@/copy";
import { avatarSource } from "@/mocks/avatars";
import { callsService } from "@/services/calls.service";
import { onSocket } from "@/services/socket";
import {
  handleCallSignal,
  setMuted as setCallMuted,
  startCallMedia,
  stopCallMedia,
} from "@/services/webrtc";
import { chatService } from "@/services/chat.service";
import { currentUserIdOrMe, isMockMode } from "@/services/client";
import { profilesService } from "@/services/profiles.service";
import type { CallSession } from "@/services/types";
import { useChatStore } from "@/stores/chat.store";

/** How long the mock "ringing" lasts before the other side picks up2. */
/**
 * How long to ring before giving up.
 *
 * Was 2200ms and a fake pick-up — the call "connected" whether or not anyone
 * was there. Now it is a real timeout: nobody answered, so the call is missed.
 */
const RING_TIMEOUT_MS = 45_000;

/**
 * The mock's pick-up, kept.
 *
 * Mock mode has no server to signal through and no media to negotiate, and it
 * is a first-class path here — the offline demo runs on it and so does every
 * test. Letting the real code fall through would end every mock call the
 * instant it started (PLAN #165).
 */
const MOCK_PICKUP_MS = 2200;
/** How long "Call ended" stays on screen before the modal dismisses. */
const ENDED_MS = 900;

type Phase = "ringing" | "connected" | "ended";

/**
 * An outgoing voice call.
 *
 * Real audio over WebRTC (`services/webrtc.ts`), signalled across the socket
 * that already carries messages. A17 said "fully mocked"; that is superseded —
 * see PLAN #163.
 *
 * No audio, no microphone permission, no WebRTC, no video, and no dependency
 * added for any of it. Ringing, connecting and the timer are timers; the only
 * lasting trace is the "Voice call · 2:14" system message `callsService.endCall`
 * writes back into the thread.
 *
 * Arriving with `answered=1` means the user accepted an incoming call, so this
 * connects immediately rather than ringing at them a second time.
 */
export default function CallScreen() {
  /**
   * `callId` is present when ANSWERING — it is the caller's call, handed over
   * by the incoming screen. Without it we are the caller and start a new one.
   */
  const { id, answered, callId } = useLocalSearchParams<{
    id: string;
    answered?: string;
    callId?: string;
  }>();
  const startedAnswered = answered === "1";

  const loadMessages = useChatStore((state) => state.loadMessages);

  const [phase, setPhase] = useState<Phase>(startedAnswered ? "connected" : "ringing");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<number | undefined>(undefined);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);

  const session = useRef<CallSession | null>(null);
  /**
   * Guards the teardown. `endCall` is reachable from the End button and from
   * the effect cleanup on unmount, and the second one must not fire a request
   * for a call that is already recorded.
   */
  const ending = useRef(false);

  const timer = useCallTimer(phase === "connected");
  /**
   * The timer stops the moment `phase` leaves "connected", so the duration has
   * to be captured before that — reading `timer.seconds` after the transition
   * gives 0 and the system message never gets written.
   */
  const elapsed = useRef(0);
  useEffect(() => {
    if (phase === "connected") elapsed.current = timer.seconds;
  }, [phase, timer.seconds]);

  const end = useCallback(
      async (outcome: "completed" | "cancelled" | "missed" = "completed") => {
      if (ending.current) return;
      ending.current = true;

      const duration = elapsed.current;
      const connected = phase === "connected";
      setPhase("ended");

      // Release the microphone FIRST. Whatever happens to the record, the mic
      // must not stay open a moment longer than the call.
      await stopCallMedia();

      const current = session.current;
      if (current) {
        await callsService.endCall(
          current.id,
          connected ? outcome : outcome === "completed" ? "cancelled" : outcome,
          connected ? duration : 0,
        );
        // `endCall` writes the system message straight into the service, so the
        // open thread has to re-read or it will not show until a remount.
        await loadMessages(id);
      }

      setTimeout(() => router.back(), ENDED_MS);
      },
    [phase, id, loadMessages],
  );

  /**
   * Open the microphone and negotiate.
   *
   * Only flips to `connected` once ICE actually reports a connection, so the
   * timer starts when audio starts rather than when we hoped it would.
   */
  const beginMedia = useCallback(
      async (role: "caller" | "callee") => {
      const current = session.current;
      if (!current) return;

      const started = await startCallMedia({
        callId: current.id,
        role,
        onConnected: () => setPhase("connected"),
        onFailed: () => void end("cancelled"),
      });

      // No microphone, or mock mode. Saying so beats a silent call that looks
      // connected.
      if (!started) await end("cancelled");
      },
    [end],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const thread = await chatService.getThread(id);
      // Ask who "me" is rather than assuming the mock's literal — against the
      // real API the id is a Mongo id, and a hardcoded "me" matches nobody, so
      // this picked the FIRST participant: your own name on your own call.
      const viewerId = currentUserIdOrMe();
      const partnerId = thread.participantIds.find((each) => each !== viewerId) ?? viewerId;
      const [profile, started] = await Promise.all([
        profilesService.getProfile(partnerId),
        // Answering joins the caller's call; only a caller starts one. Making
        // a second call here is what left the real caller ringing.
        callId
          ? Promise.resolve({ id: callId } as CallSession)
          : callsService.startCall(id, startedAnswered ? "incoming" : "outgoing"),
      ]);

      if (cancelled) return;
      session.current = started;
      setName(profile.name);
      setAvatar(avatarSource(profile.avatarId));

      // Arriving already answered means we are the callee: the offer is on its
      // way, so the microphone has to be open to answer it.
      if (startedAnswered && !isMockMode()) void beginMedia("callee");
    })();

    return () => {
      cancelled = true;
    };
  }, [id, startedAnswered, callId, beginMedia]);

  /**
   * The real pick-up.
   *
   * `call:accepted` arrives when the other person taps answer — the event the
   * server was emitting into an empty room until this phase (PLAN #161). Media
   * only starts here, on the caller's side, because offering before anyone has
   * answered would open the microphone into nothing.
   */
  useEffect(() => {
    if (startedAnswered || isMockMode()) return;

    // Named for what it is — `callId` here would shadow the route param.
    return onSocket("call:accepted", ({ callId: acceptedId }) => {
      if (session.current && acceptedId !== session.current.id) return;
      void beginMedia("caller");
    });
  }, [startedAnswered, beginMedia]);

  /** Mock mode answers itself, as it always did. */
  useEffect(() => {
    if (!isMockMode() || phase !== "ringing") return;
    const handle = setTimeout(() => setPhase("connected"), MOCK_PICKUP_MS);
    return () => clearTimeout(handle);
  }, [phase]);

  // Signalling from the other side, for as long as this screen is open.
  useEffect(() => {
    if (isMockMode()) return;

    return onSocket("call:signal", (payload) => {
      void handleCallSignal(payload);
    });
  }, []);

  /** Nobody answered. A ring that never ends is worse than a missed call. */
  useEffect(() => {
    if (isMockMode() || phase !== "ringing") return;
    const handle = setTimeout(() => void end("missed"), RING_TIMEOUT_MS);
    return () => clearTimeout(handle);
  }, [phase, end]);


  const status =
    phase === "ringing"
      ? copy.calls.ringing
      : phase === "connected"
        ? timer.formatted
        : copy.calls.ended;

  return (
    <CallShell
      name={name}
      status={status}
      controls={
        <CallControls
          muted={muted}
          speaker={speaker}
          disabled={phase !== "connected"}
          onToggleMute={() =>
            setMuted((value) => {
              const next = !value;
              setCallMuted(next);
              return next;
            })
          }
          onToggleSpeaker={() => setSpeaker((value) => !value)}
          onEnd={() => void end("completed")}
        />
      }
    >
      <Avatar source={avatar} name={name} size="xl" />
    </CallShell>
  );
}
