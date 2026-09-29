/**
 * "You are on a call — tap to return", pinned to the top of every screen.
 *
 * A call outlives its screen now (`activeCall.store`), so leaving the call —
 * hardware back, or opening a chat to send something mid-call — needs a way
 * back that does not depend on remembering where the call went. This is it.
 *
 * Mounted once in `_layout.tsx`, ABOVE the navigator rather than over it, so it
 * pushes every screen down instead of covering its header. It draws the status
 * bar inset itself; the screens below then start under it, and their own
 * `SafeArea` measures no top inset left to pad — so nothing doubles.
 *
 * Hidden on the call screen itself, and when there is no call.
 *
 * Imported by path, never through the `common` barrel: it reads the route
 * (see the barrel's INVARIANT).
 */

import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Icon } from "@/components/common/atoms/Icon";
import { Label } from "@/components/common/atoms/Label";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useCallTimer } from "@/components/common/hooks/useCallTimer";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";
import { useActiveCallStore } from "@/stores/activeCall.store";

export function ActiveCallBar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const active = useActiveCallStore((state) => state.active);

  const timer = useCallTimer(active?.phase === "connected" ? active.connectedAt : null);

  if (!active || pathname.startsWith("/call/")) return null;

  const status =
    active.phase === "ringing"
      ? copy.calls.ringing
      : active.phase === "connecting"
        ? copy.calls.connecting
        : active.phase === "connected"
          ? timer.formatted
          : copy.calls.ended;

  return (
    <Tappable
      onPress={() =>
        router.push({ pathname: "/call/[id]", params: { id: active.threadId } })
      }
      accessibilityRole="button"
      accessibilityLabel={`${copy.calls.barOngoing(active.name, status)}. ${copy.calls.barReturn}`}
      style={{
        backgroundColor: theme.color.secondary,
        paddingTop: insets.top + theme.spacing.xs,
        paddingBottom: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
      }}
    >
      <Box style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, minHeight: 32 }}>
        <Icon
          name={{ ios: "phone.fill", android: "call" }}
          size={18}
          color="onSecondary"
        />
        <Box style={{ flex: 1 }}>
          <Label numberOfLines={1} color="onSecondary">
            {copy.calls.barOngoing(active.name, status)}
          </Label>
          <Caption numberOfLines={1} color="onSecondary">
            {copy.calls.barReturn}
          </Caption>
        </Box>
      </Box>
    </Tappable>
  );
}
