/**
 * One support ticket in the list.
 *
 * Built on `ListRow`, like a conversation row, so the two lists share their
 * metrics. The icon says what the ticket is about; the subtitle is the last
 * thing said and who said it; on the right, when, whether there is a reply you
 * have not read, and the status — so "action needed" is visible without
 * opening anything.
 */

import { Badge } from "@/components/common/atoms/Badge";
import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Icon, type IconName } from "@/components/common/atoms/Icon";
import { useTheme } from "@/components/common/hooks/useTheme";
import { ListRow } from "@/components/common/molecules/ListRow";
import { SupportStatusPill } from "@/components/common/molecules/SupportStatusPill";
import { formatRelativeTime } from "@/components/common/utils/formatRelativeTime";
import { copy } from "@/copy";
import type { SupportCategory, SupportTicket } from "@/services/types";

const CATEGORY_ICON: Record<SupportCategory, IconName> = {
  account: { ios: "person.crop.circle", android: "account_circle" },
  technical: { ios: "wrench.and.screwdriver", android: "build" },
  safety: { ios: "checkmark.shield", android: "verified_user" },
  billing: { ios: "creditcard", android: "credit_card" },
  feedback: { ios: "lightbulb", android: "lightbulb" },
  other: { ios: "questionmark.circle", android: "help" },
};

export type TicketRowProps = {
  ticket: SupportTicket;
  onPress: () => void;
};

function previewOf(ticket: SupportTicket): string {
  const text = ticket.lastMessagePreview;
  if (ticket.lastMessageAuthor === "user") return copy.support.previewYou(text);
  if (ticket.lastMessageAuthor === "admin") return copy.support.previewSupport(text);
  return text;
}

export function TicketRow({ ticket, onPress }: TicketRowProps) {
  const theme = useTheme();
  const unread = ticket.unreadCount > 0;

  return (
    <ListRow
      title={ticket.subject}
      subtitle={previewOf(ticket)}
      onPress={onPress}
      muted={ticket.status === "resolved"}
      leading={
        <Box
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radius.pill,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.color.accentMuted,
          }}
        >
          <Icon name={CATEGORY_ICON[ticket.category]} size={22} color="accent" />
        </Box>
      }
      trailing={
        <Box style={{ alignItems: "flex-end", gap: theme.spacing.xs }}>
          <Box style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
            <Caption color={unread ? "accent" : "textTertiary"}>
              {formatRelativeTime(new Date(ticket.lastMessageAt).getTime())}
            </Caption>
            <Badge count={ticket.unreadCount} dot />
          </Box>
          <SupportStatusPill status={ticket.status} />
        </Box>
      }
    />
  );
}
