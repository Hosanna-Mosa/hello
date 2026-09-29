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
 *
 * VOICE. Given `voice`, an empty field shows the microphone where Send was —
 * the same slot, so nothing moves. Tap it to record: the field becomes
 * "Recording… please speak" with a timer and a bin; tap the mic again to send.
 */

import { BareInput } from "@/components/common/atoms/BareInput";
import { Box } from "@/components/common/atoms/Box";
import { Icon } from "@/components/common/atoms/Icon";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useBottomInset } from "@/components/common/hooks/useBottomInset";
import { useTheme } from "@/components/common/hooks/useTheme";
import { RecordButton } from "@/components/thread/molecules/RecordButton";
import { RecordingIndicator } from "@/components/thread/molecules/RecordingIndicator";
import { copy } from "@/copy";

export type ComposerVoice = {
  recording: boolean;
  seconds: number;
  /** No microphone right now — during a voice call, for one. */
  disabled?: boolean;
  /** Start recording, or — while recording — stop and send. */
  onToggle: () => void;
  /** Discard the recording in progress. */
  onCancel: () => void;
};

export type ChatComposerProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  /** Set when the pair is no longer matched — the field goes away entirely. */
  disabled?: boolean;
  /** Voice messages. Omitted, the composer is text-only. */
  voice?: ComposerVoice;
};

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  disabled = false,
  voice,
}: ChatComposerProps) {
  const theme = useTheme();
  // Clears the gesture bar when the keyboard is down, nothing when it is up.
  const bottomInset = useBottomInset();
  const canSend = value.trim().length > 0 && !disabled;
  const recording = voice?.recording ?? false;
  // The mic takes Send's slot whenever there is nothing typed to send.
  const showMic = voice !== undefined && !disabled && (recording || value.trim().length === 0);

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
        paddingTop: theme.spacing.md,
        // Padded here rather than around the composer so the bar's own
        // background reaches the screen edge instead of leaving a strip.
        paddingBottom: theme.spacing.md + bottomInset,
        borderTopWidth: 1,
        borderTopColor: theme.color.divider,
        backgroundColor: theme.color.background,
      }}
    >
      {recording && voice ? (
        <RecordingIndicator seconds={voice.seconds} onCancel={voice.onCancel} />
      ) : (
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
      )}

      {showMic && voice ? (
        <RecordButton recording={recording} disabled={voice.disabled} onPress={voice.onToggle} />
      ) : (
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
      )}
    </Box>
  );
}
