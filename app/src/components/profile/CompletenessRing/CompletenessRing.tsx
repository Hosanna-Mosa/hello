/**
 * The avatar, wearing its completeness.
 *
 * Segments rather than a swept arc. A continuous arc in React Native means
 * either `react-native-svg` — not on the approved dependency list, and not
 * worth adding for one ring — or two counter-rotated half-discs clipped by
 * their parents, which is fiddly, easy to get subtly wrong, and impossible to
 * check without looking at it on a device.
 *
 * Twelve segments is also honest about the underlying number: completeness is
 * weighted over six fields, so it only ever takes a dozen or so distinct
 * values. A smooth arc would imply a precision that is not there.
 *
 * At 100% every segment is filled, which is the point — the incomplete state is
 * the one that should look unfinished.
 */

import type { ReactNode } from "react";

import { Box } from "@/components/common/atoms/Box";
import { useTheme } from "@/components/common/hooks/useTheme";

const SEGMENTS = 12;

export type CompletenessRingProps = {
  /** 0–100. */
  percent: number;
  /** Outer diameter. */
  size?: number;
  children: ReactNode;
};

export function CompletenessRing({ percent, size = 148, children }: CompletenessRingProps) {
  const theme = useTheme();

  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * SEGMENTS);

  const segmentLength = 10;
  const segmentWidth = 4;
  // Distance from centre to the middle of a segment.
  const radius = size / 2 - segmentLength / 2;

  return (
    <Box
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      {Array.from({ length: SEGMENTS }, (_, index) => {
        // Start at 12 o'clock and go clockwise.
        const angle = (index / SEGMENTS) * 2 * Math.PI - Math.PI / 2;

        return (
          <Box
            key={index}
            style={{
              position: "absolute",
              width: segmentLength,
              height: segmentWidth,
              borderRadius: theme.radius.pill,
              backgroundColor: index < filled ? theme.color.accent : theme.color.border,
              transform: [
                { translateX: Math.cos(angle) * radius },
                { translateY: Math.sin(angle) * radius },
                // Rotate after translating so each segment lies along the arc.
                { rotate: `${(index / SEGMENTS) * 360}deg` },
              ],
            }}
          />
        );
      })}

      {children}
    </Box>
  );
}
