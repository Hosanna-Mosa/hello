/**
 * A full-bleed card injected into the deck, shaped like a profile card.
 *
 * Deliberately the same size and radius as `SwipeCard`: an ad that is a
 * different shape makes the deck stutter as you swipe past it, and the whole
 * reason to place it in the stack rather than over it is that it should feel
 * like one more card you can dismiss.
 *
 * `AD_EVERY` is the tuning knob PLAN asks for — one constant, one place.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Heading } from "@/components/common/atoms/Heading";
import { useTheme } from "@/components/common/hooks/useTheme";
import { AdSlot } from "@/components/common/molecules/AdSlot";

/** One ad card every N profiles in the deck. Tunable from here and nowhere else. */
export const AD_EVERY = 10;

export function AdCard() {
  const theme = useTheme();

  return (
    <AdSlot>
      <Box
        style={{
          flex: 1,
          minHeight: 420,
          alignItems: "center",
          justifyContent: "center",
          gap: theme.spacing.sm,
          padding: theme.spacing.xl,
        }}
      >
        <Heading level="title" style={{ textAlign: "center" }}>
          {`${AD_EVERY} profiles, one ad`}
        </Heading>
        <Caption color="textSecondary" style={{ textAlign: "center" }}>
          {"This slot is a placeholder. No ad network is wired up."}
        </Caption>
      </Box>
    </AdSlot>
  );
}
