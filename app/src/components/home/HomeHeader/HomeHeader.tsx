/**
 * The Home header: search, likes, filters.
 *
 * These three are header entries rather than tabs by product decision
 * (PLAN §1) — there are four tabs and only four. The likes entry carries the
 * inbound count, which is the main reason anyone taps it.
 */

import { Box } from "@/components/common/atoms/Box";
import { Icon } from "@/components/common/atoms/Icon";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { CountBadge } from "@/components/common/molecules/CountBadge";

export type HomeHeaderProps = {
  likeCount: number;
  onSearchPress: () => void;
  onLikesPress: () => void;
  onFiltersPress: () => void;
};

export function HomeHeader({
  likeCount,
  onSearchPress,
  onLikesPress,
  onFiltersPress,
}: HomeHeaderProps) {
  const theme = useTheme();

  return (
    <Box style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
      <Tappable
        onPress={onSearchPress}
        accessibilityRole="button"
        accessibilityLabel="Search"
        hitSlop={8}
        style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Icon name={{ ios: "magnifyingglass", android: "search" }} />
      </Tappable>

      <CountBadge
        count={likeCount}
        icon={{ ios: "heart", android: "favorite" }}
        label="Likes you"
        onPress={onLikesPress}
      />

      <Tappable
        onPress={onFiltersPress}
        accessibilityRole="button"
        accessibilityLabel="Filters"
        hitSlop={8}
        style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Icon name={{ ios: "slider.horizontal.3", android: "tune" }} />
      </Tappable>
    </Box>
  );
}
