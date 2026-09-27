/**
 * Pass · Like · Note.
 *
 * Three buttons, matching the design. The like button is filled so the primary
 * action is obvious, but pass is the same size — making "no" harder to hit than
 * "yes" is a dark pattern, and this product has no undo.
 *
 * Every button is 64pt, well over the 44pt minimum (A10), because they sit at
 * the bottom of the screen under a moving thumb.
 */

import { Box } from "@/components/common/atoms/Box";
import { Icon, type IconName } from "@/components/common/atoms/Icon";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import type { ColorTokens } from "@/theme";

const SIZE = 64;

export type DeckActionsProps = {
  onPass: () => void;
  onLike: () => void;
  onNote: () => void;
  disabled?: boolean;
};

export function DeckActions({ onPass, onLike, onNote, disabled = false }: DeckActionsProps) {
  const theme = useTheme();

  function button(
    label: string,
    icon: IconName,
    onPress: () => void,
    filled: boolean,
    iconColor: keyof ColorTokens,
  ) {
    return (
      <Tappable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: theme.radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: filled ? theme.color.accent : theme.color.surface,
          opacity: disabled ? 0.4 : 1,
          ...theme.shadow.md,
        }}
      >
        <Icon name={icon} size={28} color={iconColor} />
      </Tappable>
    );
  }

  return (
    <Box
      style={{
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: theme.spacing.xl,
        paddingVertical: theme.spacing.lg,
      }}
    >
      {button("Pass", { ios: "xmark", android: "close" }, onPass, false, "textPrimary")}
      {button("Like", { ios: "heart.fill", android: "favorite" }, onLike, true, "onAccent")}
      {button(
        "Send a note",
        { ios: "bubble.left", android: "chat_bubble" },
        onNote,
        false,
        "textPrimary",
      )}
    </Box>
  );
}
