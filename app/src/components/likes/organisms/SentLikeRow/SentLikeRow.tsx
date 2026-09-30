/**
 * One person you liked, on the "You liked" screen.
 *
 * The status line says where it stands — connected, request sent, or a plain
 * like — so the list answers "did they get back to me?" without opening each
 * profile. It never says "declined": a sender is not told (A18), so a declined
 * request keeps reading "Request sent".
 *
 * Plain props, so the row renders in a test without the service layer.
 */

import { Avatar, type AvatarSource } from "@/components/common/atoms/Avatar";
import { Caption } from "@/components/common/atoms/Caption";
import { Icon } from "@/components/common/atoms/Icon";
import { ListRow } from "@/components/common/molecules/ListRow";
import { Box } from "@/components/common/atoms/Box";
import { useTheme } from "@/components/common/hooks/useTheme";

export type SentLikeStatus = "matched" | "requested" | "liked";

export type SentLikeRowProps = {
  name: string;
  age: number;
  source?: AvatarSource;
  /** Already worded — the screen owns the copy. */
  statusLabel: string;
  status: SentLikeStatus;
  /** Already formatted, e.g. "2h". */
  when: string;
  onPress: () => void;
};

export function SentLikeRow({ name, age, source, statusLabel, status, when, onPress }: SentLikeRowProps) {
  const theme = useTheme();

  return (
    <ListRow
      title={`${name}, ${age}`}
      subtitle={statusLabel}
      onPress={onPress}
      leading={<Avatar source={source} name={name} />}
      trailing={
        <Box style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
          {status === "matched" ? (
            <Icon name={{ ios: "bubble.left.fill", android: "chat" }} size={16} color="accent" />
          ) : null}
          <Caption>{when}</Caption>
          <Icon name={{ ios: "chevron.right", android: "chevron_right" }} size={16} color="textTertiary" />
        </Box>
      }
    />
  );
}
