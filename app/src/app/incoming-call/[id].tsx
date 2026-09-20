import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { Avatar, CallShell } from "@/components/common";
import { IncomingCallActions } from "@/components/calls/IncomingCallActions";
import { copy } from "@/copy";
import { callsService } from "@/services/calls.service";
import { chatService } from "@/services/chat.service";
import { profilesService } from "@/services/profiles.service";
import type { CallSession } from "@/services/types";

const ME = "me";

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
  const { id } = useLocalSearchParams<{ id: string }>();

  const [name, setName] = useState("");
  const session = useRef<CallSession | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const thread = await chatService.getThread(id);
      const partnerId = thread.participantIds.find((each) => each !== ME) ?? ME;
      const [profile, started] = await Promise.all([
        profilesService.getProfile(partnerId),
        callsService.startCall(id, "incoming"),
      ]);

      if (cancelled) return;
      session.current = started;
      setName(profile.name);
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function onAccept() {
    // The session started here is recorded as cancelled and a fresh one opens
    // on the call screen. Two rows for one answered call is the honest shape:
    // the ring and the conversation are different events.
    const current = session.current;
    if (current) void callsService.endCall(current.id, "cancelled", 0);

    router.replace({ pathname: "/call/[id]", params: { id, answered: "1" } });
  }

  async function onDecline() {
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
      <Avatar name={name} size="xl" />
    </CallShell>
  );
}
