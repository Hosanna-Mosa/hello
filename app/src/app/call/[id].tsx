import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { Avatar, CallShell } from "@/components/common";
import { CallControls } from "@/components/calls/CallControls";
import { useCallTimer } from "@/components/calls/useCallTimer";
import { copy } from "@/copy";
import { callsService } from "@/services/calls.service";
import { chatService } from "@/services/chat.service";
import { profilesService } from "@/services/profiles.service";
import type { CallSession } from "@/services/types";
import { useChatStore } from "@/stores/chat.store";

const ME = "me";
/** How long the mock "ringing" lasts before the other side picks up2. */
const RING_MS = 2200;
/** How long "Call ended" stays on screen before the modal dismisses. */
const ENDED_MS = 900;

type Phase = "ringing" | "connected" | "ended";

/**
 * An outgoing voice call — entirely mocked (A17).
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
  const { id, answered } = useLocalSearchParams<{ id: string; answered?: string }>();
  const startedAnswered = answered === "1";

  const loadMessages = useChatStore((state) => state.loadMessages);

  const [phase, setPhase] = useState<Phase>(startedAnswered ? "connected" : "ringing");
  const [name, setName] = useState("");
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

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const thread = await chatService.getThread(id);
      const partnerId = thread.participantIds.find((each) => each !== ME) ?? ME;
      const [profile, started] = await Promise.all([
        profilesService.getProfile(partnerId),
        callsService.startCall(id, startedAnswered ? "incoming" : "outgoing"),
      ]);

      if (cancelled) return;
      session.current = started;
      setName(profile.name);
    })();

    return () => {
      cancelled = true;
    };
  }, [id, startedAnswered]);

  // The mock pick-up.
  useEffect(() => {
    if (phase !== "ringing") return;
    const handle = setTimeout(() => setPhase("connected"), RING_MS);
    return () => clearTimeout(handle);
  }, [phase]);

  async function end() {
    if (ending.current) return;
    ending.current = true;

    const duration = elapsed.current;
    const connected = phase === "connected";
    setPhase("ended");

    const current = session.current;
    if (current) {
      await callsService.endCall(
        current.id,
        connected ? "completed" : "cancelled",
        connected ? duration : 0,
      );
      // `endCall` writes the system message straight into the service, so the
      // open thread has to re-read or it will not show until a remount.
      await loadMessages(id);
    }

    setTimeout(() => router.back(), ENDED_MS);
  }

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
          onToggleMute={() => setMuted((value) => !value)}
          onToggleSpeaker={() => setSpeaker((value) => !value)}
          onEnd={() => void end()}
        />
      }
    >
      <Avatar name={name} size="xl" />
    </CallShell>
  );
}
