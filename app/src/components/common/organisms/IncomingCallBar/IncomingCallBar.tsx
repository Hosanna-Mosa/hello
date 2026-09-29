/**
 * "Someone is calling — tap to answer", pinned to the top of every screen.
 *
 * The ringing twin of `ActiveCallBar`. Backing out of the ring (chevron or
 * hardware back) minimises it rather than declining it, and this strip is the
 * way back: tapping it restores the full ring, with Accept and Decline.
 *
 * Mounted once in `_layout.tsx`, beside `ActiveCallBar` and ABOVE the navigator,
 * so it pushes screens down instead of covering their headers. It draws the
 * status-bar inset itself — unless `ActiveCallBar` is showing above it and has
 * already drawn it.
 *
 * Imported by path, never through the `common` barrel: it reads the route
 * (see the barrel's INVARIANT).
 */

import { usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Icon } from "@/components/common/atoms/Icon";
import { Label } from "@/components/common/atoms/Label";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useCallPeer } from "@/components/common/hooks/useCallPeer";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";
import { useActiveCallStore } from "@/stores/activeCall.store";
import { useCallsStore } from "@/stores/calls.store";

export function IncomingCallBar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const incoming = useCallsStore((state) => state.incoming);
  const minimized = useCallsStore((state) => state.minimized);
  const restoreIncoming = useCallsStore((state) => state.restoreIncoming);
  const active = useActiveCallStore((state) => state.active);

  const peer = useCallPeer(incoming?.threadId);

  if (!incoming || !minimized) return null;

  // Mirrors `ActiveCallBar`'s own visibility rule.
  const activeBarShown = Boolean(active) && !pathname.startsWith("/call/");
  const label = copy.calls.barIncoming(peer.name);

  return (
    <Tappable
      onPress={restoreIncoming}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${copy.calls.barAnswer}`}
      style={{
        backgroundColor: theme.color.success,
        paddingTop: (activeBarShown ? 0 : insets.top) + theme.spacing.xs,
        paddingBottom: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
      }}
    >
      <Box style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, minHeight: 32 }}>
        <Icon name={{ ios: "phone.arrow.down.left.fill", android: "phone_callback" }} size={18} color="textInverse" />
        <Box style={{ flex: 1 }}>
          <Label numberOfLines={1} color="textInverse">
            {label}
          </Label>
          <Caption numberOfLines={1} color="textInverse">
            {copy.calls.barAnswer}
          </Caption>
        </Box>
      </Box>
    </Tappable>
  );
}
