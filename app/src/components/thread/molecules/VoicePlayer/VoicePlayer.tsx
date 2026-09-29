/**
 * The inside of a voice message bubble: play/pause, a progress track, and the
 * time. Presentational — `useVoicePlayback` on the screen side drives it.
 *
 * Colours follow the bubble it sits in (`mine` = on the accent bubble), so it
 * reads as the message itself rather than a control pasted onto one.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Icon } from "@/components/common/atoms/Icon";
import { Tappable } from "@/components/common/atoms/Tappable";
import { formatCallDuration } from "@/components/common/hooks/useCallTimer";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";

export type VoicePlayerProps = {
  mine: boolean;
  playing: boolean;
  /** 0..1 */
  progress: number;
  seconds: number;
  onToggle: () => void;
};

const TRACK_WIDTH = 140;

export function VoicePlayer({ mine, playing, progress, seconds, onToggle }: VoicePlayerProps) {
  const theme = useTheme();
  const ink = mine ? theme.color.onAccent : theme.color.accent;

  return (
    <Box style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
      <Tappable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={playing ? copy.chat.voicePause : copy.chat.voicePlay}
        hitSlop={8}
        style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
      >
        <Icon
          name={
            playing
              ? { ios: "pause.fill", android: "pause" }
              : { ios: "play.fill", android: "play_arrow" }
          }
          size={26}
          color={mine ? "onAccent" : "accent"}
        />
      </Tappable>

      <Box style={{ gap: theme.spacing.xxs }}>
        <Box
          style={{
            width: TRACK_WIDTH,
            height: 4,
            borderRadius: theme.radius.pill,
            backgroundColor: mine ? theme.color.accentPressed : theme.color.border,
            overflow: "hidden",
          }}
        >
          <Box style={{ width: TRACK_WIDTH * progress, height: 4, backgroundColor: ink }} />
        </Box>
        <Caption color={mine ? "onAccent" : "textSecondary"}>{formatCallDuration(seconds)}</Caption>
      </Box>
    </Box>
  );
}
