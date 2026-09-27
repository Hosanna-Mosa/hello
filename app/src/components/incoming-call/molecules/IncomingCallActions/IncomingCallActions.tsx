/**
 * Accept and decline, on an incoming call.
 *
 * Wide apart on purpose. These two buttons are pressed by someone who has just
 * picked the phone up and is not looking carefully, and they are the one pair
 * in the app where hitting the wrong one is genuinely annoying.
 *
 * Green accepts, red declines — the one place this product borrows a
 * convention wholesale, because every phone on earth already taught it.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Icon, type IconName } from "@/components/common/atoms/Icon";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";
import { dark } from "@/theme";

const SIZE = 72;

export type IncomingCallActionsProps = {
  onAccept: () => void;
  onDecline: () => void;
};

export function IncomingCallActions({ onAccept, onDecline }: IncomingCallActionsProps) {
  const theme = useTheme();

  function action(label: string, icon: IconName, background: string, onPress: () => void) {
    return (
      <Box style={{ alignItems: "center", gap: theme.spacing.sm }}>
        <Tappable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: theme.radius.pill,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: background,
          }}
        >
          <Icon name={icon} size={30} color="textInverse" />
        </Tappable>

        <Caption style={{ color: dark.color.textSecondary }}>{label}</Caption>
      </Box>
    );
  }

  return (
    <Box
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        paddingHorizontal: theme.spacing.xxxl,
      }}
    >
      {action(
        copy.calls.decline,
        { ios: "phone.down.fill", android: "call_end" },
        theme.color.danger,
        onDecline,
      )}
      {action(
        copy.calls.accept,
        { ios: "phone.fill", android: "call" },
        theme.color.success,
        onAccept,
      )}
    </Box>
  );
}
