/**
 * A support ticket's status, as a coloured dot and a word.
 *
 * Shared by the ticket list and the ticket's own header, so a status reads the
 * same in both places. The colour carries the urgency — "action needed" is the
 * one that asks the user to do something — but the word always says it too,
 * because colour alone is not an accessible signal.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";
import type { SupportTicketStatus } from "@/services/types";
import type { ColorTokens } from "@/theme";

export type SupportStatusPillProps = {
  status: SupportTicketStatus;
  /** The long label ("Awaiting your confirmation") rather than the short one. */
  long?: boolean;
};

const TONE: Record<SupportTicketStatus, keyof ColorTokens> = {
  open: "info",
  pendingResolution: "warning",
  resolved: "success",
};

export function SupportStatusPill({ status, long = false }: SupportStatusPillProps) {
  const theme = useTheme();
  const label = long ? copy.support.status[status] : copy.support.statusShort[status];
  const tone = TONE[status];

  return (
    <Box
      accessible
      accessibilityLabel={copy.support.status[status]}
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xxs,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.color.surfaceSunken,
      }}
    >
      <Box style={{ width: 8, height: 8, borderRadius: theme.radius.pill, backgroundColor: theme.color[tone] }} />
      <Caption color={tone}>{label}</Caption>
    </Box>
  );
}
