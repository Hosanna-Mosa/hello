/**
 * The brand mark: two overlapping circles, coral over peach.
 *
 * Deliberately wordless. "Hello" is a placeholder name (A1) and must not appear
 * in user-facing copy, so the mark carries the brand alone and a rename touches
 * nothing here.
 *
 * Drawn rather than shipped as an asset: two circles at any size stay crisp and
 * cost nothing, and the colours follow the theme.
 */

import { Box } from "@/components/common/atoms/Box";
import { useTheme } from "@/components/common/hooks/useTheme";

export type LogoProps = {
  /** Diameter of each circle. Defaults to 28. */
  size?: number;
};

/** The peach half. Not a semantic token — it exists only in the mark. */
const PEACH = "#F7C59F";

export function Logo({ size = 28 }: LogoProps) {
  const theme = useTheme();
  const overlap = size * 0.42;

  return (
    <Box
      accessible
      accessibilityRole="image"
      accessibilityLabel="App logo"
      style={{ flexDirection: "row", width: size * 2 - overlap, height: size }}
    >
      <Box
        style={{
          width: size,
          height: size,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.accent,
        }}
      />
      <Box
        style={{
          width: size,
          height: size,
          borderRadius: theme.radius.pill,
          backgroundColor: PEACH,
          marginLeft: -overlap,
          opacity: 0.9,
        }}
      />
    </Box>
  );
}
