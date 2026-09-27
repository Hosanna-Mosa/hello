/**
 * One row of the filters screen: icon, label, current value.
 *
 * Three shapes, all the same row so the column of icons stays aligned:
 * - a slider underneath (`below`)
 * - a chevron that opens a sub-screen (`onPress`)
 * - a trailing control such as a toggle (`trailing`)
 *
 * The value line always says what the filter is currently set to, so the screen
 * can be read without touching anything.
 */

import type { ReactNode } from "react";

import { Body } from "@/components/common/atoms/Body";
import { Caption } from "@/components/common/atoms/Caption";
import { Box } from "@/components/common/atoms/Box";
import { Icon, type IconName } from "@/components/common/atoms/Icon";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";

export type FilterRowProps = {
  icon: IconName;
  label: string;
  /** What it is set to right now. */
  value?: string;
  /** Makes the row a link to a sub-screen and draws a chevron. */
  onPress?: () => void;
  /** A control pinned to the right, such as a toggle. */
  trailing?: ReactNode;
  /** Full-width content under the label — the sliders. */
  below?: ReactNode;
  /**
   * Premium-only on the free tier: draws a lock and a "Premium" pill, and
   * `onPress` goes to the paywall instead of the filter.
   *
   * The row stays visible rather than being hidden, so the free tier can see
   * what it is missing. A filter that only exists once you pay for it is one
   * nobody ever discovers.
   */
  locked?: boolean;
};

export function FilterRow({
  icon,
  label,
  value,
  onPress,
  trailing,
  below,
  locked = false,
}: FilterRowProps) {
  const theme = useTheme();

  const content = (
    <Box
      style={{
        flexDirection: "row",
        gap: theme.spacing.lg,
        paddingVertical: theme.spacing.lg,
        opacity: locked ? 0.65 : 1,
      }}
    >
      <Box style={{ paddingTop: theme.spacing.xxs }}>
        <Icon name={icon} size={24} color="textPrimary" />
      </Box>

      <Box style={{ flex: 1, gap: theme.spacing.xxs }}>
        <Box style={{ flexDirection: "row", alignItems: "center" }}>
          <Box style={{ flex: 1 }}>
            <Body strong>{label}</Body>
            {value ? <Body color="textSecondary">{value}</Body> : null}
          </Box>

          {/* The lock replaces the row's own control while it is gated. */}
          {locked ? (
            <Box
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.xs,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xxs,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.color.accentMuted,
              }}
            >
              <Icon name={{ ios: "lock.fill", android: "lock" }} size={12} color="accent" />
              <Caption color="accent">{copy.premium.lockedFilter}</Caption>
            </Box>
          ) : (
            trailing
          )}

          {onPress && !trailing && !locked ? (
            <Icon
              name={{ ios: "chevron.right", android: "chevron_right" }}
              size={18}
              color="textTertiary"
            />
          ) : null}
        </Box>

        {below ? <Box style={{ marginTop: theme.spacing.md }}>{below}</Box> : null}
      </Box>
    </Box>
  );

  // A locked row is always tappable — that tap is what opens the paywall.
  if (!onPress) return content;

  return (
    <Tappable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}, ${value ?? ""}`}>
      {content}
    </Tappable>
  );
}
