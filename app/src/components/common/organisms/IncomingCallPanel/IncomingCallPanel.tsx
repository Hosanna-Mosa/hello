/**
 * A ringing phone.
 *
 * Extracted from `app/incoming-call/[id].tsx` so the SAME ring can be shown two
 * ways: as a route (the dev trigger in the Chat header pushes one) and as a
 * global overlay rendered above the navigator (`IncomingCallOverlay`), which is
 * how a real caller reaches you.
 *
 * WHY BOTH. A real ring cannot be a route. Pushing one from a socket handler
 * competes with whatever navigation the person is doing, can be dismissed by
 * navigating, and depends on the navigator being in a cooperative state — which
 * is exactly the reported failure: it appeared only when the Chat tab happened
 * to be open, and vanished on moving away (PLAN #205). An overlay has no such
 * dependency: it is state, and state does not care what screen you are on.
 *
 * `onDone` is the difference between the two. The route pops itself; the
 * overlay just stops rendering. Nothing else here knows which it is.
 */

import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/common/atoms/Avatar";
import { CallShell } from "@/components/common/templates/CallShell";
import { IncomingCallActions } from "@/components/incoming-call/molecules/IncomingCallActions";
import { copy } from "@/copy";
import { avatarSource } from "@/mocks/avatars";
import { callsService } from "@/services/calls.service";
import { chatService } from "@/services/chat.service";
import { currentUserIdOrMe, isMockMode } from "@/services/client";
import { profilesService } from "@/services/profiles.service";
import { onSocket } from "@/services/socket";
import type { CallSession } from "@/services/types";

export type IncomingCallPanelProps = {
  /** The thread the call belongs to. */
  threadId: string;
  /**
   * The CALLER'S call id, from `call:incoming`. Absent only for the dev
   * trigger, which has no real caller and starts a throwaway call of its own.
   */
  callId?: string | undefined;
  /** Accepted — hand over to the connected call screen. */
  onAccepted: (callId?: string) => void;
  /** Declined, or the caller gave up. Stop showing this. */
  onDismissed: () => void;
  /**
   * Step back without answering — the ring carries on in `IncomingCallBar`.
   * Omitted, there is no back chevron.
   */
  onMinimize?: (() => void) | undefined;
};

export function IncomingCallPanel({
  threadId,
  callId,
  onAccepted,
  onDismissed,
  onMinimize,
}: IncomingCallPanelProps) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<number | undefined>(undefined);
  const session = useRef<CallSession | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const thread = await chatService.getThread(threadId);
      // Ask who "me" is rather than assuming the mock's literal — against the
      // real API the id is a Mongo id, and a hardcoded "me" matches nobody, so
      // this picked the FIRST participant: your own name on your own call.
      const viewerId = currentUserIdOrMe();
      const partnerId = thread.participantIds.find((each) => each !== viewerId) ?? viewerId;
      const [profile, started] = await Promise.all([
        profilesService.getProfile(partnerId),
        // Only the dev trigger needs one — a real ring already has its call.
        callId ? Promise.resolve(null) : callsService.startCall(threadId, "incoming"),
      ]);

      if (cancelled) return;
      session.current = started;
      setName(profile.name);
      setAvatar(avatarSource(profile.avatarId));
    })();

    return () => {
      cancelled = true;
    };
  }, [threadId, callId]);

  /**
   * The caller gave up before we answered.
   *
   * Without this the phone rings on for a call that no longer exists, and
   * answering it accepts a dead call — the server already recorded an end, so
   * nobody is on the other side (PLAN #200).
   */
  useEffect(() => {
    if (!callId || isMockMode()) return;

    return onSocket("call:ended", (payload) => {
      const ended = payload.call as CallSession | undefined;
      if (!ended?.id || ended.id !== callId) return;

      onDismissed();
    });
  }, [callId, onDismissed]);

  function onAccept() {
    if (callId) {
      // NOT accepted here. `activeCall.store` tells the caller once OUR
      // microphone and connection are ready — accepting first is what let the
      // caller's offer arrive at nothing and left them ringing.
      onAccepted(callId);
      return;
    }

    // Dev trigger only: no real caller, so the ring was a call we made to
    // ourselves. Close it and let a fresh one open, as the mock always did.
    const current = session.current;
    if (current) void callsService.endCall(current.id, "cancelled", 0);
    onAccepted(undefined);
  }

  async function onDecline() {
    // Dismiss FIRST. The request below can be slow or fail, and a ring that
    // keeps ringing while a decline is in flight is the worst of both.
    onDismissed();

    // A declined call leaves no system message — `endCall` only writes one for
    // a completed call, which is what keeps a declined ring out of the thread.
    const id = callId ?? session.current?.id;
    if (id) await callsService.endCall(id, "declined", 0).catch(() => {});
  }

  return (
    <CallShell
      name={name}
      status={copy.calls.incoming}
      onBack={onMinimize}
      backLabel={copy.calls.minimize}
      controls={<IncomingCallActions onAccept={onAccept} onDecline={() => void onDecline()} />}
    >
      <Avatar source={avatar} name={name} size="xl" />
    </CallShell>
  );
}
