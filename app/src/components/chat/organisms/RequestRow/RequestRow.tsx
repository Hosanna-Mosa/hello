/**
 * A pending message request: someone liked you and wrote something.
 *
 * Not a `ListRow`. A request is a decision, and the note is the thing being
 * decided on — it gets up to three lines and the full row width, with the two
 * answers underneath rather than crammed into a trailing slot.
 *
 * Decline is `ghost`, not `destructive`. It is silent and reversible in spirit
 * (A18: the sender is never told), so dressing it in red would overstate it.
 */

import { Avatar, type AvatarSource } from "@/components/common/atoms/Avatar";
import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Label } from "@/components/common/atoms/Label";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { Button } from "@/components/common/molecules/Button";
import { formatRelativeTime } from "@/components/common/utils/formatRelativeTime";
import { copy } from "@/copy";

export type RequestRowProps = {
  name: string;
  /** The chosen preset avatar. Falls back to the initial when absent. */
  source?: AvatarSource;
  age: number;
  note: string;
  /** Epoch milliseconds. */
  createdAt: number;
  onAccept: () => void;
  onDecline: () => void;
  /** Opens the sender's profile. */
  onPress: () => void;
  busy?: boolean;
};

export function RequestRow({
  name,
  source,
  age,
  note,
  createdAt,
  onAccept,
  onDecline,
  onPress,
  busy = false,
}: RequestRowProps) {
  const theme = useTheme();

  return (
    <Box
      style={{
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.color.surface,
        borderWidth: 1,
        borderColor: theme.color.border,
      }}
    >
      <Tappable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${age}. View profile.`}
        style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}
      >
        <Avatar source={source} name={name} size="md" />

        <Box style={{ flex: 1, gap: theme.spacing.xxs }}>
          <Label numberOfLines={1}>{`${name}, ${age}`}</Label>
          <Caption color="textTertiary">{formatRelativeTime(createdAt)}</Caption>
        </Box>
      </Tappable>

      {/*
        The note is quoted rather than shown as plain text: it is their words
        inside your screen, and the wash makes that obvious at a glance.
      */}
      <Box
        style={{
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          backgroundColor: theme.color.surfaceSunken,
        }}
      >
        <Body numberOfLines={3}>{note}</Body>
      </Box>

      <Box style={{ flexDirection: "row", gap: theme.spacing.sm }}>
        <Box style={{ flex: 1 }}>
          <Button label={copy.chat.decline} onPress={onDecline} variant="ghost" disabled={busy} />
        </Box>
        <Box style={{ flex: 1 }}>
          <Button label={copy.chat.accept} onPress={onAccept} loading={busy} />
        </Box>
      </Box>
    </Box>
  );
}
