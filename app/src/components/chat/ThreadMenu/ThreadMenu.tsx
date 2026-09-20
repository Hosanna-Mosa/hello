/**
 * The thread's overflow menu: mute, profile, report, block, unmatch.
 *
 * A bottom sheet of plain rows rather than a platform action sheet, because
 * `ActionSheetIOS` has no Android counterpart and the two would diverge exactly
 * where the destructive items are.
 *
 * Order is deliberate. The reversible things are at the top, the two that end
 * the relationship are at the bottom behind a divider, and neither fires
 * directly — both hand back to a `ConfirmDialog` on the screen above.
 */

import { Modal } from "react-native";

import { Box } from "@/components/common/atoms/Box";
import { Divider } from "@/components/common/atoms/Divider";
import { Icon, type IconName } from "@/components/common/atoms/Icon";
import { Label } from "@/components/common/atoms/Label";
import { SafeArea } from "@/components/common/atoms/SafeArea";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";

export type ThreadMenuProps = {
  visible: boolean;
  muted: boolean;
  onDismiss: () => void;
  onViewProfile: () => void;
  onToggleMute: () => void;
  onReport: () => void;
  onBlock: () => void;
  onUnmatch: () => void;
  /**
   * Dev-only: pretend the other person unmatched you.
   *
   * There is no second device and no backend, so the read-only thread state has
   * no other way to be reached — exactly like the incoming-call trigger on the
   * Chat header. Omitted in a release build and the row disappears with it.
   */
  onSimulateUnmatch?: () => void;
};

export function ThreadMenu({
  visible,
  muted,
  onDismiss,
  onViewProfile,
  onToggleMute,
  onReport,
  onBlock,
  onUnmatch,
  onSimulateUnmatch,
}: ThreadMenuProps) {
  const theme = useTheme();

  function item(label: string, icon: IconName, onPress: () => void, destructive = false) {
    return (
      <Tappable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
          minHeight: 52,
          paddingHorizontal: theme.spacing.xl,
        }}
      >
        <Icon name={icon} size={20} color={destructive ? "danger" : "textPrimary"} />
        <Label color={destructive ? "danger" : "textPrimary"}>{label}</Label>
      </Tappable>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Tappable
        onPress={onDismiss}
        accessibilityLabel="Dismiss"
        style={{ flex: 1, backgroundColor: theme.color.overlay, justifyContent: "flex-end" }}
      >
        <Tappable
          onPress={() => {}}
          accessibilityViewIsModal
          style={{
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            backgroundColor: theme.color.surfaceElevated,
          }}
        >
          <SafeArea edges={["bottom"]}>
            {/* The grabber: the only affordance saying this can be swiped away. */}
            <Box
              style={{
                alignSelf: "center",
                width: 36,
                height: 4,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.color.borderStrong,
                marginVertical: theme.spacing.md,
              }}
            />

            {/* Dev row first: at the bottom a sixth item lands under the inset. */}
            {onSimulateUnmatch
              ? item(
                  "Simulate: they unmatched you",
                  { ios: "hammer", android: "build" },
                  onSimulateUnmatch,
                )
              : null}

            {item("View profile", { ios: "person", android: "person" }, onViewProfile)}
            {item(
              muted ? copy.chat.unmute : copy.chat.mute,
              muted
                ? { ios: "bell", android: "notifications" }
                : { ios: "bell.slash", android: "notifications_off" },
              onToggleMute,
            )}

            {/* The atom draws the hairline; the margin is this sheet's own spacing. */}
            <Box style={{ marginVertical: theme.spacing.sm }}>
              <Divider />
            </Box>

            {item(
              copy.safety.reportTitle,
              { ios: "flag", android: "flag" },
              onReport,
              true,
            )}
            {item(
              copy.safety.blockConfirm,
              { ios: "hand.raised", android: "block" },
              onBlock,
              true,
            )}
            {item(
              copy.chat.unmatchConfirm,
              { ios: "person.badge.minus", android: "person_remove" },
              onUnmatch,
              true,
            )}
          </SafeArea>
        </Tappable>
      </Tappable>
    </Modal>
  );
}
