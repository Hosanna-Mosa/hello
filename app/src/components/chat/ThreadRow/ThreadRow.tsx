/**
 * One conversation in the list.
 *
 * Built on `ListRow` so a chat row, a blocked-person row and a notification row
 * share their metrics — 64pt minimum, the same avatar gutter, the same
 * truncation. What is chat-specific lives in `trailing`: the time, the unread
 * dot, and a muted bell.
 *
 * The dot is a dot, not a count. A number belongs on the tab bar, where it is
 * the only thing telling you to look; once you are in the list the row itself
 * is the signal and a numeral just adds noise.
 */

import { Avatar } from "@/components/common/atoms/Avatar";
import { Badge } from "@/components/common/atoms/Badge";
import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Icon } from "@/components/common/atoms/Icon";
import { useTheme } from "@/components/common/hooks/useTheme";
import { ListRow } from "@/components/common/molecules/ListRow";
import { formatRelativeTime } from "@/components/common/utils/formatRelativeTime";

export type ThreadRowProps = {
  name: string;
  /** The last message, whoever sent it. */
  snippet: string;
  /** Epoch milliseconds. */
  lastMessageAt: number;
  unreadCount: number;
  muted?: boolean;
  onPress: () => void;
};

export function ThreadRow({
  name,
  snippet,
  lastMessageAt,
  unreadCount,
  muted = false,
  onPress,
}: ThreadRowProps) {
  const theme = useTheme();
  const time = formatRelativeTime(lastMessageAt);

  return (
    <ListRow
      title={name}
      subtitle={snippet}
      onPress={onPress}
      leading={<Avatar name={name} size="md" />}
      trailing={
        <Box style={{ alignItems: "flex-end", gap: theme.spacing.xs, minWidth: 48 }}>
          <Caption color={unreadCount > 0 ? "accent" : "textTertiary"}>{time}</Caption>

          <Box style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
            {muted ? (
              <Icon
                name={{ ios: "bell.slash", android: "notifications_off" }}
                size={14}
                color="textTertiary"
              />
            ) : null}
            <Badge count={unreadCount} dot />
          </Box>
        </Box>
      }
    />
  );
}
