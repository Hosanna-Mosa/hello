/**
 * The microphone: TAP to start recording, TAP AGAIN to stop and send.
 *
 * A plain tap rather than press-and-hold: nothing to keep a finger on, so a
 * long message is as easy as a short one, and the recording UI has room to say
 * what is happening. While recording the button turns red — the one control
 * the eye goes back to when it is time to send.
 */

import { Icon } from "@/components/common/atoms/Icon";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";

export type RecordButtonProps = {
  recording: boolean;
  disabled?: boolean;
  /** Start when idle; stop and send when recording. */
  onPress: () => void;
};

export function RecordButton({ recording, disabled = false, onPress }: RecordButtonProps) {
  const theme = useTheme();

  return (
    <Tappable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={recording ? copy.chat.voiceStopAndSend : copy.chat.voiceRecord}
      accessibilityState={{ disabled, busy: recording }}
      hitSlop={6}
      style={{
        width: 44,
        height: 44,
        borderRadius: theme.radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: disabled
          ? theme.color.surfaceSunken
          : recording
            ? theme.color.danger
            : theme.color.accent,
      }}
    >
      <Icon
        name={{ ios: "mic.fill", android: "mic" }}
        size={22}
        color={disabled ? "textTertiary" : recording ? "onDanger" : "onAccent"}
      />
    </Tappable>
  );
}
