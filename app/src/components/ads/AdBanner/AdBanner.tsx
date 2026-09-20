/**
 * The standard 320×50 banner, for the Home nearby list.
 *
 * Fixed at the IAB standard size rather than something that looks nicer: the
 * point of a placeholder is to reserve the space a real ad will take, and a
 * slot that is the wrong size reserves the wrong hole.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { useTheme } from "@/components/common/hooks/useTheme";
import { AdSlot } from "@/components/ads/AdSlot";

/** IAB "mobile leaderboard". */
const WIDTH = 320;
const HEIGHT = 50;

export function AdBanner() {
  const theme = useTheme();

  return (
    <AdSlot>
      <Box
        style={{
          width: WIDTH,
          height: HEIGHT,
          alignSelf: "center",
          alignItems: "center",
          justifyContent: "center",
          marginTop: theme.spacing.sm,
        }}
      >
        <Caption color="textTertiary">{`${WIDTH} × ${HEIGHT}`}</Caption>
      </Box>
    </AdSlot>
  );
}
