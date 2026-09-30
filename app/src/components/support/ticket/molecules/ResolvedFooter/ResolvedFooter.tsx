/**
 * Where the composer was, once a ticket is resolved.
 *
 * A resolved ticket is closed for good — the history stays readable, but a
 * new problem is a new ticket, and this says so and offers the way there
 * rather than leaving a dead field.
 */

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { useBottomInset } from "@/components/common/hooks/useBottomInset";
import { useTheme } from "@/components/common/hooks/useTheme";
import { Button } from "@/components/common/molecules/Button";
import { copy } from "@/copy";

export type ResolvedFooterProps = {
  onNewTicket: () => void;
};

export function ResolvedFooter({ onNewTicket }: ResolvedFooterProps) {
  const theme = useTheme();
  const bottomInset = useBottomInset();

  return (
    <Box
      accessibilityLiveRegion="polite"
      style={{
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
        // Same reason as the composer: the bar reaches the screen edge, the
        // content sits above the gesture bar.
        paddingBottom: theme.spacing.lg + bottomInset,
        borderTopWidth: 1,
        borderTopColor: theme.color.divider,
        backgroundColor: theme.color.surfaceSunken,
      }}
    >
      <Body color="textSecondary" style={{ textAlign: "center" }}>
        {copy.support.resolvedFooter}
      </Body>
      <Button label={copy.support.openNewTicket} onPress={onNewTicket} variant="secondary" />
    </Box>
  );
}
