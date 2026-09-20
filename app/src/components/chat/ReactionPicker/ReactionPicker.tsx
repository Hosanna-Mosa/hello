/**
 * Six emoji, on a long press.
 *
 * A fixed set rather than a full picker: a keyboard emoji sheet is a different
 * interaction on each platform, and the entire point of a reaction is that it
 * costs one tap. Six is the most that fits a row at a 44pt target.
 *
 * None of them is a heart. Reactions are one of the easiest places for romantic
 * framing to slip back in (PLAN §1), and "😄 👍 🎉 🙌 😮 🙏" covers agreement,
 * surprise and thanks without it.
 *
 * Tapping the emoji already on the message removes it — `toggleReaction` in the
 * service is a toggle, and the UI must not pretend otherwise.
 */

import { Modal } from "react-native";

import { Heading } from "@/components/common/atoms/Heading";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export const REACTIONS = ["😄", "👍", "🎉", "🙌", "😮", "🙏"] as const;

export type ReactionPickerProps = {
  visible: boolean;
  /** The emoji already applied by the current user, if any. */
  selected?: string;
  onSelect: (emoji: string) => void;
  onDismiss: () => void;
};

export function ReactionPicker({
  visible,
  selected,
  onSelect,
  onDismiss,
}: ReactionPickerProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Tappable
        onPress={onDismiss}
        accessibilityLabel="Dismiss"
        style={{
          flex: 1,
          backgroundColor: theme.color.overlay,
          alignItems: "center",
          justifyContent: "center",
          padding: theme.spacing.xl,
        }}
      >
        {/* Swallow taps inside the rail so it does not dismiss itself. */}
        <Tappable
          onPress={() => {}}
          accessibilityViewIsModal
          style={{
            flexDirection: "row",
            gap: theme.spacing.xs,
            padding: theme.spacing.sm,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.color.surfaceElevated,
            ...theme.shadow.lg,
          }}
        >
          {REACTIONS.map((emoji) => (
            <Tappable
              key={emoji}
              onPress={() => onSelect(emoji)}
              accessibilityRole="button"
              accessibilityLabel={`React with ${emoji}`}
              accessibilityState={{ selected: emoji === selected }}
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: theme.radius.pill,
                backgroundColor:
                  emoji === selected ? theme.color.accentMuted : "transparent",
              }}
            >
              <Heading level="title">{emoji}</Heading>
            </Tappable>
          ))}
        </Tappable>
      </Tappable>
    </Modal>
  );
}
