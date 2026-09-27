/**
 * A list-row-shaped slot for the conversation list.
 *
 * Sized to match `ThreadRow` so it sits in the list without breaking its
 * rhythm — same 64pt minimum, same horizontal gutter. It does not pretend to
 * be a conversation: no avatar circle, no name, no unread dot, because an ad
 * dressed as a message is the one pattern that reliably makes people distrust
 * an inbox.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { useTheme } from "@/components/common/hooks/useTheme";
import { AdSlot } from "@/components/common/molecules/AdSlot";

export function AdRow() {
  const theme = useTheme();

  return (
    <Box style={{ paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.sm }}>
      <AdSlot>
        <Box
          style={{
            minHeight: 64,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.sm,
          }}
        >
          <Caption color="textTertiary">
            {"Sponsored placeholder — no ad network is wired up."}
          </Caption>
        </Box>
      </AdSlot>
    </Box>
  );
}
