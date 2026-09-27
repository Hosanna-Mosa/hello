/**
 * The "are you sure" gate.
 *
 * Every irreversible action in this product goes through here: unmatch, block,
 * report, log out, delete account. When `destructive` is set the confirm button
 * turns red and the consequence line is mandatory — PLAN requires unmatch to
 * say "this can't be undone" in as many words, and a dialog that only asks
 * "are you sure?" has not told the user what they are agreeing to.
 *
 * Cancel is placed second and styled quietly, but it is what the hardware back
 * button and a backdrop tap both resolve to.
 */

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Heading } from "@/components/common/atoms/Heading";
import { Sheet } from "@/components/common/atoms/Sheet";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { Button } from "@/components/common/molecules/Button";

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  /** What will actually happen. Required when `destructive`. */
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useTheme();

  return (
    <Sheet
      visible={visible}
      animationType="fade"
      // Android hardware back must cancel, never confirm.
      onRequestClose={onCancel}
    >
      <Tappable
        onPress={onCancel}
        accessibilityLabel={cancelLabel}
        style={{
          flex: 1,
          backgroundColor: theme.color.overlay,
          alignItems: "center",
          justifyContent: "center",
          padding: theme.spacing.xl,
        }}
      >
        {/* Swallow taps inside the card so it does not dismiss itself. */}
        <Tappable
          onPress={() => {}}
          accessibilityViewIsModal
          style={{
            width: "100%",
            maxWidth: 340,
            gap: theme.spacing.md,
            padding: theme.spacing.xl,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.color.surfaceElevated,
            ...theme.shadow.lg,
          }}
        >
          <Heading level="title">{title}</Heading>
          <Body color="textSecondary">{message}</Body>

          <Box style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              variant={destructive ? "destructive" : "primary"}
            />
            <Button label={cancelLabel} onPress={onCancel} variant="ghost" />
          </Box>
        </Tappable>
      </Tappable>
    </Sheet>
  );
}
