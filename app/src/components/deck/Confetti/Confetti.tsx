/**
 * Scattered confetti behind the celebration.
 *
 * Drawn rather than animated, and without a library — a handful of small
 * rotated rectangles at fixed positions. Deterministic on purpose: a
 * celebration that looks different every time is harder to screenshot-verify,
 * and the design shows a still image anyway.
 *
 * Purely decorative, so it is hidden from screen readers.
 */

import { Box } from "@/components/common/atoms/Box";
import { useTheme } from "@/components/common/hooks/useTheme";

/** [xPercent, yPercent, rotationDeg, toneIndex] */
const PIECES: [number, number, number, number][] = [
  [8, 10, 20, 0], [18, 22, -35, 1], [28, 6, 45, 2], [40, 16, -15, 3],
  [52, 4, 30, 4], [64, 14, -40, 5], [76, 8, 25, 0], [88, 18, -20, 1],
  [6, 34, -25, 2], [22, 44, 40, 3], [34, 30, -10, 4], [46, 40, 35, 5],
  [58, 32, -30, 0], [70, 42, 15, 1], [82, 36, -45, 2], [92, 46, 20, 3],
  [12, 54, 30, 4], [30, 60, -20, 5], [68, 58, 25, 0], [86, 62, -35, 1],
];

export function Confetti() {
  const theme = useTheme();

  return (
    <Box
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", top: 0, left: 0, right: 0, height: "55%" }}
    >
      {PIECES.map(([x, y, rotation, tone], index) => (
        <Box
          key={index}
          style={{
            position: "absolute",
            left: `${x}%`,
            top: `${y}%`,
            width: 10,
            height: 18,
            borderRadius: theme.radius.xs,
            backgroundColor: theme.chipTones[tone].text,
            opacity: 0.85,
            transform: [{ rotate: `${rotation}deg` }],
          }}
        />
      ))}
    </Box>
  );
}
