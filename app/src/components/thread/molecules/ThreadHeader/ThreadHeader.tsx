/**
 * The thread's title area: avatar and name.
 *
 * The whole block is the tap target for the in-chat profile peek — there is no
 * separate "view profile" button, because the header is the only thing at the
 * top of a thread anyone thinks to tap.
 *
 * `onPress` is optional: until the partner has loaded there is nowhere to
 * navigate to, and a disabled target is better than one that silently does
 * nothing.
 */

import { Avatar, type AvatarSource } from "@/components/common/atoms/Avatar";
import { Box } from "@/components/common/atoms/Box";
import { Heading } from "@/components/common/atoms/Heading";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export type ThreadHeaderProps = {
  name: string;
  /** The chosen preset avatar. Falls back to the initial when absent. */
  source?: AvatarSource;
  /** Absent while the partner is still loading. */
  onPress?: () => void;
};

export function ThreadHeader({ name, source, onPress }: ThreadHeaderProps) {
  const theme = useTheme();

  return (
    <Box style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
      {/* In-chat profile peek — the header is the way into it. */}
      <Tappable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={`${name}. View profile.`}
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
        }}
      >
        <Avatar source={source} name={name} size="sm" />
        <Box style={{ flex: 1 }}>
          <Heading level="title" numberOfLines={1}>
            {name}
          </Heading>
        </Box>
      </Tappable>
    </Box>
  );
}
