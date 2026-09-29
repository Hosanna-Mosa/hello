/**
 * The ring, rendered above everything, from state alone.
 *
 * THE POINT OF THIS FILE. A real incoming call used to be `router.push` from a
 * socket handler. That made the ring a navigation event, and navigation events
 * lose: the operator reported it appearing only when the Chat tab happened to
 * be open, and disappearing the moment they moved to another screen
 * (PLAN #205). An overlay cannot lose that way — it is not somewhere you went,
 * it is something that is true, and it stays true until the call ends.
 *
 * Mounted once in `_layout.tsx`, AFTER `<Stack>`, so it paints over every
 * screen and over the native tab bar. It renders nothing at all when no call is
 * ringing, which is almost always.
 *
 * BACK DOES NOT DECLINE. The chevron and Android's hardware back both
 * minimise the ring to `IncomingCallBar` — the same strip an ongoing call
 * gets — so you can finish what you were doing and answer from there.
 */

import { router } from "expo-router";
import { useEffect } from "react";
import { BackHandler } from "react-native";

import { Box } from "@/components/common/atoms/Box";
import { IncomingCallPanel } from "@/components/common/organisms/IncomingCallPanel";
import { useCallsStore } from "@/stores/calls.store";

export function IncomingCallOverlay() {
  const incoming = useCallsStore((state) => state.incoming);
  const minimized = useCallsStore((state) => state.minimized);
  const clearIncoming = useCallsStore((state) => state.clearIncoming);
  const minimizeIncoming = useCallsStore((state) => state.minimizeIncoming);

  const showing = Boolean(incoming) && !minimized;

  // The overlay is not a route, so hardware back would otherwise pop the
  // screen UNDER the ring. While it shows, back means "minimise" instead.
  useEffect(() => {
    if (!showing) return undefined;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      minimizeIncoming();
      return true;
    });
    return () => subscription.remove();
  }, [showing, minimizeIncoming]);

  if (!incoming || minimized) return null;

  return (
    <Box
      // `absoluteFill` by hand rather than StyleSheet.absoluteFill: this file
      // may not reach for a bare RN primitive, and four numbers are clearer
      // than an import anyway. The zIndex is what puts it over the tab bar,
      // which on Android is a native view.
      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000 }}
      accessibilityViewIsModal
      accessibilityLabel="Incoming call"
    >
      <IncomingCallPanel
        threadId={incoming.threadId}
        callId={incoming.callId}
        onAccepted={(callId) => {
          // Clear FIRST, so the overlay is gone before the call screen mounts
          // and there is never a frame with both on screen.
          clearIncoming();
          router.push({
            pathname: "/call/[id]",
            params: callId
              ? { id: incoming.threadId, answered: "1", callId }
              : { id: incoming.threadId, answered: "1" },
          });
        }}
        onDismissed={clearIncoming}
        onMinimize={minimizeIncoming}
      />
    </Box>
  );
}
