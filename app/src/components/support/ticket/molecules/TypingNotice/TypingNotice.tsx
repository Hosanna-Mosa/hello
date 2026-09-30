/** "Support is typing…" — shown at the foot of the conversation while an operator writes. */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Icon } from "@/components/common/atoms/Icon";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";

export function TypingNotice() {
  const theme = useTheme();

  return (
    <Box
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.color.surface,
        borderWidth: 1,
        borderColor: theme.color.border,
      }}
    >
      <Icon name={{ ios: "ellipsis.bubble", android: "more_horiz" }} size={14} color="textSecondary" />
      <Caption color="textSecondary">{copy.support.typing}</Caption>
    </Box>
  );
}
