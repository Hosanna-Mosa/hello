/**
 * Mute · Speaker · End.
 *
 * All three are mocked (A17): nothing is recorded, no microphone permission is
 * requested, and there is no audio route to switch. Mute and speaker toggle
 * their own visual state and nothing else — which is honest for a demo and is
 * exactly the surface a real integration would later drive.
 *
 * End is red and last, and sits at the same 64pt size as the other two. It is
 * the one control people reach for without looking.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Icon, type IconName } from "@/components/common/atoms/Icon";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";
import { dark } from "@/theme";

const SIZE = 64;

export type CallControlsProps = {
  muted: boolean;
  speaker: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onEnd: () => void;
  /** Mute and speaker are inert until the call connects. */
  disabled?: boolean;
};

export function CallControls({
  muted,
  speaker,
  onToggleMute,
  onToggleSpeaker,
  onEnd,
  disabled = false,
}: CallControlsProps) {
  const theme = useTheme();

  function control(
    label: string,
    icon: IconName,
    onPress: () => void,
    options: { active?: boolean; danger?: boolean; inert?: boolean } = {},
  ) {
    const { active = false, danger = false, inert = false } = options;

    return (
      <Box style={{ alignItems: "center", gap: theme.spacing.sm }}>
        <Tappable
          onPress={onPress}
          disabled={inert}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected: active, disabled: inert }}
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: theme.radius.pill,
            alignItems: "center",
            justifyContent: "center",
            // The call screen is always dark, so these read against `dark`
            // tokens rather than the active theme (see CallShell).
            backgroundColor: danger
              ? theme.color.danger
              : active
                ? dark.color.textPrimary
                : dark.color.surfaceSunken,
            opacity: inert ? 0.4 : 1,
          }}
        >
          <Icon
            name={icon}
            size={26}
            color={danger ? "onDanger" : active ? "textInverse" : "textPrimary"}
          />
        </Tappable>

        <Caption style={{ color: dark.color.textSecondary }}>{label}</Caption>
      </Box>
    );
  }

  return (
    <Box style={{ flexDirection: "row", gap: theme.spacing.xl }}>
      {control(
        copy.calls.mute,
        muted
          ? { ios: "mic.slash.fill", android: "mic_off" }
          : { ios: "mic.fill", android: "mic" },
        onToggleMute,
        { active: muted, inert: disabled },
      )}
      {control(
        copy.calls.speaker,
        speaker
          ? { ios: "speaker.wave.2.fill", android: "volume_up" }
          : { ios: "speaker.fill", android: "volume_down" },
        onToggleSpeaker,
        { active: speaker, inert: disabled },
      )}
      {control(
        copy.calls.end,
        { ios: "phone.down.fill", android: "call_end" },
        onEnd,
        { danger: true },
      )}
    </Box>
  );
}
