/**
 * A message this device sent that the server has not confirmed yet.
 *
 * Dimmed while in flight. If the send failed it says so underneath, with retry
 * and delete — it is never dropped on its own. The server's copy replaces this
 * row the moment it arrives, by `clientMessageId`.
 */

import { Box } from "@/components/common/atoms/Box";
import { useTheme } from "@/components/common/hooks/useTheme";
import { ChatBubble } from "@/components/common/molecules/ChatBubble";
import { formatClockTime } from "@/components/common/utils/formatMessageTime";
import { FailedSendActions } from "@/components/support/ticket/molecules/FailedSendActions";
import type { PendingSend } from "@/stores/support.store";

export type PendingMessageProps = {
  pending: PendingSend;
  onRetry: () => void;
  onDiscard: () => void;
};

export function PendingMessage({ pending, onRetry, onDiscard }: PendingMessageProps) {
  const theme = useTheme();

  return (
    <Box style={{ gap: theme.spacing.xs }}>
      <ChatBubble body={pending.body} mine pending timestamp={formatClockTime(new Date(pending.createdAt).getTime())} />
      {pending.failed ? <FailedSendActions onRetry={onRetry} onDiscard={onDiscard} /> : null}
    </Box>
  );
}
