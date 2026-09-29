import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";

import { Avatar, CallShell } from "@/components/common";
import { CallControls } from "@/components/call/molecules/CallControls";
import { useCallTimer } from "@/components/common/hooks/useCallTimer";
import { copy } from "@/copy";
import { ENDED_MS, FAILED_MS, useActiveCallStore } from "@/stores/activeCall.store";

/**
 * A voice call — a VIEW of the call in `activeCall.store`, not its owner.
 *
 * The call used to live here, with an unmount cleanup that hung up, so hardware
 * back ended it. Now leaving this screen leaves the call running: the
 * `ActiveCallBar` at the top of every other screen shows it, and tapping the bar
 * comes back here. Only End (or the other person) ends it.
 *
 * Arriving:
 *   - a call for this thread already exists → just show it (the bar's return);
 *   - `answered=1` → pick up (the incoming-call route's hand-off);
 *   - otherwise → call the other person.
 */
export default function CallScreen() {
  const { id, answered, callId } = useLocalSearchParams<{
    id: string;
    answered?: string;
    callId?: string;
  }>();

  const active = useActiveCallStore((state) => state.active);
  const startOutgoing = useActiveCallStore((state) => state.startOutgoing);
  const answer = useActiveCallStore((state) => state.answer);
  const hangUp = useActiveCallStore((state) => state.hangUp);
  const toggleMute = useActiveCallStore((state) => state.toggleMute);
  const toggleSpeaker = useActiveCallStore((state) => state.toggleSpeaker);

  /**
   * One start per screen, ever. A call makes someone else's phone ring, so it
   * is un-repeatable by construction — this also covers React's dev-mode
   * double-invoke (PLAN #198).
   */
  const startedOnce = useRef(false);
  /** Whether this screen has seen its call, so "no call" can mean "it ended". */
  const hadCall = useRef(false);

  useEffect(() => {
    if (startedOnce.current) return;
    startedOnce.current = true;

    const existing = useActiveCallStore.getState().active;
    if (existing) {
      // Already on a call. A different thread's call is not replaced — the
      // product has no call waiting — so this screen simply shows that one.
      return;
    }
    if (answered === "1") answer(id, callId);
    else startOutgoing(id);
  }, [id, answered, callId, answer, startOutgoing]);

  // Leave once the call is over: after "Call ended" has been on screen a beat,
  // or at once if the call vanished while we were away from it.
  const phase = active?.phase;
  const failed = Boolean(active?.failure);
  useEffect(() => {
    if (active) hadCall.current = true;

    if (phase === "ended") {
      const handle = setTimeout(() => {
        if (router.canGoBack()) router.back();
      }, failed ? FAILED_MS : ENDED_MS);
      return () => clearTimeout(handle);
    }

    if (!active && hadCall.current && router.canGoBack()) router.back();
    return undefined;
  }, [active, phase, failed]);

  const timer = useCallTimer(active?.phase === "connected" ? active.connectedAt : null);

  const status =
    !active || active.phase === "ringing"
      ? copy.calls.ringing
      : active.phase === "connecting"
        ? copy.calls.connecting
        : active.phase === "connected"
          ? timer.formatted
          : active.failure
            ? copy.calls.failed(active.failure)
            : copy.calls.ended;

  return (
    <CallShell
      name={active?.name ?? ""}
      status={status}
      controls={
        <CallControls
          muted={active?.muted ?? false}
          speaker={active?.speaker ?? false}
          disabled={active?.phase !== "connected"}
          onToggleMute={toggleMute}
          onToggleSpeaker={toggleSpeaker}
          onEnd={hangUp}
        />
      }
    >
      <Avatar source={active?.avatar} name={active?.name ?? ""} size="xl" />
    </CallShell>
  );
}
