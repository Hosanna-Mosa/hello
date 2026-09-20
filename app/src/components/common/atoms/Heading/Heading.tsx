/**
 * Screen and section headings.
 *
 * Takes a type *role*, never a size. `display` is the one-per-screen question
 * on a wizard step; `heading` and `title` step down from there.
 *
 * M2: never nest a text wrapper inside another text wrapper. A bold word
 * inside a sentence uses a plain `Text`, not a nested `Heading`.
 */

import { Text, type TextProps } from "react-native";

import { useTheme } from "@/components/common/hooks/useTheme";
import { type ColorTokens, typography } from "@/theme";

export type HeadingProps = TextProps & {
  /** Which step of the scale. Defaults to `heading`. */
  level?: "display" | "heading" | "title";
  /** A colour role from the theme. Defaults to `textPrimary`. */
  color?: keyof ColorTokens;
};

export function Heading({
  level = "heading",
  color = "textPrimary",
  style,
  ...rest
}: HeadingProps) {
  const theme = useTheme();

  return (
    <Text
      {...rest}
      style={[typography[level], { color: theme.color[color] }, style]}
    />
  );
}
