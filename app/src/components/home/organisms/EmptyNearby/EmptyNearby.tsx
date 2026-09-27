/**
 * Nobody nearby.
 *
 * Two ways forward, as the design specifies: widen the net, or try the same
 * search again. They are genuinely different actions — "adjust filters" changes
 * the question, "try again" re-asks it — and an empty state with only one of
 * them leaves the user guessing which kind of nothing this is.
 *
 * No header here: the design gives this state the whole screen.
 */

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Heading } from "@/components/common/atoms/Heading";
import { Picture } from "@/components/common/atoms/Picture";
import { useTheme } from "@/components/common/hooks/useTheme";
import { Button } from "@/components/common/molecules/Button";
import { copy } from "@/copy";

const NO_ONE = require("@/assets/images/illustrations/no-one-nearby.png");

export type EmptyNearbyProps = {
  onAdjustFilters: () => void;
  onRetry: () => void;
};

export function EmptyNearby({ onAdjustFilters, onRetry }: EmptyNearbyProps) {
  const theme = useTheme();

  return (
    <Box style={{ flex: 1, justifyContent: "center", paddingHorizontal: theme.spacing.xl }}>
      <Picture
        source={NO_ONE}
        contentFit="contain"
        style={{ width: "100%", height: 260 }}
        accessibilityLabel="Someone looking through binoculars"
      />

      <Heading
        level="heading"
        style={{ textAlign: "center", marginTop: theme.spacing.lg }}
      >
        {copy.home.emptyTitle}
      </Heading>

      <Body
        color="textSecondary"
        style={{
          textAlign: "center",
          marginTop: theme.spacing.sm,
          fontSize: 16,
          lineHeight: 24,
        }}
      >
        {copy.home.emptyBody}
      </Body>

      <Box style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xl }}>
        <Button label={copy.home.emptyCta} onPress={onAdjustFilters} />
        <Button label={copy.home.emptyRetry} onPress={onRetry} variant="secondary" />
      </Box>
    </Box>
  );
}
