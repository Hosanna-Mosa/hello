/**
 * A hairline.
 *
 * `StyleSheet.hairlineWidth` rather than 1, so it stays one physical pixel on
 * every screen density instead of thickening on 3x displays.
 */

import { StyleSheet } from "react-native";

import { Box } from "@/components/common/atoms/Box";
import { useTheme } from "@/components/common/hooks/useTheme";

export type DividerProps = {
  /** Indent from the left, to align under a row's text rather than its avatar. */
  inset?: number;
};

export function Divider({ inset = 0 }: DividerProps) {
  const theme = useTheme();

  return (
    <Box
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.color.divider,
        marginLeft: inset,
      }}
    />
  );
}
