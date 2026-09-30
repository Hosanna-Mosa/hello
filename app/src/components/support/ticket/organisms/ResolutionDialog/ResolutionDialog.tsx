/**
 * "Is your issue resolved?" — the question support's Resolve button asks.
 *
 * NOT `ConfirmDialog`, on purpose. That dialog resolves the hardware back
 * button and a backdrop tap to its cancel action, and here cancel would mean
 * "no, still broken" — reopening the ticket because someone brushed the screen.
 * This one has THREE outcomes: yes, no, and "not now". Back and the backdrop
 * are "not now": the question stays open, answerable from the banner in the
 * conversation, and nothing changes until the person actually chooses.
 */

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Heading } from "@/components/common/atoms/Heading";
import { Icon } from "@/components/common/atoms/Icon";
import { Sheet } from "@/components/common/atoms/Sheet";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { Button } from "@/components/common/molecules/Button";
import { copy } from "@/copy";

export type ResolutionDialogProps = {
  visible: boolean;
  /** Which answer is in flight, so its button spins and both lock. */
  busy: "accept" | "decline" | null;
  onAccept: () => void;
  onDecline: () => void;
  /** Back, or a tap outside — leaves the question unanswered. */
  onDismiss: () => void;
};

export function ResolutionDialog({ visible, busy, onAccept, onDecline, onDismiss }: ResolutionDialogProps) {
  const theme = useTheme();
  const locked = busy !== null;

  return (
    <Sheet visible={visible} animationType="fade" onRequestClose={locked ? () => {} : onDismiss}>
      <Tappable
        onPress={locked ? undefined : onDismiss}
        accessibilityLabel={copy.common.notNow}
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
            maxWidth: 360,
            gap: theme.spacing.md,
            padding: theme.spacing.xl,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.color.surfaceElevated,
            ...theme.shadow.lg,
          }}
        >
          <Box
            style={{
              width: 56,
              height: 56,
              borderRadius: theme.radius.pill,
              alignSelf: "center",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.color.secondaryMuted,
            }}
          >
            <Icon name={{ ios: "checkmark.seal", android: "task_alt" }} size={30} color="secondary" />
          </Box>

          <Heading level="title" style={{ textAlign: "center" }}>
            {copy.support.resolutionTitle}
          </Heading>
          <Body color="textSecondary" style={{ textAlign: "center" }}>
            {copy.support.resolutionBody}
          </Body>

          <Box style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            <Button
              label={copy.support.resolutionConfirm}
              onPress={onAccept}
              loading={busy === "accept"}
              disabled={locked}
            />
            <Button
              label={copy.support.resolutionDecline}
              onPress={onDecline}
              variant="secondary"
              loading={busy === "decline"}
              disabled={locked}
            />
            <Button label={copy.common.notNow} onPress={onDismiss} variant="ghost" disabled={locked} />
          </Box>
        </Tappable>
      </Tappable>
    </Sheet>
  );
}
