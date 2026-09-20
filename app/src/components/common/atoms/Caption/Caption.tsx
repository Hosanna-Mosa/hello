/**
 * Metadata: "2 km away", timestamps, character counters, helper text.
 *
 * Defaults to `textSecondary` because a caption that reads at full contrast
 * competes with the thing it is describing.
 */

import { Text, type TextProps } from "react-native";

import { useTheme } from "@/components/common/hooks/useTheme";
import { type ColorTokens, typography } from "@/theme";

export type CaptionProps = TextProps & {
  /** A colour role from the theme. Defaults to `textSecondary`. */
  color?: keyof ColorTokens;
};

export function Caption({ color = "textSecondary", style, ...rest }: CaptionProps) {
  const theme = useTheme();

  return (
    <Text {...rest} style={[typography.caption, { color: theme.color[color] }, style]} />
  );
}
