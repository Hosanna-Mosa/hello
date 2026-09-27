/**
 * The two controls in the thread's top-right: call, and the overflow menu.
 *
 * The call button is hidden rather than disabled on an inactive thread —
 * unmatched or blocked — because a greyed phone icon reads as a bug, not as a
 * closed door. The menu stays, since report and block must remain reachable
 * exactly when the thread has gone wrong.
 */

import { Box } from "@/components/common/atoms/Box";
import { Icon } from "@/components/common/atoms/Icon";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export type ThreadActionsProps = {
  /** False on an unmatched or blocked thread, which hides the call button. */
  canCall: boolean;
  /** Announced as "Call <name>". */
  callLabel: string;
  onCall: () => void;
  onOpenMenu: () => void;
};

export function ThreadActions({ canCall, callLabel, onCall, onOpenMenu }: ThreadActionsProps) {
  const theme = useTheme();

  return (
    <Box style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
      {canCall ? (
        <Tappable
          onPress={onCall}
          accessibilityRole="button"
          accessibilityLabel={callLabel}
          hitSlop={12}
        >
          <Icon name={{ ios: "phone", android: "call" }} size={22} />
        </Tappable>
      ) : null}

      <Tappable
        onPress={onOpenMenu}
        accessibilityRole="button"
        accessibilityLabel="More options"
        hitSlop={12}
      >
        <Icon name={{ ios: "ellipsis", android: "more_horiz" }} size={22} />
      </Tappable>
    </Box>
  );
}
