/**
 * What replaces the message field while a voice message is recording:
 * a red dot, "Recording… please speak", the running time — and a bin to throw
 * the recording away instead of sending it.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Icon } from "@/components/common/atoms/Icon";
import { Label } from "@/components/common/atoms/Label";
import { Tappable } from "@/components/common/atoms/Tappable";
import { formatCallDuration } from "@/components/common/hooks/useCallTimer";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";

export type RecordingIndicatorProps = {
  seconds: number;
  /** Discard the recording. */
  onCancel: () => void;
};

export function RecordingIndicator({ seconds, onCancel }: RecordingIndicatorProps) {
  const theme = useTheme();

  return (
    <Box
      style={{
        flex: 1,
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
        paddingLeft: theme.spacing.xs,
        paddingRight: theme.spacing.lg,
        borderRadius: theme.radius.xl,
        backgroundColor: theme.color.surface,
        borderWidth: 1,
        borderColor: theme.color.danger,
      }}
    >
      <Tappable
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel={copy.chat.voiceCancel}
        hitSlop={8}
        style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
      >
        <Icon name={{ ios: "trash", android: "delete" }} size={20} color="textSecondary" />
      </Tappable>

      <Box
        style={{
          width: 10,
          height: 10,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.danger,
        }}
      />

      <Box accessibilityLiveRegion="polite" style={{ flex: 1 }}>
        <Label numberOfLines={1}>{copy.chat.voiceRecording}</Label>
        <Caption numberOfLines={1}>{copy.chat.voiceTapToSend}</Caption>
      </Box>

      <Label>{formatCallDuration(seconds)}</Label>
    </Box>
  );
}
