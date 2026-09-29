/**
 * One message.
 *
 * Sent messages are the accent colour and hug the right; received ones sit on a
 * neutral surface at the left. The asymmetry is the whole navigation system of
 * a thread — you read who said what from the edge, never from a name label.
 *
 * Long-press opens the reaction picker. There is no other gesture on a bubble:
 * a swipe would fight the list's scroll, and a double-tap shortcut hides the
 * feature from anyone who has not been told about it.
 */

import type { ReactNode } from "react";

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import type { Reaction } from "@/services/types";

export type ChatBubbleProps = {
  body: string;
  /** True when the current user sent it. */
  mine: boolean;
  /** Already formatted — "14:32". */
  timestamp: string;
  reactions?: Reaction[];
  onLongPress?: () => void;
  /** Dims the bubble while the send is in flight. */
  pending?: boolean;
  /** Shown INSTEAD of `body` — a voice message's player. `body` still labels it. */
  children?: ReactNode;
};

export function ChatBubble({
  body,
  mine,
  timestamp,
  reactions = [],
  onLongPress,
  pending = false,
  children,
}: ChatBubbleProps) {
  const theme = useTheme();

  return (
    <Box
      style={{
        alignItems: mine ? "flex-end" : "flex-start",
        // Room for the reaction pill to overhang the bubble's bottom edge.
        paddingBottom: reactions.length > 0 ? theme.spacing.md : 0,
      }}
    >
      <Tappable
        onLongPress={onLongPress}
        disabled={!onLongPress}
        delayLongPress={300}
        accessibilityRole="text"
        accessibilityLabel={`${mine ? "You said" : "They said"}: ${body}. ${timestamp}.`}
        accessibilityHint={onLongPress ? "Long press to react" : undefined}
        style={{
          maxWidth: "80%",
          gap: theme.spacing.xxs,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.radius.lg,
          // The corner nearest the sender squares off, the classic tail.
          borderBottomRightRadius: mine ? theme.radius.xs : theme.radius.lg,
          borderBottomLeftRadius: mine ? theme.radius.lg : theme.radius.xs,
          backgroundColor: mine ? theme.color.accent : theme.color.surface,
          borderWidth: mine ? 0 : 1,
          borderColor: theme.color.border,
          opacity: pending ? 0.6 : 1,
        }}
      >
        {children ?? <Body color={mine ? "onAccent" : "textPrimary"}>{body}</Body>}

        <Caption
          color={mine ? "onAccent" : "textTertiary"}
          style={{ alignSelf: "flex-end", opacity: mine ? 0.8 : 1 }}
        >
          {timestamp}
        </Caption>
      </Tappable>

      {reactions.length > 0 ? (
        <Box
          accessibilityLabel={`Reactions: ${reactions.map((r) => r.emoji).join(", ")}`}
          style={{
            flexDirection: "row",
            gap: theme.spacing.xxs,
            // Pulled up so it overlaps the bubble rather than floating below it.
            marginTop: -theme.spacing.sm,
            marginHorizontal: theme.spacing.sm,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xxs,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.color.surfaceElevated,
            borderWidth: 1,
            borderColor: theme.color.border,
            ...theme.shadow.sm,
          }}
        >
          {reactions.map((reaction) => (
            <Caption key={`${reaction.userId}-${reaction.emoji}`} color="textPrimary">
              {reaction.emoji}
            </Caption>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
