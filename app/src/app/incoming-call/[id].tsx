import { router, useLocalSearchParams } from "expo-router";

import { IncomingCallPanel } from "@/components/common/organisms/IncomingCallPanel";
import { useCallsStore } from "@/stores/calls.store";

/**
 * An incoming voice call, as a ROUTE.
 *
 * A real caller does NOT arrive here any more — `IncomingCallOverlay` shows
 * that, above the navigator, so it works on whatever screen you are on
 * (PLAN #205). This route survives for the dev trigger in the Chat header,
 * which has no caller and simulates one, and for the snapshot that covers the
 * ringing UI.
 *
 * All the behaviour lives in `IncomingCallPanel`, shared with the overlay, so
 * the two can never drift into ringing differently.
 */
export default function IncomingCallScreen() {
  const { id, callId } = useLocalSearchParams<{ id: string; callId?: string }>();
  const clearIncoming = useCallsStore((state) => state.clearIncoming);

  return (
    <IncomingCallPanel
      threadId={id}
      callId={callId}
      onAccepted={(accepted) => {
        clearIncoming();
        // `replace`, not `push`: once answered, backing out must not land you
        // on a phone that is still ringing.
        router.replace({
          pathname: "/call/[id]",
          params: accepted ? { id, answered: "1", callId: accepted } : { id, answered: "1" },
        });
      }}
      onDismissed={() => {
        clearIncoming();
        router.back();
      }}
    />
  );
}
