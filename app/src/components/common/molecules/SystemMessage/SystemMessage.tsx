/**
 * Something that happened, rather than something someone said.
 *
 * In a conversation: "Voice call · 2:14" when a call ends (A17). In a support
 * ticket: a status change — support asked to resolve, the user confirmed or
 * said not yet. It is centred and unstyled by sender because it has no sender —
 * putting it in a bubble would claim one of you typed it.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Icon, type IconName } from "@/components/common/atoms/Icon";
import { useTheme } from "@/components/common/hooks/useTheme";

export type SystemMessageProps = {
  body: string;
  /** Defaults to a phone — the call record is the original, and commonest, use. */
  icon?: IconName;
};

const PHONE: IconName = { ios: "phone", android: "call" };

export function SystemMessage({ body, icon = PHONE }: SystemMessageProps) {
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
        maxWidth: "90%",
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.color.surfaceSunken,
      }}
    >
      <Icon name={icon} size={14} color="textSecondary" />
      <Caption color="textSecondary" style={{ flexShrink: 1, textAlign: "center" }}>
        {body}
      </Caption>
    </Box>
  );
}
