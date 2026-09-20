/**
 * Field labels, chip text, segmented control items — short strings that name
 * something rather than say something.
 */

import { Text, type TextProps } from "react-native";

import { useTheme } from "@/components/common/hooks/useTheme";
import { type ColorTokens, typography } from "@/theme";

export type LabelProps = TextProps & {
  /** A colour role from the theme. Defaults to `textPrimary`. */
  color?: keyof ColorTokens;
};

export function Label({ color = "textPrimary", style, ...rest }: LabelProps) {
  const theme = useTheme();

  return (
    <Text {...rest} style={[typography.label, { color: theme.color[color] }, style]} />
  );
}
