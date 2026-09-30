/**
 * "Support team", above the first of a run of support's replies.
 *
 * In a friend's conversation the sides are obvious. In a support ticket the
 * other side is an organisation, and saying so once per run makes it plain who
 * is answering without labelling every bubble.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Icon } from "@/components/common/atoms/Icon";
import { useTheme } from "@/components/common/hooks/useTheme";

export type SenderLabelProps = {
  label: string;
};

export function SenderLabel({ label }: SenderLabelProps) {
  const theme = useTheme();

  return (
    <Box
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
        marginTop: theme.spacing.sm,
        paddingLeft: theme.spacing.xs,
      }}
    >
      <Icon name={{ ios: "person.badge.shield.checkmark", android: "support_agent" }} size={14} color="accent" />
      <Caption color="accent">{label}</Caption>
    </Box>
  );
}
