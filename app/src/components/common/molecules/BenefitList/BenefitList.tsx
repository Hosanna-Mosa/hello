/**
 * What premium actually changes, as four lines.
 *
 * Benefit-led rather than feature-led, and in the order they are felt: the ads
 * go first because that is the thing people are looking at when they open this
 * sheet from an ad slot.
 */

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Icon } from "@/components/common/atoms/Icon";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";

const BENEFITS = [
  copy.premium.benefitNoAds,
  copy.premium.benefitLikes,
  copy.premium.benefitUnlimited,
  copy.premium.benefitFilters,
];

export function BenefitList() {
  const theme = useTheme();

  return (
    <Box style={{ gap: theme.spacing.md }}>
      {BENEFITS.map((benefit) => (
        <Box
          key={benefit}
          style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}
        >
          <Icon
            name={{ ios: "checkmark.circle.fill", android: "check_circle" }}
            size={22}
            color="secondary"
          />
          <Body style={{ flex: 1 }}>{benefit}</Body>
        </Box>
      ))}
    </Box>
  );
}
