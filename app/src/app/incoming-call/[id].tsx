import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { Avatar, CallShell } from "@/components/common";
import { IncomingCallActions } from "@/components/incoming-call/molecules/IncomingCallActions";
import { copy } from "@/copy";
import { avatarSource } from "@/mocks/avatars";
import { callsService } from "@/services/calls.service";
import { emitCallAccept } from "@/services/socket";
import { useCallsStore } from "@/stores/calls.store";
import { chatService } from "@/services/chat.service";
import { currentUserIdOrMe } from "@/services/client";
import { profilesService } from "@/services/profiles.service";
import type { CallSession } from "@/services/types";


/**
 * An incoming voice call — mocked, like everything else about calls (A17).
 *
 * This screen only ever rings. Accepting hands over to `call/[id]` with
 * `answered=1` so the connected UI, the timer and the "Voice call · 2:14"
 * system message all live in exactly one place.
 *
 * `router.replace`, not `push`: once you have answered, backing out should not
 * land you on a phone that is still ringing.
 *
 * There is no push infrastructure behind this. It is reached from the dev-only
 * trigger in the Chat header, which is what makes it demonstrable at all.
 */
export default function IncomingCallScreen() {
  /**
   * `callId` is the CALLER'S call, handed over by the `call:incoming`
   * listener. Absent only for the dev trigger, which has no real caller — in
   * that case this screen starts a throwaway call of its own, exactly as it
   * always did, so the demo still works with nobody on the other end.
   */
  const { id, callId } = useLocalSearchParams<{ id: string; callId?: string }>();

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<number | undefined>(undefined);
  const session = useRef<CallSession | null>(null);
  const clearIncoming = useCallsStore((state) => state.clearIncoming);

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
        // Only the dev trigger needs one — a real ring already has its call.
        callId ? Promise.resolve(null) : callsService.startCall(id, "incoming"),
      ]);

      if (cancelled) return;
      session.current = started;
      setName(profile.name);
      setAvatar(avatarSource(profile.avatarId));
    })();

    return () => {
      cancelled = true;
    };
  }, [id, callId]);

  function onAccept() {
    clearIncoming();

    if (callId) {
      // Tell the caller. This is what stops their ringing screen and starts
      // the media negotiation — the event that used to go nowhere (PLAN #161).
      emitCallAccept(callId);
      router.replace({
        pathname: "/call/[id]",
        params: { id, answered: "1", callId },
      });
      return;
    }

    // Dev trigger only: no real caller, so the ring was a call we made to
    // ourselves. Close it and open a fresh one, as the mock always did.
    const current = session.current;
    if (current) void callsService.endCall(current.id, "cancelled", 0);
    router.replace({ pathname: "/call/[id]", params: { id, answered: "1" } });
  }

  async function onDecline() {
    clearIncoming();

    if (callId) {
      // Declined, not missed — and no system message either way, so a declined
      // ring leaves no trace in the thread.
      await callsService.endCall(callId, "declined", 0);
      router.back();
      return;
    }

    const current = session.current;
    // A declined call leaves no system message — `endCall` only writes one for
    // a completed call, which is what keeps a declined ring out of the thread.
    if (current) await callsService.endCall(current.id, "declined", 0);
    router.back();
  }

  return (
    <CallShell
      name={name}
      status={copy.calls.incoming}
      controls={<IncomingCallActions onAccept={onAccept} onDecline={() => void onDecline()} />}
    >
      <Avatar source={avatar} name={name} size="xl" />
    </CallShell>
  );
}
