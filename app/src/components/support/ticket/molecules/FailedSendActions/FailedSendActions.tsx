/**
 * Under a message that did not send: say so, and offer retry or delete.
 *
 * A failed support message is never dropped silently — it stays in the
 * conversation, dimmed, until the person retries or removes it. Retrying
 * reuses the message's `clientMessageId`, so a send that actually landed is
 * not stored twice.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Icon } from "@/components/common/atoms/Icon";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";

export type FailedSendActionsProps = {
  onRetry: () => void;
  onDiscard: () => void;
};

export function FailedSendActions({ onRetry, onDiscard }: FailedSendActionsProps) {
  const theme = useTheme();

  return (
    <Box
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-end",
        gap: theme.spacing.md,
        marginTop: -theme.spacing.xs,
      }}
    >
      <Box style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xxs }}>
        <Icon name={{ ios: "exclamationmark.circle", android: "error" }} size={14} color="danger" />
        <Caption color="danger">{copy.support.sendFailed}</Caption>
      </Box>
      <Tappable onPress={onRetry} accessibilityRole="button" accessibilityLabel={copy.support.retry} hitSlop={8}>
        <Caption color="accent">{copy.support.retry}</Caption>
      </Tappable>
      <Tappable onPress={onDiscard} accessibilityRole="button" accessibilityLabel={copy.support.discard} hitSlop={8}>
        <Caption color="textSecondary">{copy.support.discard}</Caption>
      </Tappable>
    </Box>
  );
}
