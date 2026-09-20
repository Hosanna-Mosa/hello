/**
 * The notification permission primer (A4).
 *
 * Shown once, after the first match — the one moment where the value of being
 * notified is obvious, because someone is now waiting on a reply. Asking at
 * launch is how people learn to say no.
 *
 * It does not request the OS permission. `expo-notifications` is a native
 * module and is not on the approved dependency list; like calls, premium and
 * ads, this is the UI with the integration left as future work. Accepting
 * records that the primer has been answered, which is what stops it asking
 * twice — and asking twice is the actual failure mode a primer exists to
 * prevent.
 */

import { Modal } from "react-native";

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Heading } from "@/components/common/atoms/Heading";
import { Icon } from "@/components/common/atoms/Icon";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { Button } from "@/components/common/molecules/Button";
import { copy } from "@/copy";

export type NotificationPrimerProps = {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function NotificationPrimer({ visible, onAccept, onDecline }: NotificationPrimerProps) {
  const theme = useTheme();

  return (
    // Android hardware back declines, never accepts.
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <Tappable
        onPress={onDecline}
        accessibilityLabel={copy.notifications.primerDecline}
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
            alignItems: "center",
            gap: theme.spacing.md,
            padding: theme.spacing.xl,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.color.surfaceElevated,
            ...theme.shadow.lg,
          }}
        >
          <Box
            style={{
              width: 72,
              height: 72,
              borderRadius: theme.radius.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.color.accentMuted,
            }}
          >
            <Icon
              name={{ ios: "bell.badge.fill", android: "notifications_active" }}
              size={34}
              color="accent"
            />
          </Box>

          <Heading level="title" style={{ textAlign: "center" }}>
            {copy.notifications.primerTitle}
          </Heading>

          <Body color="textSecondary" style={{ textAlign: "center" }}>
            {copy.notifications.primerBody}
          </Body>

          <Box style={{ width: "100%", gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            <Button label={copy.notifications.primerAccept} onPress={onAccept} />
            <Button
              label={copy.notifications.primerDecline}
              onPress={onDecline}
              variant="ghost"
            />
          </Box>

          <Caption style={{ textAlign: "center" }}>{copy.notifications.primerHint}</Caption>
        </Tappable>
      </Tappable>
    </Modal>
  );
}
