/**
 * What replaces the text field while a voice message is being recorded: a red
 * dot, the running time, and how to back out. When the finger has slid far
 * enough to cancel, the hint says so — releasing then throws the clip away.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Label } from "@/components/common/atoms/Label";
import { formatCallDuration } from "@/components/common/hooks/useCallTimer";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";

export type RecordingIndicatorProps = {
  seconds: number;
  /** The finger is past the cancel threshold. */
  cancelArmed: boolean;
};

export function RecordingIndicator({ seconds, cancelArmed }: RecordingIndicatorProps) {
  const theme = useTheme();

  return (
    <Box
      accessibilityLiveRegion="polite"
      style={{
        flex: 1,
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.xl,
        backgroundColor: theme.color.surface,
        borderWidth: 1,
        borderColor: cancelArmed ? theme.color.danger : theme.color.border,
      }}
    >
      <Box
        style={{
          width: 10,
          height: 10,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.danger,
        }}
      />
      <Label>{formatCallDuration(seconds)}</Label>
      <Caption color={cancelArmed ? "danger" : "textSecondary"} style={{ flex: 1, textAlign: "right" }}>
        {cancelArmed ? copy.chat.voiceReleaseToCancel : copy.chat.voiceSlideToCancel}
      </Caption>
    </Box>
  );
}
