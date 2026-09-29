/**
 * The microphone: press and HOLD to record, release to send, slide left to
 * cancel — WhatsApp's gesture, because it is the one people already know.
 *
 * A pan with no minimum distance, not a long-press: recording has to start the
 * moment the finger lands, and the same gesture has to keep tracking the slide.
 * Callbacks run as worklets and cross to JS with `scheduleOnRN` (AGENTS.md).
 */

import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";

import { Box } from "@/components/common/atoms/Box";
import { Icon } from "@/components/common/atoms/Icon";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";

/** How far left the finger must travel before releasing cancels. */
export const CANCEL_SLIDE_PX = 90;

export type RecordButtonProps = {
  recording: boolean;
  disabled?: boolean;
  onPressIn: () => void;
  /** `cancelled` when released past the cancel threshold (or interrupted). */
  onRelease: (cancelled: boolean) => void;
  /** Horizontal travel so far — negative is left. */
  onSlide: (dx: number) => void;
};

export function RecordButton({
  recording,
  disabled = false,
  onPressIn,
  onRelease,
  onSlide,
}: RecordButtonProps) {
  const theme = useTheme();

  const hold = Gesture.Pan()
    .enabled(!disabled)
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .onBegin(() => {
      scheduleOnRN(onPressIn);
    })
    .onUpdate((event) => {
      scheduleOnRN(onSlide, event.translationX);
    })
    .onFinalize((event, success) => {
      // `success` is false when the system took the touch away (an incoming
      // call, a system gesture) — treat that as a cancel, never a send.
      const cancelled = !success || event.translationX <= -CANCEL_SLIDE_PX;
      scheduleOnRN(onRelease, cancelled);
    });

  return (
    <GestureDetector gesture={hold}>
      <Box
        accessible
        accessibilityRole="button"
        accessibilityLabel={copy.chat.voiceRecord}
        accessibilityState={{ disabled, busy: recording }}
        style={{
          width: recording ? 56 : 44,
          height: recording ? 56 : 44,
          // Grows under the thumb while recording, so it is obvious it is live.
          marginTop: recording ? -12 : 0,
          borderRadius: theme.radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: disabled ? theme.color.surfaceSunken : theme.color.accent,
        }}
      >
        <Icon
          name={{ ios: "mic.fill", android: "mic" }}
          size={recording ? 26 : 22}
          color={disabled ? "textTertiary" : "onAccent"}
        />
      </Box>
    </GestureDetector>
  );
}
