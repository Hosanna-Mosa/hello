/**
 * Matches and likes, side by side with a divider.
 *
 * The design's row reads "24 Friends · 56 Likes · 8 Connections". This product
 * has no "friends" and no "connections" — both would be the match count under
 * a different name — so the row carries the two figures that are real and
 * countable. Three invented numbers in a client demo is the kind of detail
 * someone asks about.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Heading } from "@/components/common/atoms/Heading";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";

export type ProfileStatsProps = {
  matches: number;
  likes: number;
  onMatchesPress?: () => void;
  onLikesPress?: () => void;
};

export function ProfileStats({
  matches,
  likes,
  onMatchesPress,
  onLikesPress,
}: ProfileStatsProps) {
  const theme = useTheme();

  function stat(value: number, label: string, onPress?: () => void) {
    return (
      <Tappable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={`${value} ${label}`}
        style={{ flex: 1, alignItems: "center", gap: theme.spacing.xxs }}
      >
        <Heading level="title">{String(value)}</Heading>
        <Caption>{label}</Caption>
      </Tappable>
    );
  }

  return (
    <Box
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: theme.spacing.lg,
      }}
    >
      {stat(matches, copy.profile.statMatches, onMatchesPress)}

      <Box style={{ width: 1, height: 32, backgroundColor: theme.color.divider }} />

      {stat(likes, copy.profile.statLikes, onLikesPress)}
    </Box>
  );
}
