/**
 * The message field and its send button.
 *
 * Grows to four lines and then scrolls, so a long message is writable without
 * the field eating the conversation above it.
 *
 * `blurOnSubmit={false}` with `returnKeyType="send"` keeps the keyboard up
 * between messages — closing it after every send makes a conversation feel like
 * a form. Send stays mounted and disabled rather than hidden, so the layout
 * does not shift under the thumb as the field empties.
 */

import { BareInput } from "@/components/common/atoms/BareInput";
import { Box } from "@/components/common/atoms/Box";
import { Icon } from "@/components/common/atoms/Icon";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";

export type ChatComposerProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  /** Set when the pair is no longer matched — the field goes away entirely. */
  disabled?: boolean;
};

export function ChatComposer({ value, onChangeText, onSend, disabled = false }: ChatComposerProps) {
  const theme = useTheme();
  const canSend = value.trim().length > 0 && !disabled;

  function submit() {
    if (canSend) onSend();
  }

  return (
    <Box
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.color.divider,
        backgroundColor: theme.color.background,
      }}
    >
      <Box
        style={{
          flex: 1,
          justifyContent: "center",
          minHeight: 44,
          maxHeight: 120,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.radius.xl,
          backgroundColor: theme.color.surface,
          borderWidth: 1,
          borderColor: theme.color.border,
        }}
      >
        <BareInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={submit}
          editable={!disabled}
          placeholder={copy.chat.composerPlaceholder}
          accessibilityLabel={copy.chat.composerPlaceholder}
          multiline
          // Android's EditText brings ~19dp of its own vertical padding, which
          // pushed the field to 61dp against a 44dp send button — the button
          // then bottom-aligned to a much taller box and read as sitting low.
          // It also meant `maxHeight: 120` capped the field at about two lines
          // rather than the four this composer is meant to grow to.
          style={{ padding: 0 }}
          blurOnSubmit={false}
          returnKeyType="send"
          maxLength={1000}
        />
      </Box>

      <Tappable
        onPress={submit}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send"
        accessibilityState={{ disabled: !canSend }}
        style={{
          width: 44,
          height: 44,
          borderRadius: theme.radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: canSend ? theme.color.accent : theme.color.surfaceSunken,
        }}
      >
        <Icon
          // A right arrow: the message travels outward, not upward.
          name={{ ios: "arrow.right", android: "arrow_forward" }}
          size={20}
          color={canSend ? "onAccent" : "textTertiary"}
        />
      </Tappable>
    </Box>
  );
}
