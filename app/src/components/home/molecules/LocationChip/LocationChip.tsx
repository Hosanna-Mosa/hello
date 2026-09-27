/**
 * The city the grid is centred on.
 *
 * Reads as a control because it is one — tapping it opens the filters, where
 * distance and location actually live. A chevron that did nothing would be
 * worse than no chevron.
 *
 * Falls back to "Nearby" when no city is known, which is the honest label when
 * the user declined location and never typed one (A12).
 */

import { Body } from "@/components/common/atoms/Body";
import { Icon } from "@/components/common/atoms/Icon";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export type LocationChipProps = {
  city?: string;
  onPress: () => void;
};

export function LocationChip({ city, onPress }: LocationChipProps) {
  const theme = useTheme();

  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={city ? `Location, ${city}` : "Set your location"}
      hitSlop={8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
        minHeight: 44,
        alignSelf: "flex-start",
      }}
    >
      <Icon name={{ ios: "mappin.and.ellipse", android: "location_on" }} size={18} color="accent" />
      <Body strong numberOfLines={1}>
        {city ?? "Nearby"}
      </Body>
      <Icon name={{ ios: "chevron.down", android: "expand_more" }} size={14} color="textSecondary" />
    </Tappable>
  );
}
