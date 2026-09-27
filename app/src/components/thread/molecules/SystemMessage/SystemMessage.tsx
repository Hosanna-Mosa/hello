/**
 * Something that happened, rather than something someone said.
 *
 * Only one thing writes here in v1: "Voice call · 2:14" when a mocked call
 * ends (A17). It is centred and unstyled by sender because it has no sender —
 * putting it in a bubble would claim one of you typed it.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Icon } from "@/components/common/atoms/Icon";
import { useTheme } from "@/components/common/hooks/useTheme";

export type SystemMessageProps = {
  body: string;
};

export function SystemMessage({ body }: SystemMessageProps) {
  const theme = useTheme();

  return (
    <Box
      accessibilityRole="text"
      accessibilityLabel={body}
      style={{
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.color.surfaceSunken,
      }}
    >
      <Icon name={{ ios: "phone", android: "call" }} size={14} color="textSecondary" />
      <Caption color="textSecondary">{body}</Caption>
    </Box>
  );
}
