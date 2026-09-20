/**
 * Two or more mutually exclusive views of the same screen.
 *
 * Chat's **Messages | Requests** is the first use. This is a filter over one
 * surface, not navigation: both segments belong to the Chat tab, and switching
 * must not push a route or the hardware back button would start unwinding
 * segment changes instead of leaving the tab.
 *
 * A segment can carry a count. Requests needs one — three people waiting on an
 * answer is the whole reason to look at the segment at all.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Label } from "@/components/common/atoms/Label";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export type Segment<T extends string> = {
  value: T;
  label: string;
  /** Omit or pass 0 for no badge. */
  count?: number;
};

export type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <Box
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        padding: theme.spacing.xxs,
        gap: theme.spacing.xxs,
        borderRadius: theme.radius.md,
        backgroundColor: theme.color.surfaceSunken,
      }}
    >
      {segments.map((segment) => {
        const selected = segment.value === value;
        const count = segment.count ?? 0;

        return (
          <Tappable
            key={segment.value}
            onPress={() => onChange(segment.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={
              count > 0 ? `${segment.label}, ${count} pending` : segment.label
            }
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.xs,
              minHeight: 40,
              borderRadius: theme.radius.sm,
              backgroundColor: selected ? theme.color.surface : "transparent",
              ...(selected ? theme.shadow.sm : theme.shadow.none),
            }}
          >
            <Label color={selected ? "textPrimary" : "textSecondary"}>{segment.label}</Label>

            {count > 0 ? (
              <Box
                style={{
                  minWidth: 20,
                  height: 20,
                  paddingHorizontal: theme.spacing.xs,
                  borderRadius: theme.radius.pill,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: selected ? theme.color.accent : theme.color.borderStrong,
                }}
              >
                <Caption color={selected ? "onAccent" : "textInverse"}>
                  {count > 99 ? "99+" : String(count)}
                </Caption>
              </Box>
            ) : null}
          </Tappable>
        );
      })}
    </Box>
  );
}
