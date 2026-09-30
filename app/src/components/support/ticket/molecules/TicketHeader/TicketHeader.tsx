/**
 * The conversation's header: what the ticket is about, and where it stands.
 *
 * The status sits under the subject in its long form ("Awaiting your
 * confirmation") because this is the one place there is room to say it fully.
 */

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { useTheme } from "@/components/common/hooks/useTheme";
import { SupportStatusPill } from "@/components/common/molecules/SupportStatusPill";
import type { SupportTicketStatus } from "@/services/types";

export type TicketHeaderProps = {
  subject: string;
  status: SupportTicketStatus | null;
};

export function TicketHeader({ subject, status }: TicketHeaderProps) {
  const theme = useTheme();

  return (
    <Box accessibilityRole="header" style={{ gap: theme.spacing.xxs }}>
      <Body strong numberOfLines={1}>
        {subject}
      </Body>
      {status ? <SupportStatusPill status={status} long /> : null}
    </Box>
  );
}
