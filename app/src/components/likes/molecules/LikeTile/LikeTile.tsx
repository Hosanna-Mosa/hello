/**
 * One tile in the "who liked you" grid.
 *
 * `locked` is the whole point of this screen: without premium the tile still
 * occupies its slot and still counts, but the avatar becomes a padlock and the
 * name becomes a grey bar the width of a name. Showing a blurred real name
 * would leak it to anyone who screenshots and sharpens, so nothing identifying
 * is rendered at all.
 *
 * Takes plain props rather than a `Like` and a `PublicProfile`, so the grid can
 * be rendered in a test without the service layer.
 */

import { Avatar, type AvatarSource } from "@/components/common/atoms/Avatar";
import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Icon } from "@/components/common/atoms/Icon";
import { Label } from "@/components/common/atoms/Label";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export type LikeTileProps = {
  name: string;
  /** The chosen preset avatar. Falls back to the initial when absent. */
  source?: AvatarSource;
  age: number;
  /** Hide who this is, and route the tap to the paywall instead. */
  locked: boolean;
  /** They attached a note. Only ever surfaced once unlocked. */
  hasNote?: boolean;
  onPress: () => void;
  /** What a locked tile announces, since the name must not be read out. */
  lockedLabel: string;
  /** Shown under an unlocked tile that carries a note. */
  noteLabel: string;
};

export function LikeTile({
  name,
  source,
  age,
  locked,
  hasNote = false,
  onPress,
  lockedLabel,
  noteLabel,
}: LikeTileProps) {
  const theme = useTheme();

  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={locked ? lockedLabel : `${name}, ${age}`}
      style={{
        flex: 1,
        alignItems: "center",
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.color.surface,
        borderWidth: 1,
        borderColor: theme.color.border,
      }}
    >
      {locked ? (
        <Box
          style={{
            width: 64,
            height: 64,
            borderRadius: theme.radius.pill,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.color.surfaceSunken,
          }}
        >
          <Icon name={{ ios: "lock.fill", android: "lock" }} size={24} color="textTertiary" />
        </Box>
      ) : (
        <Avatar source={source} name={name} size="lg" />
      )}

      {locked ? (
        // A grey bar the width of a name, not the name itself.
        <Box
          style={{
            width: 84,
            height: 12,
            borderRadius: theme.radius.xs,
            backgroundColor: theme.color.surfaceSunken,
          }}
        />
      ) : (
        <Label>{`${name}, ${age}`}</Label>
      )}

      {hasNote && !locked ? <Caption numberOfLines={1}>{noteLabel}</Caption> : null}
    </Tappable>
  );
}
